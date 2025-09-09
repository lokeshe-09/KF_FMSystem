from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, IntervalSchedule
import json

class Command(BaseCommand):
    help = 'Setup periodic tasks for notification system'

    def handle(self, *args, **options):
        # Create interval schedule for every minute
        schedule, created = IntervalSchedule.objects.get_or_create(
            every=1,
            period=IntervalSchedule.MINUTES,
        )
        
        # Create or update the periodic task
        task, created = PeriodicTask.objects.get_or_create(
            name='Send Timed Notifications',
            defaults={
                'interval': schedule,
                'task': 'farms.tasks.send_timed_notifications',
                'enabled': True,
            }
        )
        
        if not created:
            task.interval = schedule
            task.enabled = True
            task.save()
        
        # Create daily cleanup task
        daily_schedule, created = IntervalSchedule.objects.get_or_create(
            every=24,
            period=IntervalSchedule.HOURS,
        )
        
        cleanup_task, created = PeriodicTask.objects.get_or_create(
            name='Cleanup Old Notifications',
            defaults={
                'interval': daily_schedule,
                'task': 'farms.tasks.cleanup_old_notifications',
                'enabled': True,
            }
        )
        
        if not created:
            cleanup_task.interval = daily_schedule
            cleanup_task.enabled = True
            cleanup_task.save()
        
        self.stdout.write(
            self.style.SUCCESS(
                'Successfully set up periodic tasks:\n'
                '- Send Timed Notifications (every minute)\n'
                '- Cleanup Old Notifications (daily)'
            )
        )