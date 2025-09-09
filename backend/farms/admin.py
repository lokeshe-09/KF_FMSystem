from django.contrib import admin
from .models import Farm, DailyTask, Notification, SprayIrrigationLog, CropStage, Fertigation, AdminNotification
from accounts.models import CustomUser

@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'size_in_acres', 'created_by', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'location', 'users__username', 'users__first_name', 'users__last_name')
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    ordering = ('-created_at',)
    filter_horizontal = ('users',)
    
    fieldsets = (
        ('Farm Information', {
            'fields': ('name', 'location', 'size_in_acres', 'description')
        }),
        ('Assignment', {
            'fields': ('users', 'is_active')
        }),
        ('System Information', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def formfield_for_manytomany(self, db_field, request, **kwargs):
        if db_field.name == "users":
            # Only show farm_users (not superusers) in the users dropdown
            kwargs["queryset"] = CustomUser.objects.filter(user_type='farm_user', is_superuser=False)
        return super().formfield_for_manytomany(db_field, request, **kwargs)
    
    def save_model(self, request, obj, form, change):
        if not change:  # creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('created_by')

@admin.register(DailyTask)
class DailyTaskAdmin(admin.ModelAdmin):
    list_display = ('farm', 'user', 'date', 'created_at')
    list_filter = ('date', 'farm', 'created_at')
    search_fields = ('farm__name', 'user__username', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'notification_type', 'farm_name', 'user_name', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at', 'farm')
    search_fields = ('title', 'message', 'farm__name', 'user__username', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    list_per_page = 50
    date_hierarchy = 'created_at'
    
    actions = ['mark_as_read', 'mark_as_unread', 'delete_selected_notifications']
    
    fieldsets = (
        ('Notification Details', {
            'fields': ('title', 'message', 'notification_type')
        }),
        ('Related Objects', {
            'fields': ('farm', 'user')
        }),
        ('Status', {
            'fields': ('is_read', 'created_at')
        }),
    )
    
    def farm_name(self, obj):
        return obj.farm.name if obj.farm else '-'
    farm_name.short_description = 'Farm'
    farm_name.admin_order_field = 'farm__name'
    
    def user_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        return '-'
    user_name.short_description = 'User'
    user_name.admin_order_field = 'user__username'
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} notifications marked as read.')
    mark_as_read.short_description = 'Mark selected notifications as read'
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f'{updated} notifications marked as unread.')
    mark_as_unread.short_description = 'Mark selected notifications as unread'
    
    def delete_selected_notifications(self, request, queryset):
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f'{count} notifications deleted successfully.')
    delete_selected_notifications.short_description = 'Delete selected notifications'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('farm', 'user')

@admin.register(CropStage)
class CropStageAdmin(admin.ModelAdmin):
    list_display = ('crop_name', 'variety', 'batch_code', 'farm_name', 'user_name', 'current_stage', 'transplant_date', 'growth_duration_days', 'created_at')
    list_filter = ('current_stage', 'transplant_date', 'created_at', 'farm')
    search_fields = ('crop_name', 'variety', 'batch_code', 'farm__name', 'user__username', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'updated_at', 'growth_duration_days')
    ordering = ('-created_at',)
    list_per_page = 50
    date_hierarchy = 'transplant_date'
    
    fieldsets = (
        ('Crop Information', {
            'fields': ('crop_name', 'variety', 'batch_code', 'current_stage')
        }),
        ('Farm & User', {
            'fields': ('farm', 'user')
        }),
        ('Dates', {
            'fields': ('transplant_date', 'expected_harvest_date', 'growth_duration_days')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def farm_name(self, obj):
        return obj.farm.name if obj.farm else '-'
    farm_name.short_description = 'Farm'
    farm_name.admin_order_field = 'farm__name'
    
    def user_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        return '-'
    user_name.short_description = 'User'
    user_name.admin_order_field = 'user__username'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('farm', 'user')

@admin.register(SprayIrrigationLog)
class SprayIrrigationLogAdmin(admin.ModelAdmin):
    list_display = ('farm_name', 'user_name', 'activity_type', 'date', 'created_at')
    list_filter = ('activity_type', 'date', 'created_at', 'farm')
    search_fields = ('farm__name', 'user__username', 'user__first_name', 'user__last_name', 'crop_type', 'chemical_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    list_per_page = 50
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('farm', 'user', 'date', 'activity_type')
        }),
        ('Spray Details', {
            'fields': ('crop_type', 'chemical_name', 'dosage', 'quantity', 'sprayer_name'),
            'classes': ('collapse',)
        }),
        ('Irrigation Details', {
            'fields': ('irrigation_timing', 'irrigation_volume'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('notes', 'image_data')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def farm_name(self, obj):
        return obj.farm.name if obj.farm else '-'
    farm_name.short_description = 'Farm'
    farm_name.admin_order_field = 'farm__name'
    
    def user_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        return '-'
    user_name.short_description = 'User'
    user_name.admin_order_field = 'user__username'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('farm', 'user')

@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "notification_type", "admin_user_name", "source_user_name", "source_farm_name", "is_read", "created_at")
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("title", "message", "admin_user__username", "source_user__username", "source_farm__name")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    list_per_page = 50
    date_hierarchy = "created_at"
    
    fieldsets = (
        ("Notification Details", {
            "fields": ("title", "message", "notification_type")
        }),
        ("Admin and Source", {
            "fields": ("admin_user", "source_user", "source_farm")
        }),
        ("Related Object", {
            "fields": ("related_object_id", "related_model_name"),
            "classes": ("collapse",)
        }),
        ("Status", {
            "fields": ("is_read", "created_at")
        }),
    )
    
    def admin_user_name(self, obj):
        return obj.admin_user.username if obj.admin_user else "-"
    admin_user_name.short_description = "Admin User"
    admin_user_name.admin_order_field = "admin_user__username"
    
    def source_user_name(self, obj):
        return obj.source_user.username if obj.source_user else "-"
    source_user_name.short_description = "Source User"
    source_user_name.admin_order_field = "source_user__username"
    
    def source_farm_name(self, obj):
        return obj.source_farm.name if obj.source_farm else "-"
    source_farm_name.short_description = "Source Farm"
    source_farm_name.admin_order_field = "source_farm__name"
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related("admin_user", "source_user", "source_farm")

