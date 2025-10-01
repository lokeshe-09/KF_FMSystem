from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    USER_TYPE_CHOICES = (
        ('agronomist', 'Agronomist'),
        ('farm_user', 'Farm User'),
    )
    
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='farm_user')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        if self.is_superuser:
            return f"{self.username} (Superuser)"
        return f"{self.username} ({self.user_type})"
    
    def save(self, *args, **kwargs):
        # Superusers should not have user_type constraints
        if self.is_superuser:
            self.user_type = 'agronomist'  # Set to agronomist but they're still separate
        super().save(*args, **kwargs)