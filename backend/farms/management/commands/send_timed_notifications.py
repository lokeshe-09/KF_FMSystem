from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from farms.models import Fertigation, Notification, CropStage
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class Command(BaseCommand):
    help = 'Send time-based notifications for all scheduled activities'

    def handle(self, *args, **options):
        channel_layer = get_channel_layer()
        now = timezone.now()
        
        self.stdout.write(f"Running timed notifications check at {now.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Process fertigation notifications
        self.process_fertigation_notifications(channel_layer, now)
        
        # Process harvest notifications
        self.process_harvest_notifications(channel_layer, now)
        
        self.stdout.write(self.style.SUCCESS('Timed notifications check completed'))

    def process_fertigation_notifications(self, channel_layer, now):
        """Process fertigation-related notifications"""
        
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
                
                self.send_websocket_notification(channel_layer, notification)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Sent fertigation due notification to {fertigation.user.username} for {fertigation.crop_zone_name}'
                    )
                )
        
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
                
                self.send_websocket_notification(channel_layer, notification)
                self.stdout.write(
                    self.style.WARNING(
                        f'Updated/sent overdue fertigation notification to {fertigation.user.username} for {fertigation.crop_zone_name}'
                    )
                )

    def process_harvest_notifications(self, channel_layer, now):
        """Process harvest-related notifications"""
        
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
                
                self.send_websocket_notification(channel_layer, notification)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Sent harvest due notification to {crop_stage.user.username} for {crop_stage.crop_name}'
                    )
                )
        
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
                
                self.send_websocket_notification(channel_layer, notification)
                self.stdout.write(
                    self.style.WARNING(
                        f'Updated/sent overdue harvest notification to {crop_stage.user.username} for {crop_stage.crop_name}'
                    )
                )

    def send_websocket_notification(self, channel_layer, notification):
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
                self.stdout.write(
                    self.style.ERROR(f'Failed to send WebSocket notification: {str(e)}')
                )