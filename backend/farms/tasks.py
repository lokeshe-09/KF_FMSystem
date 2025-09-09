from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

from .models import Fertigation, Notification, CropStage

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_timed_notifications(self):
    """
    Celery task to send time-based notifications for all scheduled activities.
    Runs every minute to ensure precise timing.
    """
    try:
        channel_layer = get_channel_layer()
        now = timezone.now()
        
        logger.info(f"Running timed notifications check at {now.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Process fertigation notifications
        fertigation_count = process_fertigation_notifications(channel_layer, now)
        
        # Process harvest notifications
        harvest_count = process_harvest_notifications(channel_layer, now)
        
        logger.info(f"Processed {fertigation_count} fertigation and {harvest_count} harvest notifications")
        
        return {
            'status': 'success',
            'fertigation_notifications': fertigation_count,
            'harvest_notifications': harvest_count,
            'timestamp': now.isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Error in send_timed_notifications: {str(exc)}")
        # Retry the task with exponential backoff
        raise self.retry(exc=exc, countdown=60, max_retries=3)

def process_fertigation_notifications(channel_layer, now):
    """Process fertigation-related notifications"""
    notification_count = 0
    
    try:
        # 1. Send notifications for fertigations due now (within 1 minute window)
        due_fertigations = Fertigation.objects.filter(
            status='scheduled',
            date_time__lte=now,
            date_time__gte=now - timedelta(minutes=1)
        ).select_related('user', 'farm')
        
        for fertigation in due_fertigations:
            # Check if notification already sent
            existing_notification = Notification.objects.filter(
                notification_type='fertigation_due',
                related_object_id=fertigation.id,
                user=fertigation.user
            ).first()
            
            if not existing_notification:
                notification = Notification.objects.create(
                    title=f"🚿 Fertigation Due: {fertigation.crop_zone_name}",
                    message=f"Scheduled fertigation for {fertigation.crop_zone_name} at {fertigation.farm.name} is now due. Please proceed with the application.",
                    notification_type='fertigation_due',
                    farm=fertigation.farm,
                    user=fertigation.user,
                    due_date=fertigation.date_time,
                    related_object_id=fertigation.id,
                    is_read=False
                )
                
                send_websocket_notification(channel_layer, notification)
                send_admin_notification(channel_layer, notification, fertigation.user)
                notification_count += 1
                logger.info(f'Sent fertigation due notification to {fertigation.user.username} and admin for {fertigation.crop_zone_name}')
        
        # 2. Update overdue fertigations
        overdue_fertigations = Fertigation.objects.filter(
            status='scheduled',
            date_time__lt=now - timedelta(minutes=1)
        ).select_related('user', 'farm')
        
        for fertigation in overdue_fertigations:
            # Check if overdue notification already exists
            existing_notification = Notification.objects.filter(
                notification_type='fertigation_overdue',
                related_object_id=fertigation.id,
                user=fertigation.user
            ).first()
            
            if not existing_notification:
                # First check if there's a due notification to update
                due_notification = Notification.objects.filter(
                    notification_type='fertigation_due',
                    related_object_id=fertigation.id,
                    user=fertigation.user
                ).first()
                
                if due_notification:
                    # Update the existing due notification to overdue
                    due_notification.notification_type = 'fertigation_overdue'
                    due_notification.title = f"⚠️ Fertigation Overdue: {fertigation.crop_zone_name}"
                    due_notification.message = f"Scheduled fertigation for {fertigation.crop_zone_name} at {fertigation.farm.name} was scheduled for {fertigation.date_time.strftime('%Y-%m-%d %H:%M')} but is still pending."
                    due_notification.save()
                    notification = due_notification
                else:
                    # Create new overdue notification
                    notification = Notification.objects.create(
                        title=f"⚠️ Fertigation Overdue: {fertigation.crop_zone_name}",
                        message=f"Scheduled fertigation for {fertigation.crop_zone_name} at {fertigation.farm.name} was scheduled for {fertigation.date_time.strftime('%Y-%m-%d %H:%M')} but is still pending.",
                        notification_type='fertigation_overdue',
                        farm=fertigation.farm,
                        user=fertigation.user,
                        due_date=fertigation.date_time,
                        related_object_id=fertigation.id,
                        is_read=False
                    )
                
                send_websocket_notification(channel_layer, notification)
                send_admin_notification(channel_layer, notification, fertigation.user)
                notification_count += 1
                logger.info(f'Updated/sent overdue fertigation notification to {fertigation.user.username} and admin for {fertigation.crop_zone_name}')
    
    except Exception as e:
        logger.error(f"Error processing fertigation notifications: {str(e)}")
    
    return notification_count

def process_harvest_notifications(channel_layer, now):
    """Process harvest-related notifications"""
    notification_count = 0
    
    try:
        # Find crop stages with expected harvest dates
        upcoming_harvests = CropStage.objects.filter(
            expected_harvest_date__isnull=False,
            expected_harvest_date__lte=now.date() + timedelta(days=1),
            expected_harvest_date__gte=now.date()
        ).select_related('user', 'farm')
        
        for crop_stage in upcoming_harvests:
            # Check if notification already sent
            existing_notification = Notification.objects.filter(
                notification_type='harvest_due',
                related_object_id=crop_stage.id,
                user=crop_stage.user
            ).first()
            
            if not existing_notification:
                harvest_datetime = timezone.make_aware(
                    timezone.datetime.combine(crop_stage.expected_harvest_date, timezone.datetime.min.time())
                )
                
                notification = Notification.objects.create(
                    title=f"🌾 Harvest Due: {crop_stage.crop_name}",
                    message=f"Crop {crop_stage.crop_name} ({crop_stage.variety}) in batch {crop_stage.batch_code} at {crop_stage.farm.name} is ready for harvest.",
                    notification_type='harvest_due',
                    farm=crop_stage.farm,
                    user=crop_stage.user,
                    due_date=harvest_datetime,
                    related_object_id=crop_stage.id,
                    is_read=False
                )
                
                send_websocket_notification(channel_layer, notification)
                send_admin_notification(channel_layer, notification, crop_stage.user)
                notification_count += 1
                logger.info(f'Sent harvest due notification to {crop_stage.user.username} and admin for {crop_stage.crop_name}')
        
        # Check for overdue harvests
        overdue_harvests = CropStage.objects.filter(
            expected_harvest_date__isnull=False,
            expected_harvest_date__lt=now.date()
        ).select_related('user', 'farm')
        
        for crop_stage in overdue_harvests:
            # Check if overdue notification already exists
            existing_notification = Notification.objects.filter(
                notification_type='harvest_overdue',
                related_object_id=crop_stage.id,
                user=crop_stage.user
            ).first()
            
            if not existing_notification:
                # Update due notification to overdue if exists
                due_notification = Notification.objects.filter(
                    notification_type='harvest_due',
                    related_object_id=crop_stage.id,
                    user=crop_stage.user
                ).first()
                
                harvest_datetime = timezone.make_aware(
                    timezone.datetime.combine(crop_stage.expected_harvest_date, timezone.datetime.min.time())
                )
                
                if due_notification:
                    due_notification.notification_type = 'harvest_overdue'
                    due_notification.title = f"⚠️ Harvest Overdue: {crop_stage.crop_name}"
                    due_notification.message = f"Crop {crop_stage.crop_name} ({crop_stage.variety}) in batch {crop_stage.batch_code} at {crop_stage.farm.name} was scheduled for harvest on {crop_stage.expected_harvest_date.strftime('%Y-%m-%d')} but is still pending."
                    due_notification.save()
                    notification = due_notification
                else:
                    notification = Notification.objects.create(
                        title=f"⚠️ Harvest Overdue: {crop_stage.crop_name}",
                        message=f"Crop {crop_stage.crop_name} ({crop_stage.variety}) in batch {crop_stage.batch_code} at {crop_stage.farm.name} was scheduled for harvest on {crop_stage.expected_harvest_date.strftime('%Y-%m-%d')} but is still pending.",
                        notification_type='harvest_overdue',
                        farm=crop_stage.farm,
                        user=crop_stage.user,
                        due_date=harvest_datetime,
                        related_object_id=crop_stage.id,
                        is_read=False
                    )
                
                send_websocket_notification(channel_layer, notification)
                send_admin_notification(channel_layer, notification, crop_stage.user)
                notification_count += 1
                logger.info(f'Updated/sent overdue harvest notification to {crop_stage.user.username} and admin for {crop_stage.crop_name}')
    
    except Exception as e:
        logger.error(f"Error processing harvest notifications: {str(e)}")
    
    return notification_count

def send_websocket_notification(channel_layer, notification):
    """Send notification via WebSocket"""
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                f"user_{notification.user.id}",
                {
                    "type": "notification",
                    "notification": {
                        "id": notification.id,
                        "title": notification.title,
                        "message": notification.message,
                        "type": notification.notification_type,
                        "due_date": notification.due_date.isoformat() if notification.due_date else None,
                        "is_overdue": notification.is_overdue,
                        "time_until_due": notification.time_until_due,
                        "created_at": notification.created_at.isoformat()
                    }
                }
            )
        except Exception as e:
            logger.error(f'Failed to send WebSocket notification: {str(e)}')

def send_admin_notification(channel_layer, notification, farm_user):
    """Send notification to admin via WebSocket"""
    if channel_layer and hasattr(farm_user, 'created_by') and farm_user.created_by:
        admin_user = farm_user.created_by
        if admin_user and admin_user.user_type in ['admin', 'superuser']:
            try:
                notification_data = {
                    "type": "notification_message",
                    "title": notification.title,
                    "message": f"Farm User: {farm_user.username} - {notification.message}",
                    "notification_type": notification.notification_type,
                    "notification_id": notification.id,
                    "farm_id": notification.farm.id if notification.farm else None,
                    "farm_name": notification.farm.name if notification.farm else None,
                    "user_id": farm_user.id,
                    "user_name": farm_user.username,
                    "timestamp": notification.created_at.isoformat()
                }
                
                # Send to specific admin who created this farm user (using consistent naming)
                specific_admin_group = f'admin_{admin_user.id}_notifications'
                async_to_sync(channel_layer.group_send)(specific_admin_group, notification_data)
                
                # Also send to general admin notifications group (fallback)
                async_to_sync(channel_layer.group_send)("admin_notifications", notification_data)
                
                logger.info(f'Sent {notification.notification_type} notification to admin {admin_user.username} (ID: {admin_user.id}) for farm user {farm_user.username}')
            except Exception as e:
                logger.error(f'Failed to send admin notification: {str(e)}')

@shared_task
def cleanup_old_notifications():
    """
    Clean up old read notifications older than 30 days.
    Runs daily to keep the database clean.
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=30)
        deleted_count = Notification.objects.filter(
            is_read=True,
            created_at__lt=cutoff_date
        ).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old notifications")
        return {'status': 'success', 'deleted_count': deleted_count}
        
    except Exception as e:
        logger.error(f"Error cleaning up notifications: {str(e)}")
        return {'status': 'error', 'message': str(e)}