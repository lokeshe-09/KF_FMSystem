from django.db import models
from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver

class Farm(models.Model):
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=300)
    size_in_acres = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='assigned_farms', blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_farms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} - {self.location}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_by']),
            models.Index(fields=['is_active']),
            models.Index(fields=['-created_at']),
        ]

class DailyTask(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='daily_tasks')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateField()
    
    # Hygiene tasks
    farm_hygiene = models.BooleanField(default=False)
    disease_pest_check = models.BooleanField(default=False)
    daily_crop_update = models.BooleanField(default=False)
    
    # Daily operations (multiple choice)
    trellising = models.BooleanField(default=False)
    spraying = models.BooleanField(default=False)
    cleaning = models.BooleanField(default=False)
    pruning = models.BooleanField(default=False)
    
    # EC, pH values
    main_tank_ec = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    main_tank_ph = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    dripper_ec = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    dripper_ph = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at', '-date']
        indexes = [
            models.Index(fields=['user', '-date']),
            models.Index(fields=['farm', '-date']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.farm.name} - {self.date} - {self.user.username}"

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('daily_task', 'Daily Task Submission'),
        ('farm_created', 'Farm Created'),
        ('user_created', 'User Created'),
        ('harvest_due', 'Harvest Due'),
        ('harvest_overdue', 'Harvest Overdue'),
        ('harvest_reminder', 'Harvest Reminder'),
        ('fertigation_due', 'Fertigation Due'),
        ('fertigation_overdue', 'Fertigation Overdue'),
        ('admin_message', 'Agronomist Message'),  # Legacy support
        ('agronomist_message', 'Agronomist Message'),
        ('farm_announcement', 'Farm Announcement'),
        ('task_reminder', 'Task Reminder'),
        ('general', 'General'),
    )
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='general')
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='received_notifications')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='sent_notifications')
    is_read = models.BooleanField(default=False)
    is_farm_wide = models.BooleanField(default=False, help_text="True if notification is for all farm users, False for specific user")
    priority = models.CharField(max_length=10, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], default='medium')
    due_date = models.DateTimeField(null=True, blank=True)  # When the task/activity is due
    related_object_id = models.PositiveIntegerField(null=True, blank=True)  # ID of related fertigation/harvest etc
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['farm', '-created_at']),
            models.Index(fields=['created_by', '-created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['is_read']),
            models.Index(fields=['is_farm_wide']),
            models.Index(fields=['priority']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.created_at}"
    
    @property
    def is_overdue(self):
        """Check if notification is overdue"""
        if not self.due_date:
            return False
        from django.utils import timezone
        return timezone.localtime() > self.due_date
    
    @property
    def time_until_due(self):
        """Get time until due in human readable format"""
        if not self.due_date:
            return None
        from django.utils import timezone
        current_time = timezone.localtime()
        delta = self.due_date - current_time
        if delta.total_seconds() < 0:
            delta = current_time - self.due_date
            if delta.days > 0:
                return f"{delta.days} days overdue"
            elif delta.seconds // 3600 > 0:
                return f"{delta.seconds // 3600} hours overdue"
            else:
                return f"{delta.seconds // 60} minutes overdue"
        else:
            if delta.days > 0:
                return f"{delta.days} days remaining"
            elif delta.seconds // 3600 > 0:
                return f"{delta.seconds // 3600} hours remaining"
            else:
                return f"{delta.seconds // 60} minutes remaining"

class SprayIrrigationLog(models.Model):
    ACTIVITY_TYPE_CHOICES = (
        ('spray', 'Spray'),
        ('irrigation', 'Irrigation'),
    )
    
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='spray_irrigation_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    crop_stage = models.ForeignKey('CropStage', on_delete=models.CASCADE, related_name='spray_irrigation_logs', null=True, blank=True)
    date = models.DateField()
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPE_CHOICES)
    
    # Spray specific fields
    crop_type = models.CharField(max_length=100, blank=True, null=True)
    chemical_name = models.CharField(max_length=200, blank=True, null=True)
    dosage = models.CharField(max_length=100, blank=True, null=True)
    quantity = models.CharField(max_length=100, blank=True, null=True)
    sprayer_name = models.CharField(max_length=200, blank=True, null=True)
    
    # Irrigation specific fields
    irrigation_timing = models.CharField(max_length=100, blank=True, null=True)
    irrigation_volume = models.CharField(max_length=100, blank=True, null=True)
    
    # Common fields
    notes = models.TextField(blank=True, null=True)
    image_data = models.TextField(blank=True, null=True)  # Base64 encoded image
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at', '-date']
    
    def __str__(self):
        return f"{self.farm.name} - {self.activity_type} - {self.date}"

class SpraySchedule(models.Model):
    REASON_CHOICES = (
        ('pest', 'Pest Control'),
        ('disease', 'Disease Control'),
        ('nutrient', 'Nutrient Application'),
    )
    
    # Required fields based on your specification
    spray_id = models.CharField(max_length=50, unique=True, help_text="Unique spray identifier")
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='spray_schedules')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    crop_zone = models.CharField(max_length=200, help_text="Crop/Zone identifier")
    date_time = models.DateTimeField(help_text="Date & Time of spray application")
    product_used = models.CharField(max_length=300, help_text="Product/Chemical used")
    dose_concentration = models.CharField(max_length=200, help_text="Dose/Concentration applied")
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, help_text="Reason for spray application")
    phi_log = models.PositiveIntegerField(help_text="Pre-Harvest Interval in days")
    worker_name = models.CharField(max_length=200, help_text="Name of worker who applied spray")
    next_spray_reminder = models.DateTimeField(null=True, blank=True, help_text="Next spray reminder date")
    
    # Additional fields for comprehensive tracking
    crop_stage = models.ForeignKey('CropStage', on_delete=models.SET_NULL, null=True, blank=True)
    weather_conditions = models.CharField(max_length=200, blank=True, null=True, help_text="Weather conditions during application")
    application_method = models.CharField(max_length=100, blank=True, null=True, help_text="Spray application method")
    equipment_used = models.CharField(max_length=200, blank=True, null=True, help_text="Equipment/sprayer used")
    area_covered = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Area covered in acres")
    notes = models.TextField(blank=True, null=True, help_text="Additional notes")
    image_data = models.TextField(blank=True, null=True, help_text="Base64 encoded image evidence")
    
    # Tracking fields
    is_completed = models.BooleanField(default=False)
    completion_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_time', '-created_at']
        indexes = [
            models.Index(fields=['farm', '-date_time']),
            models.Index(fields=['user', '-date_time']),
            models.Index(fields=['reason']),
            models.Index(fields=['next_spray_reminder']),
            models.Index(fields=['is_completed']),
        ]
    
    def __str__(self):
        return f"Spray {self.spray_id} - {self.crop_zone} - {self.date_time.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        if not self.spray_id:
            # Auto-generate spray_id if not provided
            import uuid
            self.spray_id = f"SPR-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)
    
    @property
    def days_until_harvest_safe(self):
        """Calculate days remaining until harvest is safe based on PHI"""
        if not self.completion_date or not self.phi_log:
            return None
        from django.utils import timezone
        phi_end_date = self.completion_date + timezone.timedelta(days=self.phi_log)
        current_date = timezone.localtime()
        delta = phi_end_date - current_date
        return max(0, delta.days) if delta.total_seconds() > 0 else 0
    
    @property
    def is_phi_complete(self):
        """Check if PHI period has completed"""
        days_remaining = self.days_until_harvest_safe
        return days_remaining == 0 if days_remaining is not None else False
    
    @property
    def is_reminder_due(self):
        """Check if next spray reminder is due"""
        if not self.next_spray_reminder:
            return False
        from django.utils import timezone
        return timezone.localtime() >= self.next_spray_reminder

class CropStage(models.Model):
    CROP_STAGES = (
        ('germination', 'Germination'),
        ('seedling', 'Seedling'),
        ('vegetative', 'Vegetative'),
        ('flowering', 'Flowering'),
        ('fruiting', 'Fruiting'),
        ('harvest', 'Harvest'),
    )
    
    HEALTH_STATUS = (
        ('healthy', 'Healthy'),
        ('moderate', 'Moderate'),
        ('needs_attention', 'Needs Attention'),
    )
    
    # Crop Identification
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='crop_stages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    crop_name = models.CharField(max_length=200)
    variety = models.CharField(max_length=200)
    batch_code = models.CharField(max_length=100)
    farm_section = models.CharField(max_length=200, blank=True, null=True, help_text="Farm section or hydroponic unit")
    area = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, help_text="Area in acres/hectares")
    number_of_plants = models.PositiveIntegerField(blank=True, null=True, help_text="Total number of plants")
    
    # Stage Tracking
    current_stage = models.CharField(max_length=20, choices=CROP_STAGES)
    stage_start_date = models.DateField(blank=True, null=True, help_text="When current stage started")
    stage_end_date = models.DateField(blank=True, null=True, help_text="When current stage ended/expected to end")
    
    # Timeline
    sowing_date = models.DateField(blank=True, null=True, help_text="Date of sowing seeds")
    transplant_date = models.DateField(help_text="Date of transplanting")
    expected_harvest_date = models.DateField(blank=True, null=True)
    actual_harvest_date = models.DateField(blank=True, null=True, help_text="Actual harvest completion date")
    
    # Crop Health & Observations
    health_status = models.CharField(max_length=20, choices=HEALTH_STATUS, default='healthy')
    issues_reported = models.TextField(blank=True, null=True, help_text="Pests, diseases, nutrient deficiency")
    notes = models.TextField(blank=True, null=True, help_text="General observations and notes")
    
    # Yield Tracking
    expected_yield = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, help_text="Expected yield in kg/units")
    actual_yield = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, help_text="Actual yield harvested in kg/units (filled after harvest)")
    losses = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, default=0, help_text="Yield losses in kg/units")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at', 'crop_name']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['farm', 'current_stage']),
            models.Index(fields=['batch_code']),
            models.Index(fields=['health_status']),
        ]
    
    def __str__(self):
        return f"{self.crop_name} ({self.variety}) - {self.batch_code}"
    
    @property
    def growth_duration_days(self):
        from django.utils import timezone
        if self.transplant_date:
            current_date = timezone.localtime().date()
            return (current_date - self.transplant_date).days
        return 0
    
    @property
    def days_in_current_stage(self):
        """Calculate days spent in current stage"""
        if not self.stage_start_date:
            return 0
        from django.utils import timezone
        current_date = timezone.localtime().date()
        end_date = self.stage_end_date or current_date
        return (end_date - self.stage_start_date).days
    
    @property
    def days_to_harvest(self):
        """Calculate days remaining to expected harvest"""
        if not self.expected_harvest_date:
            return None
        from django.utils import timezone
        current_date = timezone.localtime().date()
        delta = self.expected_harvest_date - current_date
        return delta.days
    
    @property
    def yield_efficiency(self):
        """Calculate yield efficiency percentage"""
        if not self.expected_yield or not self.actual_yield:
            return None
        return round((float(self.actual_yield) / float(self.expected_yield)) * 100, 2)
    
    @property
    def is_overdue(self):
        """Check if harvest is overdue"""
        if not self.expected_harvest_date or self.actual_harvest_date:
            return False
        from django.utils import timezone
        current_date = timezone.localtime().date()
        return current_date > self.expected_harvest_date

class Fertigation(models.Model):
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='fertigations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    crop_stage = models.ForeignKey(CropStage, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Basic Information
    crop_zone_name = models.CharField(max_length=200)
    date_time = models.DateTimeField()
    operator_name = models.CharField(max_length=100)
    remarks = models.TextField(blank=True, null=True)
    
    # Technical Measurements
    ec_before = models.DecimalField(max_digits=5, decimal_places=2, help_text="EC Before (mS/cm)")
    ph_before = models.DecimalField(max_digits=4, decimal_places=2, help_text="pH Before")
    ec_after = models.DecimalField(max_digits=5, decimal_places=2, help_text="EC After (mS/cm)")
    ph_after = models.DecimalField(max_digits=4, decimal_places=2, help_text="pH After")
    water_volume = models.DecimalField(max_digits=8, decimal_places=2, help_text="Water Volume (L)")
    
    # Nutrients Used (JSON field to store multiple nutrients)
    nutrients_used = models.JSONField(default=list, help_text="List of nutrients with product name and quantity")
    
    # Scheduling
    is_scheduled = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    scheduled_date = models.DateTimeField(null=True, blank=True)
    
    # Photo Attachment
    image_data = models.TextField(blank=True, null=True)  # Base64 encoded image
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_time', '-created_at']
    
    def __str__(self):
        return f"{self.crop_zone_name} - {self.date_time.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def ec_change(self):
        return float(self.ec_after - self.ec_before)
    
    @property
    def ph_change(self):
        return float(self.ph_after - self.ph_before)
    
    @property
    def total_nutrients_cost(self):
        """Calculate total cost if cost is provided in nutrients"""
        total = 0
        for nutrient in self.nutrients_used:
            if 'cost' in nutrient:
                total += float(nutrient.get('cost', 0))
        return total




class Worker(models.Model):
    EMPLOYMENT_TYPES = (
        ('permanent', 'Permanent'),
        ('temporary', 'Temporary'),
    )
    
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='workers')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='managed_workers')
    name = models.CharField(max_length=200)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPES)
    wage_per_day = models.DecimalField(max_digits=8, decimal_places=2, help_text="Daily wage amount")
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['user', 'farm']),
            models.Index(fields=['employment_type']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_employment_type_display()}) - {self.farm.name}"

class WorkerTask(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('issue', 'Issue'),
    )
    
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='worker_tasks', null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_worker_tasks', null=True, blank=True)
    task_description = models.TextField(help_text="Description of the assigned task")
    assigned_date = models.DateField()
    due_date = models.DateField(blank=True, null=True, help_text="Expected completion date")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    remarks = models.TextField(blank=True, null=True, help_text="Additional notes or comments")
    completion_notes = models.TextField(blank=True, null=True, help_text="Notes when task is completed")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-assigned_date', '-created_at']
        indexes = [
            models.Index(fields=['user', '-assigned_date']),
            models.Index(fields=['worker', 'status']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.worker.name} - {self.task_description[:50]}"

class IssueReport(models.Model):
    ISSUE_TYPE_CHOICES = (
        ('pest', 'Pest'),
        ('disease', 'Disease'),
        ('nutrient_deficiency', 'Nutrient Deficiency'),
        ('equipment_malfunction', 'Equipment Malfunction'),
        ('water_leak', 'Water Leak'),
        ('other', 'Other'),
    )
    
    SEVERITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )
    
    STATUS_CHOICES = (
        ('reported', 'Reported'),
        ('under_review', 'Under Review'),
        ('resolved', 'Resolved'),
    )
    
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='issue_reports', null=True, blank=True)
    farm_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='issue_reports')
    agronomist_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_issues', null=True, blank=True)
    crop_zone = models.CharField(max_length=200, blank=True, null=True)
    issue_type = models.CharField(max_length=50, choices=ISSUE_TYPE_CHOICES)
    description = models.TextField()
    photo_evidence = models.ImageField(upload_to='issue_reports/', blank=True, null=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='reported')
    resolution_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['farm_user', '-created_at']),
            models.Index(fields=['agronomist_user']),
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
        ]
    
    def __str__(self):
        return f"Issue #{self.id} - {self.get_issue_type_display()} - {self.severity}"


class AgronomistNotification(models.Model):
    """
    Separate notification model for agronomists that persists independently
    """
    NOTIFICATION_TYPES = (
        ('daily_task', 'Daily Task Submission'),
        ('issue_report', 'Issue Report'),
        ('farm_user_created', 'Farm User Created'),
        ('farm_created', 'Farm Created'),
        ('system_alert', 'System Alert'),
        ('general', 'General'),
    )
    
    agronomist_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='agronomist_notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='general')
    
    # Source information (who triggered this notification)
    source_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='triggered_agronomist_notifications')
    source_farm = models.ForeignKey(Farm, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Reference to original objects
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    related_model_name = models.CharField(max_length=50, null=True, blank=True)  # e.g., 'IssueReport', 'DailyTask'
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['agronomist_user', '-created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['is_read']),
        ]
    
    def __str__(self):
        return f"Agronomist Notification: {self.title} - {self.agronomist_user.username}"

class Expenditure(models.Model):
    CATEGORY_CHOICES = (
        ('seeds_plants', 'Seeds/Plants'),
        ('fertilizers', 'Fertilizers'),
        ('pesticides', 'Pesticides/Chemicals'),
        ('equipment', 'Equipment/Tools'),
        ('labor', 'Labor'),
        ('irrigation', 'Irrigation/Water'),
        ('fuel', 'Fuel'),
        ('maintenance', 'Maintenance'),
        ('transportation', 'Transportation'),
        ('utilities', 'Utilities'),
        ('packaging', 'Packaging'),
        ('marketing', 'Marketing'),
        ('others', 'Others'),
    )
    
    PAYMENT_METHOD_CHOICES = (
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('upi', 'UPI'),
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('cheque', 'Cheque'),
        ('others', 'Others'),
    )
    
    # Basic Information
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='expenditures')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farm_expenditures')
    expense_title = models.CharField(max_length=200, help_text="Brief description of the expense")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, help_text="Type of expense")
    
    # Financial Details
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Amount spent")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, help_text="How the payment was made")
    
    # Date & Notes
    expense_date = models.DateField(help_text="Date when the expense was made")
    notes = models.TextField(blank=True, null=True, help_text="Additional notes or details")
    
    # Receipt/Bill Information (optional)
    bill_number = models.CharField(max_length=100, blank=True, null=True, help_text="Bill/Invoice number")
    vendor_name = models.CharField(max_length=200, blank=True, null=True, help_text="Supplier/Vendor name")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-expense_date', '-created_at']
        indexes = [
            models.Index(fields=['farm', '-expense_date']),
            models.Index(fields=['user', '-expense_date']),
            models.Index(fields=['category']),
            models.Index(fields=['payment_method']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.expense_title} - ₹{self.amount} - {self.expense_date}"
    
    @property
    def amount_display(self):
        return f"₹{self.amount:,.2f}"

class Sale(models.Model):
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('partial', 'Partial'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
    )
    
    UNIT_CHOICES = (
        ('kg', 'Kilogram (kg)'),
        ('gram', 'Gram (g)'),
        ('ton', 'Ton'),
        ('piece', 'Piece'),
        ('box', 'Box'),
        ('bag', 'Bag'),
        ('crate', 'Crate'),
        ('bunch', 'Bunch'),
    )
    
    # Basic Information
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='sales')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farm_sales')
    
    # Crop Information
    crop_name = models.CharField(max_length=200, help_text="Name of the crop sold")
    batch_code = models.CharField(max_length=100, help_text="Unique batch identifier for traceability")
    
    # Sale Details
    quantity_sold = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, help_text="Quantity of crop sold")
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='kg', help_text="Unit of measurement")
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Price per unit")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total sale amount")
    
    # Buyer Information
    buyer_name = models.CharField(max_length=200, help_text="Name of the buyer")
    buyer_contact = models.CharField(max_length=20, blank=True, null=True, help_text="Buyer contact number")
    buyer_address = models.TextField(blank=True, null=True, help_text="Buyer address")
    
    # Sale Transaction Details
    sale_date = models.DateField(help_text="Date when the sale was made")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_due_date = models.DateField(blank=True, null=True, help_text="Expected payment completion date")
    amount_received = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Amount already received")
    
    # Additional Information
    quality_grade = models.CharField(max_length=50, blank=True, null=True, help_text="Quality grade of the crop")
    transportation_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Transportation cost")
    commission_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Commission/brokerage amount")
    notes = models.TextField(blank=True, null=True, help_text="Additional sale notes")
    
    # Invoice Details
    invoice_number = models.CharField(max_length=100, blank=True, null=True, help_text="Invoice/bill number")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-sale_date', '-created_at']
        indexes = [
            models.Index(fields=['farm', '-sale_date']),
            models.Index(fields=['user', '-sale_date']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['crop_name']),
            models.Index(fields=['buyer_name']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.crop_name} ({self.batch_code}) - {self.buyer_name} - ₹{self.total_amount}"
    
    @property
    def total_amount_display(self):
        return f"₹{self.total_amount:,.2f}"
    
    @property
    def price_per_unit_display(self):
        return f"₹{self.price_per_unit:,.2f}/{self.get_unit_display()}"
    
    @property
    def remaining_amount(self):
        return self.total_amount - self.amount_received
    
    @property
    def remaining_amount_display(self):
        return f"₹{self.remaining_amount:,.2f}"
    
    @property
    def payment_completion_percentage(self):
        if self.total_amount > 0:
            return round((self.amount_received / self.total_amount) * 100, 2)
        return 0
    
    @property
    def net_amount(self):
        """Net amount after deducting transportation and commission"""
        return self.total_amount - self.transportation_cost - self.commission_amount
    
    @property
    def net_amount_display(self):
        return f"₹{self.net_amount:,.2f}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate total_amount if both quantity and price are provided
        if self.quantity_sold and self.price_per_unit:
            self.total_amount = self.quantity_sold * self.price_per_unit
        else:
            # Set default total_amount if not calculated
            if not self.total_amount:
                self.total_amount = 0
        super().save(*args, **kwargs)

class PlantDiseasePrediction(models.Model):
    DISEASE_STATUS_CHOICES = (
        ('healthy', 'Healthy'),
        ('diseased', 'Diseased'),
        ('uncertain', 'Uncertain'),
    )

    CONFIDENCE_LEVEL_CHOICES = (
        ('high', 'High (>80%)'),
        ('medium', 'Medium (50-80%)'),
        ('low', 'Low (<50%)'),
    )

    # Basic Information
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='disease_predictions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='disease_predictions')
    crop_stage = models.ForeignKey(CropStage, on_delete=models.SET_NULL, null=True, blank=True, related_name='disease_predictions')

    # Image Data
    image_data = models.TextField(help_text="Base64 encoded plant image")
    image_filename = models.CharField(max_length=255, blank=True, null=True, help_text="Original filename")
    image_size_bytes = models.PositiveIntegerField(null=True, blank=True, help_text="Image size in bytes")
    image_width = models.PositiveIntegerField(null=True, blank=True, help_text="Image width in pixels")
    image_height = models.PositiveIntegerField(null=True, blank=True, help_text="Image height in pixels")
    image_format = models.CharField(max_length=10, blank=True, null=True, help_text="Image format (jpeg, png, etc.)")

    # AI Analysis Results
    disease_status = models.CharField(max_length=20, choices=DISEASE_STATUS_CHOICES, help_text="Overall health status")
    diseases_detected = models.JSONField(default=list, help_text="List of diseases detected with details")
    confidence_level = models.CharField(max_length=10, choices=CONFIDENCE_LEVEL_CHOICES, help_text="AI confidence level")
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Numerical confidence score (0-100)")

    # AI Response
    ai_analysis = models.TextField(help_text="Complete AI analysis response")
    remedies_suggested = models.TextField(blank=True, null=True, help_text="Recommended treatments and remedies")
    prevention_tips = models.TextField(blank=True, null=True, help_text="Prevention tips for future")

    # Additional Metadata
    analysis_timestamp = models.DateTimeField(auto_now_add=True, help_text="When AI analysis was performed")
    gemini_model_version = models.CharField(max_length=50, default='gemini-2.5-pro', help_text="Gemini AI model used")
    processing_time_ms = models.PositiveIntegerField(null=True, blank=True, help_text="Time taken for AI processing")

    # User Notes
    user_notes = models.TextField(blank=True, null=True, help_text="User's additional notes")
    location_in_farm = models.CharField(max_length=200, blank=True, null=True, help_text="Specific location where image was taken")

    # Status and Actions
    is_resolved = models.BooleanField(default=False, help_text="Whether the issue has been resolved")
    actions_taken = models.TextField(blank=True, null=True, help_text="Actions taken based on the prediction")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-analysis_timestamp', '-created_at']
        indexes = [
            models.Index(fields=['farm', '-analysis_timestamp']),
            models.Index(fields=['user', '-analysis_timestamp']),
            models.Index(fields=['disease_status']),
            models.Index(fields=['confidence_level']),
            models.Index(fields=['is_resolved']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        status_display = f"{self.get_disease_status_display()}"
        if self.diseases_detected:
            disease_names = [d.get('name', 'Unknown') for d in self.diseases_detected]
            status_display += f" - {', '.join(disease_names[:2])}"
        return f"{self.farm.name} - {status_display} - {self.analysis_timestamp.strftime('%Y-%m-%d %H:%M')}"

    @property
    def primary_disease(self):
        """Get the primary/most confident disease detected"""
        if not self.diseases_detected:
            return None
        return max(self.diseases_detected, key=lambda x: x.get('confidence', 0))

    @property
    def disease_count(self):
        """Count of diseases detected"""
        return len(self.diseases_detected) if self.diseases_detected else 0

    @property
    def severity_level(self):
        """Determine severity based on confidence and disease count"""
        if self.disease_status == 'healthy':
            return 'low'
        elif self.confidence_level == 'high' and self.disease_count > 1:
            return 'high'
        elif self.confidence_level in ['medium', 'high']:
            return 'medium'
        else:
            return 'low'

class FarmTask(models.Model):
    """
    Tasks that farm users can create and assign to themselves for farm management.
    This is separate from DailyTask (routine operations) and WorkerTask (tasks assigned to workers).
    Ensures complete data isolation - farm users can only see/manage tasks for their assigned farms.
    """
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    )

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='farm_tasks')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farm_tasks')
    title = models.CharField(max_length=300, help_text="Brief title of the task")
    description = models.TextField(blank=True, null=True, help_text="Detailed description of the task")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField(blank=True, null=True, help_text="Expected completion date")
    completed_at = models.DateTimeField(blank=True, null=True, help_text="When the task was marked as completed")
    notes = models.TextField(blank=True, null=True, help_text="Additional notes or comments")
    image_data = models.TextField(blank=True, null=True, help_text="Base64 encoded image evidence")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['farm', 'user', '-created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['farm', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.farm.name} - {self.user.username}"

@receiver(post_delete, sender=Farm)
def delete_farm_users(sender, instance, **kwargs):
    for user in instance.users.all():
        user.delete()