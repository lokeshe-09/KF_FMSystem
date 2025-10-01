# Migration to update user_type from 'admin' to 'agronomist'

from django.db import migrations


def update_admin_to_agronomist(apps, schema_editor):
    """Update all users with user_type 'admin' to 'agronomist'"""
    CustomUser = apps.get_model('accounts', 'CustomUser')

    # Update all admin users to agronomist
    CustomUser.objects.filter(user_type='admin').update(user_type='agronomist')


def reverse_agronomist_to_admin(apps, schema_editor):
    """Reverse migration - update all users with user_type 'agronomist' to 'admin'"""
    CustomUser = apps.get_model('accounts', 'CustomUser')

    # Update all agronomist users back to admin
    CustomUser.objects.filter(user_type='agronomist').update(user_type='admin')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            update_admin_to_agronomist,
            reverse_agronomist_to_admin,
        ),
    ]