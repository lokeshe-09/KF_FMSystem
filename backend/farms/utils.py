from datetime import date, timedelta
from django.utils import timezone
from .models import CropStage, Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def generate_harvest_notifications():
    """
    Generate notifications for harvest dates that are due, overdue, or approaching
    """
    today = date.today()
    
    # Get all crop stages with expected harvest dates
    crop_stages = CropStage.objects.filter(
        expected_harvest_date__isnull=False
    ).select_related('user', 'farm')
    
    notifications_created = 0
    
    for crop in crop_stages:
        harvest_date = crop.expected_harvest_date
        days_until_harvest = (harvest_date - today).days
        
        # Check if we should create a notification for this crop
        notification_data = None
        
        if days_until_harvest < 0:  # Overdue
            # Check if we already have an overdue notification for this crop
            existing = Notification.objects.filter(
                notification_type='harvest_overdue',
                user=crop.user,
                farm=crop.farm,
                title__icontains=crop.batch_code
            ).exists()
            
            if not existing:
                notification_data = {
                    'type': 'harvest_overdue',
                    'title': f'🚨 Harvest Overdue: {crop.crop_name} ({crop.batch_code})',
                    'message': f'The harvest for {crop.crop_name} ({crop.variety}) - Batch: {crop.batch_code} was due on {harvest_date.strftime("%B %d, %Y")} and is now {abs(days_until_harvest)} day(s) overdue. Please harvest as soon as possible to avoid quality loss.',
                    'priority': 'high'
                }
                
        elif days_until_harvest == 0:  # Due today
            # Check if we already have a due notification for today
            existing = Notification.objects.filter(
                notification_type='harvest_due',
                user=crop.user,
                farm=crop.farm,
                title__icontains=crop.batch_code,
                created_at__date=today
            ).exists()
            
            if not existing:
                notification_data = {
                    'type': 'harvest_due',
                    'title': f'📅 Harvest Due Today: {crop.crop_name} ({crop.batch_code})',
                    'message': f'Today is the expected harvest date for {crop.crop_name} ({crop.variety}) - Batch: {crop.batch_code}. Current stage: {crop.get_current_stage_display()}. Growth duration: {crop.growth_duration_days} days.',
                    'priority': 'high'
                }
                
        elif days_until_harvest <= 3:  # Reminder (1-3 days ahead)
            # Check if we already have a reminder notification for this period
            existing = Notification.objects.filter(
                notification_type='harvest_reminder',
                user=crop.user,
                farm=crop.farm,
                title__icontains=crop.batch_code,
                created_at__gte=today - timedelta(days=1)
            ).exists()
            
            if not existing:
                notification_data = {
                    'type': 'harvest_reminder',
                    'title': f'⏰ Harvest Reminder: {crop.crop_name} ({crop.batch_code})',
                    'message': f'Harvest for {crop.crop_name} ({crop.variety}) - Batch: {crop.batch_code} is due in {days_until_harvest} day(s) on {harvest_date.strftime("%B %d, %Y")}. Please prepare for harvesting.',
                    'priority': 'medium'
                }
        
        # Create the notification if needed
        if notification_data:
            try:
                notification = Notification.objects.create(
                    title=notification_data['title'],
                    message=notification_data['message'],
                    notification_type=notification_data['type'],
                    farm=crop.farm,
                    user=crop.user,
                    is_read=False
                )
                
                notifications_created += 1
                
                # Send real-time notification via WebSocket
                send_realtime_notification(crop.user.id, {
                    'id': notification.id,
                    'title': notification.title,
                    'message': notification.message,
                    'type': notification.notification_type,
                    'priority': notification_data['priority'],
                    'created_at': notification.created_at.isoformat(),
                    'crop_info': {
                        'crop_name': crop.crop_name,
                        'variety': crop.variety,
                        'batch_code': crop.batch_code,
                        'current_stage': crop.current_stage,
                        'harvest_date': crop.expected_harvest_date.isoformat(),
                        'days_until_harvest': days_until_harvest
                    }
                })
                
            except Exception as e:
                continue
    
    return notifications_created

def send_realtime_notification(user_id, notification_data):
    """
    Send real-time notification via WebSocket
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'notifications_{user_id}',
                {
                    'type': 'harvest_notification',
                    'notification': notification_data
                }
            )
    except Exception as e:
        pass

def check_and_update_crop_stages():
    """
    Check and automatically update crop stages based on growth duration
    """
    today = date.today()
    updated_crops = 0
    
    # Get all crop stages that might need stage updates
    crop_stages = CropStage.objects.filter(
        transplant_date__isnull=False
    ).select_related('user', 'farm')
    
    for crop in crop_stages:
        growth_days = crop.growth_duration_days
        current_stage = crop.current_stage
        
        # Define approximate stage durations (can be customized)
        stage_thresholds = {
            'germination': 7,      # 0-7 days
            'seedling': 21,        # 7-21 days  
            'vegetative': 45,      # 21-45 days
            'flowering': 75,       # 45-75 days
            'fruiting': 90,        # 75-90 days
            'harvest': 999         # 90+ days
        }
        
        # Determine what stage the crop should be in based on growth duration
        new_stage = current_stage
        for stage, threshold in stage_thresholds.items():
            if growth_days <= threshold:
                new_stage = stage
                break
        
        # Update stage if it has changed
        if new_stage != current_stage and new_stage != 'harvest':
            crop.current_stage = new_stage
            crop.save()
            updated_crops += 1
            
            # Create a notification about stage transition
            try:
                Notification.objects.create(
                    title=f"🌱 Growth Stage Updated: {crop.crop_name} ({crop.batch_code})",
                    message=f"Your {crop.crop_name} ({crop.variety}) has progressed from {current_stage.title()} to {new_stage.title()} stage after {growth_days} days of growth.",
                    notification_type='general',
                    farm=crop.farm,
                    user=crop.user
                )
            except Exception as e:
                pass
    
    return updated_crops

def get_harvest_summary_for_user(user):
    """
    Get harvest summary statistics for a user
    """
    today = date.today()
    
    # Get user's crop stages
    crop_stages = CropStage.objects.filter(
        user=user,
        expected_harvest_date__isnull=False
    )
    
    summary = {
        'total_crops': crop_stages.count(),
        'due_today': 0,
        'due_this_week': 0,
        'overdue': 0,
        'upcoming': 0
    }
    
    for crop in crop_stages:
        days_until_harvest = (crop.expected_harvest_date - today).days
        
        if days_until_harvest < 0:
            summary['overdue'] += 1
        elif days_until_harvest == 0:
            summary['due_today'] += 1
        elif days_until_harvest <= 7:
            summary['due_this_week'] += 1
        else:
            summary['upcoming'] += 1
    
    return summary