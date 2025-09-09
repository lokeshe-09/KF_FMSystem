from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'user_type', 'first_name', 'last_name', 'is_active', 'is_superuser', 'created_at')
    list_filter = ('user_type', 'is_active', 'is_superuser', 'created_at', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('username', 'password')
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'email', 'phone_number')
        }),
        ('User Type & Permissions', {
            'fields': ('user_type', 'is_active', 'is_staff', 'is_superuser')
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
        ('Farm Management', {
            'fields': ('created_by',),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'phone_number')
        }),
        ('User Type', {
            'fields': ('user_type',),
            'description': 'Select "admin" for system administrators who can manage farms and users. Select "farm_user" for regular farm users.'
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # editing an existing object
            return ('created_by', 'date_joined')
        return ()
    
    def save_model(self, request, obj, form, change):
        if not change:  # creating new object
            if not obj.created_by and hasattr(request, 'user'):
                obj.created_by = request.user
        super().save_model(request, obj, form, change)