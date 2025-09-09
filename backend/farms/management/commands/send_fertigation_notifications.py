from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from farms.models import Fertigation, Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class Command(BaseCommand):
    help = 'Send notifications for scheduled fertigations'

    def handle(self, *args, **options):
        channel_layer = get_channel_layer()
        now = timezone.now()
        
        # Get scheduled fertigations that are due now (within 1 minute window)
        due_fertigations = Fertigation.objects.filter(
            status='scheduled',
            date_time__lte=now,
            date_time__gte=now - timedelta(minutes=1)
        ).select_related('user', 'farm')
        
        for fertigation in due_fertigations:
            # Create notification for the user
            notification = Notification.objects.create(
                title=f"Fertigation Due: {fertigation.crop_zone_name}",
                message=f"Scheduled fertigation for {fertigation.crop_zone_name} at {fertigation.farm.name} is now due. Please proceed with the application.",
                notification_type='fertigation_due',
                farm=fertigation.farm,
                user=fertigation.user,
                due_date=fertigation.date_time,
                related_object_id=fertigation.id,
                is_read=False
            )
            
            # Send WebSocket notification
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{fertigation.user.id}",
                    {
                        "type": "notification",
                        "notification": {
                            "id": notification.id,
                            "title": notification.title,
                            "message": notification.message,
                            "type": notification.notification_type,
                            "created_at": notification.created_at.isoformat()
                        }
                    }
                )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Sent fertigation notification to {fertigation.user.username} for {fertigation.crop_zone_name}'
                )
            )
        
        # Check for overdue fertigations (more than scheduled time)
        overdue_fertigations = Fertigation.objects.filter(
            status='scheduled',
            date_time__lt=now - timedelta(minutes=1)
        ).select_related('user', 'farm')
        
        for fertigation in overdue_fertigations:
            # Check if overdue notification already exists
            existing_notification = Notification.objects.filter(
                notification_type='fertigation_overdue',
                farm=fertigation.farm,
                user=fertigation.user,
                message__icontains=fertigation.crop_zone_name
            ).first()
            
            if not existing_notification:
                # Create overdue notification
                notification = Notification.objects.create(
                    title=f"Fertigation Overdue: {fertigation.crop_zone_name}",
                    message=f"Scheduled fertigation for {fertigation.crop_zone_name} at {fertigation.farm.name} was scheduled for {fertigation.date_time.strftime('%Y-%m-%d %H:%M')} but is still pending.",
                    notification_type='fertigation_overdue',
                    farm=fertigation.farm,
                    user=fertigation.user,
                    due_date=fertigation.date_time,
                    related_object_id=fertigation.id,
                    is_read=False
                )
                
                # Send WebSocket notification
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{fertigation.user.id}",
                        {
                            "type": "notification",
                            "notification": {
                                "id": notification.id,
                                "title": notification.title,
                                "message": notification.message,
                                "type": notification.notification_type,
                                "created_at": notification.created_at.isoformat()
                            }
                        }
                    )
                
                self.stdout.write(
                    self.style.WARNING(
                        f'Sent overdue fertigation notification to {fertigation.user.username} for {fertigation.crop_zone_name}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Processed {due_fertigations.count()} due and {overdue_fertigations.count()} overdue fertigations'
            )
        )