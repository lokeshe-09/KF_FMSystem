import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'farm_management.settings')

app = Celery('farm_management')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule for periodic tasks
app.conf.beat_schedule = {
    'send-timed-notifications': {
        'task': 'farms.tasks.send_timed_notifications',
        'schedule': 60.0,  # Run every 60 seconds
        'options': {'expires': 55}  # Task expires in 55 seconds to prevent overlap
    },
}

app.conf.timezone = 'Asia/Kolkata'
app.conf.enable_utc = True

@app.task(bind=True)
def debug_task(self):
    pass