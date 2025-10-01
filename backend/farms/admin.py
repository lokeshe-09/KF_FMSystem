from django.contrib import admin
from .models import (Farm, DailyTask, Notification, SprayIrrigationLog, CropStage, Fertigation,
                     AgronomistNotification, PlantDiseasePrediction, SpraySchedule, Worker,
                     WorkerTask, IssueReport, Expenditure, Sale, FarmTask)
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

@admin.register(AgronomistNotification)
class AgronomistNotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "notification_type", "agronomist_user_name", "source_user_name", "source_farm_name", "is_read", "created_at")
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("title", "message", "agronomist_user__username", "source_user__username", "source_farm__name")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    list_per_page = 50
    date_hierarchy = "created_at"
    
    fieldsets = (
        ("Notification Details", {
            "fields": ("title", "message", "notification_type")
        }),
        ("Agronomist and Source", {
            "fields": ("agronomist_user", "source_user", "source_farm")
        }),
        ("Related Object", {
            "fields": ("related_object_id", "related_model_name"),
            "classes": ("collapse",)
        }),
        ("Status", {
            "fields": ("is_read", "created_at")
        }),
    )
    
    def agronomist_user_name(self, obj):
        return obj.agronomist_user.username if obj.agronomist_user else "-"
    agronomist_user_name.short_description = "Agronomist"
    agronomist_user_name.admin_order_field = "agronomist_user__username"
    
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
        return queryset.select_related("agronomist_user", "source_user", "source_farm")

@admin.register(PlantDiseasePrediction)
class PlantDiseasePredictionAdmin(admin.ModelAdmin):
    list_display = ('farm_name', 'user_name', 'disease_status', 'confidence_level', 'disease_count', 'analysis_timestamp', 'is_resolved')
    list_filter = ('disease_status', 'confidence_level', 'is_resolved', 'analysis_timestamp', 'farm', 'gemini_model_version')
    search_fields = ('farm__name', 'user__username', 'user__first_name', 'user__last_name', 'ai_analysis', 'diseases_detected')
    readonly_fields = ('analysis_timestamp', 'created_at', 'updated_at', 'processing_time_ms', 'disease_count', 'primary_disease', 'severity_level')
    ordering = ('-analysis_timestamp',)
    list_per_page = 50
    date_hierarchy = 'analysis_timestamp'

    actions = ['mark_as_resolved', 'mark_as_unresolved']

    fieldsets = (
        ('Basic Information', {
            'fields': ('farm', 'user', 'crop_stage', 'location_in_farm')
        }),
        ('Image Data', {
            'fields': ('image_filename', 'image_format', 'image_width', 'image_height', 'image_size_bytes', 'image_data'),
            'classes': ('collapse',)
        }),
        ('AI Analysis Results', {
            'fields': ('disease_status', 'diseases_detected', 'confidence_level', 'confidence_score', 'ai_analysis')
        }),
        ('Recommendations', {
            'fields': ('remedies_suggested', 'prevention_tips')
        }),
        ('User Actions', {
            'fields': ('user_notes', 'is_resolved', 'actions_taken')
        }),
        ('Metadata', {
            'fields': ('gemini_model_version', 'processing_time_ms', 'analysis_timestamp', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Summary Properties', {
            'fields': ('disease_count', 'primary_disease', 'severity_level'),
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

    def disease_count(self, obj):
        return obj.disease_count
    disease_count.short_description = 'Diseases Count'

    def primary_disease(self, obj):
        disease = obj.primary_disease
        return disease.get('name', 'None') if disease else 'None'
    primary_disease.short_description = 'Primary Disease'

    def severity_level(self, obj):
        return obj.severity_level.title()
    severity_level.short_description = 'Severity'

    def image_dimensions(self, obj):
        if obj.image_width and obj.image_height:
            return f"{obj.image_width} × {obj.image_height} px"
        return 'Unknown'
    image_dimensions.short_description = 'Image Size'

    def image_size_display(self, obj):
        if obj.image_size_bytes:
            if obj.image_size_bytes < 1024:
                return f"{obj.image_size_bytes} B"
            elif obj.image_size_bytes < 1024 * 1024:
                return f"{obj.image_size_bytes / 1024:.1f} KB"
            else:
                return f"{obj.image_size_bytes / (1024 * 1024):.1f} MB"
        return 'Unknown'
    image_size_display.short_description = 'File Size'

    def mark_as_resolved(self, request, queryset):
        updated = queryset.update(is_resolved=True)
        self.message_user(request, f'{updated} predictions marked as resolved.')
    mark_as_resolved.short_description = 'Mark selected predictions as resolved'

    def mark_as_unresolved(self, request, queryset):
        updated = queryset.update(is_resolved=False)
        self.message_user(request, f'{updated} predictions marked as unresolved.')
    mark_as_unresolved.short_description = 'Mark selected predictions as unresolved'

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('farm', 'user', 'crop_stage')

@admin.register(SpraySchedule)
class SprayScheduleAdmin(admin.ModelAdmin):
    list_display = ('farm_name', 'user_name', 'crop_zone', 'date_time', 'is_completed', 'created_at')
    list_filter = ('is_completed', 'date_time', 'created_at', 'farm')
    search_fields = ('farm__name', 'user__username', 'crop_zone', 'product_used')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    list_per_page = 50
    date_hierarchy = 'date_time'

    fieldsets = (
        ('Basic Information', {
            'fields': ('farm', 'user', 'crop_zone', 'date_time')
        }),
        ('Chemical Details', {
            'fields': ('product_used', 'dose_concentration', 'reason')
        }),
        ('Status & Notes', {
            'fields': ('is_completed', 'notes')
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

@admin.register(Fertigation)
class FertigationAdmin(admin.ModelAdmin):
    list_display = ('crop_zone_name', 'farm_name', 'user_name', 'status', 'date_time', 'created_at')
    list_filter = ('status', 'date_time', 'created_at', 'farm')
    search_fields = ('crop_zone_name', 'farm__name', 'user__username', 'fertilizer_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    list_per_page = 50
    date_hierarchy = 'date_time'

    fieldsets = (
        ('Basic Information', {
            'fields': ('farm', 'user', 'crop_zone_name', 'date_time', 'status')
        }),
        ('Fertigation Details', {
            'fields': ('fertilizer_name', 'ec_level', 'ph_level', 'duration_minutes')
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

@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone_number', 'farm_name', 'employment_type', 'created_at')
    list_filter = ('employment_type', 'created_at', 'farm')
    search_fields = ('name', 'phone_number', 'farm__name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

    fieldsets = (
        ('Worker Information', {
            'fields': ('name', 'phone_number', 'farm', 'employment_type', 'wage_per_day')
        }),
        ('Additional Info', {
            'fields': ('address',)
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

@admin.register(WorkerTask)
class WorkerTaskAdmin(admin.ModelAdmin):
    list_display = ('worker_name', 'farm_name', 'task_description_short', 'status', 'assigned_date', 'created_at')
    list_filter = ('status', 'assigned_date', 'created_at', 'farm')
    search_fields = ('worker__name', 'farm__name', 'task_description')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    date_hierarchy = 'assigned_date'

    fieldsets = (
        ('Task Information', {
            'fields': ('worker', 'farm', 'assigned_date', 'due_date', 'status')
        }),
        ('Details', {
            'fields': ('task_description', 'remarks', 'completion_notes')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def worker_name(self, obj):
        return obj.worker.name if obj.worker else '-'
    worker_name.short_description = 'Worker'
    worker_name.admin_order_field = 'worker__name'

    def farm_name(self, obj):
        return obj.farm.name if obj.farm else '-'
    farm_name.short_description = 'Farm'
    farm_name.admin_order_field = 'farm__name'

    def task_description_short(self, obj):
        return obj.task_description[:50] + '...' if len(obj.task_description) > 50 else obj.task_description
    task_description_short.short_description = 'Task'

@admin.register(IssueReport)
class IssueReportAdmin(admin.ModelAdmin):
    list_display = ('crop_zone', 'issue_type', 'severity', 'status', 'farm_name', 'farm_user_name', 'agronomist_name', 'created_at')
    list_filter = ('issue_type', 'severity', 'status', 'created_at', 'farm')
    search_fields = ('crop_zone', 'description', 'farm__name', 'farm_user__username', 'agronomist_user__username')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    list_per_page = 50
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Issue Information', {
            'fields': ('farm', 'farm_user', 'crop_zone', 'issue_type', 'description')
        }),
        ('Status & Assignment', {
            'fields': ('severity', 'status', 'agronomist_user')
        }),
        ('Resolution', {
            'fields': ('resolution_notes', 'photo_evidence')
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

    def farm_user_name(self, obj):
        if obj.farm_user:
            full_name = f"{obj.farm_user.first_name} {obj.farm_user.last_name}".strip()
            return full_name if full_name else obj.farm_user.username
        return '-'
    farm_user_name.short_description = 'Farm User'
    farm_user_name.admin_order_field = 'farm_user__username'

    def agronomist_name(self, obj):
        if obj.agronomist_user:
            full_name = f"{obj.agronomist_user.first_name} {obj.agronomist_user.last_name}".strip()
            return full_name if full_name else obj.agronomist_user.username
        return '-'
    agronomist_name.short_description = 'Agronomist'
    agronomist_name.admin_order_field = 'agronomist_user__username'

@admin.register(Expenditure)
class ExpenditureAdmin(admin.ModelAdmin):
    list_display = ('farm_name', 'user_name', 'category', 'amount', 'expense_date', 'created_at')
    list_filter = ('category', 'expense_date', 'created_at', 'farm')
    search_fields = ('farm__name', 'user__username', 'expense_title', 'category')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    list_per_page = 50
    date_hierarchy = 'expense_date'

    fieldsets = (
        ('Basic Information', {
            'fields': ('farm', 'user', 'expense_title', 'category', 'amount', 'expense_date')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'bill_number', 'vendor_name')
        }),
        ('Details', {
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

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('farm_name', 'user_name', 'crop_name', 'quantity_sold', 'price_per_unit', 'total_amount', 'sale_date', 'created_at')
    list_filter = ('sale_date', 'created_at', 'farm', 'crop_name', 'payment_status')
    search_fields = ('farm__name', 'user__username', 'crop_name', 'buyer_name', 'batch_code')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    list_per_page = 50
    date_hierarchy = 'sale_date'

    fieldsets = (
        ('Basic Information', {
            'fields': ('farm', 'user', 'crop_name', 'batch_code', 'sale_date')
        }),
        ('Sale Details', {
            'fields': ('quantity_sold', 'unit', 'price_per_unit', 'total_amount')
        }),
        ('Buyer Information', {
            'fields': ('buyer_name', 'buyer_contact', 'buyer_address')
        }),
        ('Payment Details', {
            'fields': ('payment_status', 'payment_due_date', 'amount_received')
        }),
        ('Additional Information', {
            'fields': ('quality_grade', 'transportation_cost', 'commission_amount', 'notes', 'invoice_number')
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



@admin.register(FarmTask)
class FarmTaskAdmin(admin.ModelAdmin):
    list_display = ('title_short', 'farm_name', 'user_name', 'priority', 'status', 'due_date', 'created_at')
    list_filter = ('priority', 'status', 'due_date', 'created_at', 'farm')
    search_fields = ('title', 'description', 'farm__name', 'user__username', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'updated_at', 'completed_at')
    ordering = ('-created_at',)
    list_per_page = 50
    date_hierarchy = 'due_date'

    actions = ['mark_as_completed', 'mark_as_in_progress', 'mark_as_pending']

    fieldsets = (
        ('Task Information', {
            'fields': ('title', 'description', 'priority', 'status')
        }),
        ('Assignment', {
            'fields': ('farm', 'user', 'due_date')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

    def title_short(self, obj):
        return obj.title[:60] + '...' if len(obj.title) > 60 else obj.title
    title_short.short_description = 'Task Title'

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

    def mark_as_completed(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='completed', completed_at=timezone.now())
        self.message_user(request, f'{updated} tasks marked as completed.')
    mark_as_completed.short_description = 'Mark selected tasks as completed'

    def mark_as_in_progress(self, request, queryset):
        updated = queryset.update(status='in_progress')
        self.message_user(request, f'{updated} tasks marked as in progress.')
    mark_as_in_progress.short_description = 'Mark selected tasks as in progress'

    def mark_as_pending(self, request, queryset):
        updated = queryset.update(status='pending', completed_at=None)
        self.message_user(request, f'{updated} tasks marked as pending.')
    mark_as_pending.short_description = 'Mark selected tasks as pending'

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('farm', 'user')

