from rest_framework import serializers
from .models import Farm, DailyTask, Notification, SprayIrrigationLog, SpraySchedule, CropStage, Fertigation, Worker, WorkerTask, IssueReport, AgronomistNotification, Expenditure, Sale, PlantDiseasePrediction, FarmTask
from accounts.serializers import UserSerializer

class FarmSerializer(serializers.ModelSerializer):
    users_details = UserSerializer(source='users', many=True, read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = Farm
        fields = ('id', 'name', 'location', 'size_in_acres', 'description', 'users', 
                 'users_details', 'created_by', 'created_by_details', 'is_active', 
                 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

class CreateFarmSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farm
        fields = ('name', 'location', 'size_in_acres', 'description')

class DailyTaskSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = DailyTask
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

class CreateDailyTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTask
        exclude = ('user', 'created_at', 'updated_at')

class NotificationSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    is_overdue = serializers.ReadOnlyField()
    time_until_due = serializers.ReadOnlyField()
    
    class Meta:
        model = Notification
        fields = ('id', 'title', 'message', 'notification_type', 'farm', 'farm_name', 
                 'user', 'user_name', 'user_full_name', 'is_read', 'due_date', 
                 'is_overdue', 'time_until_due', 'related_object_id', 'created_at')
        read_only_fields = ('id', 'created_at', 'is_overdue', 'time_until_due')
    
    def get_user_full_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        return None


class AgronomistNotificationSerializer(serializers.ModelSerializer):
    source_user_name = serializers.CharField(source='source_user.username', read_only=True)
    source_farm_name = serializers.CharField(source='source_farm.name', read_only=True)
    source_user_full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AgronomistNotification
        fields = ('id', 'title', 'message', 'notification_type', 'source_user', 
                 'source_user_name', 'source_user_full_name', 'source_farm', 
                 'source_farm_name', 'related_object_id', 'related_model_name',
                 'is_read', 'created_at')
        read_only_fields = ('id', 'created_at')
    
    def get_source_user_full_name(self, obj):
        if obj.source_user:
            full_name = f"{obj.source_user.first_name} {obj.source_user.last_name}".strip()
            return full_name if full_name else obj.source_user.username
        return None


class SprayIrrigationLogSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    crop_stage_info = serializers.SerializerMethodField()
    has_image = serializers.SerializerMethodField()
    
    class Meta:
        model = SprayIrrigationLog
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def get_has_image(self, obj):
        return bool(obj.image_data)
    
    def get_crop_stage_info(self, obj):
        if obj.crop_stage:
            return {
                'id': obj.crop_stage.id,
                'crop_name': obj.crop_stage.crop_name,
                'variety': obj.crop_stage.variety,
                'batch_code': obj.crop_stage.batch_code,
                'current_stage': obj.crop_stage.current_stage,
                'current_stage_display': obj.crop_stage.get_current_stage_display(),
                'growth_duration_days': obj.crop_stage.growth_duration_days
            }
        return None

class CreateSprayIrrigationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SprayIrrigationLog
        exclude = ('user', 'created_at', 'updated_at')

class CropStageSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    growth_duration_days = serializers.ReadOnlyField()
    days_in_current_stage = serializers.ReadOnlyField()
    days_to_harvest = serializers.ReadOnlyField()
    yield_efficiency = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    health_status_display = serializers.CharField(source='get_health_status_display', read_only=True)
    recent_activities = serializers.SerializerMethodField()
    stage_recommendations = serializers.SerializerMethodField()
    progress_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = CropStage
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def get_recent_activities(self, obj):
        """Get recent spray/irrigation activities for this crop stage"""
        recent_logs = obj.spray_irrigation_logs.order_by('-date')[:5]
        activities = []
        for log in recent_logs:
            activity = {
                'id': log.id,
                'date': log.date,
                'activity_type': log.activity_type,
                'activity_type_display': log.get_activity_type_display(),
            }
            
            if log.activity_type == 'spray':
                activity.update({
                    'chemical_name': log.chemical_name,
                    'dosage': log.dosage,
                    'quantity': log.quantity
                })
            else:  # irrigation
                activity.update({
                    'irrigation_timing': log.irrigation_timing,
                    'irrigation_volume': log.irrigation_volume
                })
            
            if log.notes:
                activity['notes'] = log.notes[:100] + '...' if len(log.notes) > 100 else log.notes
            
            activities.append(activity)
        
        return activities
    
    def get_stage_recommendations(self, obj):
        """Get recommendations based on current growth stage"""
        stage = obj.current_stage
        growth_days = obj.growth_duration_days
        
        recommendations = {
            'spray': [],
            'irrigation': [],
            'general': []
        }
        
        if stage == 'germination':
            recommendations['irrigation'].append('Light, frequent watering to keep soil moist')
            recommendations['general'].append('Maintain consistent temperature and humidity')
            recommendations['spray'].append('Avoid chemical sprays during germination')
            
        elif stage == 'seedling':
            recommendations['irrigation'].append('Water 2-3 times daily with fine mist')
            recommendations['spray'].append('Light organic fertilizer spray if needed')
            recommendations['general'].append('Provide adequate light and ventilation')
            
        elif stage == 'vegetative':
            recommendations['irrigation'].append('Deep watering 1-2 times daily')
            recommendations['spray'].append('Nitrogen-rich fertilizer spray weekly')
            recommendations['general'].append('Prune and train for optimal growth')
            
        elif stage == 'flowering':
            recommendations['irrigation'].append('Consistent moisture, avoid water stress')
            recommendations['spray'].append('Phosphorus and potassium-rich fertilizers')
            recommendations['general'].append('Monitor for pests and diseases')
            
        elif stage == 'fruiting':
            recommendations['irrigation'].append('Maintain steady moisture levels')
            recommendations['spray'].append('Calcium and micronutrient sprays')
            recommendations['general'].append('Support heavy branches if needed')
            
        elif stage == 'harvest':
            recommendations['irrigation'].append('Reduce watering before harvest')
            recommendations['general'].append('Harvest at optimal maturity')
            recommendations['spray'].append('Stop chemical applications before harvest')
        
        return recommendations
    
    def get_progress_summary(self, obj):
        """Get comprehensive progress summary for crop stage"""
        from django.utils import timezone
        
        summary = {
            'timeline_status': 'on_track',
            'health_alert': False,
            'stage_progress': 0,
            'yield_status': 'unknown',
            'next_action': None,
            'alerts': []
        }
        
        current_date = timezone.localtime().date()
        
        # Timeline status
        if obj.expected_harvest_date:
            if obj.is_overdue:
                summary['timeline_status'] = 'overdue'
                summary['alerts'].append('Harvest is overdue')
            elif obj.days_to_harvest is not None:
                if obj.days_to_harvest <= 3:
                    summary['timeline_status'] = 'due_soon'
                    summary['alerts'].append(f'Harvest due in {obj.days_to_harvest} days')
        
        # Health alerts
        if obj.health_status == 'needs_attention':
            summary['health_alert'] = True
            summary['alerts'].append('Crop needs immediate attention')
        elif obj.health_status == 'moderate':
            summary['alerts'].append('Monitor crop health closely')
        
        # Stage progress calculation
        if obj.stage_start_date and obj.stage_end_date:
            total_stage_days = (obj.stage_end_date - obj.stage_start_date).days
            days_passed = (current_date - obj.stage_start_date).days
            if total_stage_days > 0:
                summary['stage_progress'] = min(100, max(0, int((days_passed / total_stage_days) * 100)))
        
        # Yield status
        if obj.expected_yield:
            if obj.actual_yield:
                efficiency = obj.yield_efficiency
                if efficiency >= 90:
                    summary['yield_status'] = 'excellent'
                elif efficiency >= 75:
                    summary['yield_status'] = 'good'
                elif efficiency >= 60:
                    summary['yield_status'] = 'fair'
                else:
                    summary['yield_status'] = 'poor'
            else:
                summary['yield_status'] = 'pending'
        
        # Next action recommendation
        stage_actions = {
            'germination': 'Monitor moisture and temperature',
            'seedling': 'Ensure adequate light and ventilation',
            'vegetative': 'Apply nitrogen fertilizer and prune',
            'flowering': 'Monitor for pests and diseases',
            'fruiting': 'Support branches and maintain watering',
            'harvest': 'Plan harvest schedule'
        }
        summary['next_action'] = stage_actions.get(obj.current_stage, 'Continue monitoring')
        
        return summary

class CreateCropStageSerializer(serializers.ModelSerializer):
    health_status = serializers.CharField(default='healthy', required=False)
    stage_start_date = serializers.DateField(required=False, allow_null=True)
    stage_end_date = serializers.DateField(required=False, allow_null=True)
    sowing_date = serializers.DateField(required=False, allow_null=True)
    actual_harvest_date = serializers.DateField(required=False, allow_null=True)
    expected_yield = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)
    actual_yield = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)
    losses = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)
    farm_section = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    area = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)
    number_of_plants = serializers.IntegerField(required=False, allow_null=True)
    issues_reported = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    expected_harvest_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = CropStage
        exclude = ('user', 'created_at', 'updated_at')
    
    def create(self, validated_data):
        # Ensure health_status has a default value
        if 'health_status' not in validated_data or validated_data['health_status'] in [None, '']:
            validated_data['health_status'] = 'healthy'
        
        # Handle post-harvest fields - ensure they can be empty
        post_harvest_fields = ['actual_harvest_date', 'actual_yield', 'losses']
        for field in post_harvest_fields:
            if field in validated_data and validated_data[field] in ['', None]:
                validated_data[field] = None
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Ensure health_status has a default value
        if 'health_status' not in validated_data or validated_data['health_status'] in [None, '']:
            validated_data['health_status'] = 'healthy'
        
        # Handle post-harvest fields - ensure they can be empty/null
        post_harvest_fields = ['actual_harvest_date', 'actual_yield', 'losses']
        for field in post_harvest_fields:
            if field in validated_data and validated_data[field] in ['', None]:
                validated_data[field] = None
        
        return super().update(instance, validated_data)

class FertigationSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    crop_stage_info = serializers.SerializerMethodField()
    ec_change = serializers.ReadOnlyField()
    ph_change = serializers.ReadOnlyField()
    total_nutrients_cost = serializers.ReadOnlyField()
    
    class Meta:
        model = Fertigation
        fields = '__all__'
        
    def get_crop_stage_info(self, obj):
        if obj.crop_stage:
            return {
                'id': obj.crop_stage.id,
                'crop_name': obj.crop_stage.crop_name,
                'variety': obj.crop_stage.variety,
                'batch_code': obj.crop_stage.batch_code,
                'current_stage': obj.crop_stage.current_stage,
                'current_stage_display': obj.crop_stage.get_current_stage_display()
            }
        return None

class CreateFertigationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fertigation
        exclude = ('user', 'created_at', 'updated_at')
        
    def validate_nutrients_used(self, value):
        """Validate nutrients_used JSON format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("nutrients_used must be a list")
        
        for nutrient in value:
            if not isinstance(nutrient, dict):
                raise serializers.ValidationError("Each nutrient must be a dictionary")
            
            required_fields = ['product_name', 'quantity']
            for field in required_fields:
                if field not in nutrient:
                    raise serializers.ValidationError(f"Each nutrient must have '{field}' field")
        
        return value
    
    def validate(self, data):
        """Custom validation for fertigation data"""
        # Less strict validation for scheduled fertigations
        status = data.get('status', 'completed')
        
        if status == 'completed':
            # Strict validation for completed fertigations
            # Validate EC values
            if data.get('ec_after', 0) < 0 or data.get('ec_before', 0) < 0:
                raise serializers.ValidationError("EC values cannot be negative")
            
            # Validate pH values (typical range 0-14)
            for ph_field in ['ph_before', 'ph_after']:
                ph_value = data.get(ph_field, 7)
                if ph_value < 0 or ph_value > 14:
                    raise serializers.ValidationError(f"{ph_field} must be between 0 and 14")
            
            # Validate water volume
            if data.get('water_volume', 0) <= 0:
                raise serializers.ValidationError("Water volume must be greater than 0")
        
        else:
            # More lenient validation for scheduled fertigations
            # Set default values for scheduled fertigations if not provided
            if not data.get('ec_before'):
                data['ec_before'] = 0.0
            if not data.get('ec_after'):
                data['ec_after'] = 0.0
            if not data.get('ph_before'):
                data['ph_before'] = 7.0
            if not data.get('ph_after'):
                data['ph_after'] = 7.0
            if not data.get('water_volume'):
                data['water_volume'] = 0.0
        
        return data



class WorkerSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    employment_type_display = serializers.CharField(source='get_employment_type_display', read_only=True)
    active_tasks_count = serializers.SerializerMethodField()
    completed_tasks_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Worker
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def get_active_tasks_count(self, obj):
        return obj.tasks.filter(status__in=['pending', 'issue']).count()
    
    def get_completed_tasks_count(self, obj):
        return obj.tasks.filter(status='completed').count()

class CreateWorkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        exclude = ('user', 'created_at', 'updated_at')

class WorkerTaskSerializer(serializers.ModelSerializer):
    worker_id = serializers.IntegerField(source='worker.id', read_only=True)
    worker_name = serializers.CharField(source='worker.name', read_only=True)
    worker_employment_type = serializers.CharField(source='worker.employment_type', read_only=True)
    worker_wage = serializers.DecimalField(source='worker.wage_per_day', max_digits=8, decimal_places=2, read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    assigned_date_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_since_assigned = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkerTask
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def get_assigned_date_display(self, obj):
        return obj.assigned_date.strftime('%B %d, %Y')
    
    def get_days_since_assigned(self, obj):
        from django.utils import timezone
        today = timezone.localtime().date()
        return (today - obj.assigned_date).days

class CreateWorkerTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerTask
        exclude = ('user', 'created_at', 'updated_at')

class UpdateWorkerTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerTask
        fields = ('status', 'remarks', 'completion_notes')

class IssueReportSerializer(serializers.ModelSerializer):
    issue_type_display = serializers.CharField(source='get_issue_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    agronomist_username = serializers.CharField(source='agronomist_user.username', read_only=True)
    
    class Meta:
        model = IssueReport
        fields = ('id', 'crop_zone', 'issue_type', 'issue_type_display', 'description', 
                 'photo_evidence', 'severity', 'severity_display', 'status', 'status_display',
                 'resolution_notes', 'agronomist_username', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class CreateIssueReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueReport
        fields = ('crop_zone', 'issue_type', 'description', 'photo_evidence', 'severity')
    
    def validate(self, data):
        if not data.get('issue_type'):
            raise serializers.ValidationError("Issue type is required")
        
        if not data.get('description'):
            raise serializers.ValidationError("Description is required")
        
        if not data.get('severity'):
            raise serializers.ValidationError("Severity level is required")
        
        return data

class UpdateIssueReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueReport
        fields = ('status', 'resolution_notes')


class SprayScheduleSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    crop_stage_info = serializers.SerializerMethodField()
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    days_until_harvest_safe = serializers.ReadOnlyField()
    is_phi_complete = serializers.ReadOnlyField()
    is_reminder_due = serializers.ReadOnlyField()
    has_image = serializers.SerializerMethodField()
    
    class Meta:
        model = SpraySchedule
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at', 'spray_id')
    
    def get_has_image(self, obj):
        return bool(obj.image_data)
    
    def get_crop_stage_info(self, obj):
        if obj.crop_stage:
            return {
                'id': obj.crop_stage.id,
                'crop_name': obj.crop_stage.crop_name,
                'variety': obj.crop_stage.variety,
                'batch_code': obj.crop_stage.batch_code,
                'current_stage': obj.crop_stage.current_stage,
                'current_stage_display': obj.crop_stage.get_current_stage_display(),
                'growth_duration_days': obj.crop_stage.growth_duration_days
            }
        return None

class CreateSprayScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpraySchedule
        exclude = ('user', 'created_at', 'updated_at', 'spray_id', 'is_completed', 'completion_date')
    
    def validate(self, data):
        """Custom validation for spray schedule data"""
        # Validate PHI log
        phi_log = data.get('phi_log')
        if phi_log is not None and phi_log < 0:
            raise serializers.ValidationError("Pre-Harvest Interval cannot be negative")
        
        # Validate required fields
        required_fields = ['crop_zone', 'product_used', 'dose_concentration', 'reason', 'worker_name']
        for field in required_fields:
            if not data.get(field):
                raise serializers.ValidationError(f"{field} is required")
        
        # Validate date_time is not in the past for scheduled sprays
        from django.utils import timezone
        date_time = data.get('date_time')
        if date_time and date_time < timezone.now():
            # Allow past dates for completed spray records
            pass
        
        return data

class UpdateSprayScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpraySchedule
        fields = ('is_completed', 'completion_date', 'weather_conditions', 'application_method', 
                 'equipment_used', 'area_covered', 'notes', 'image_data', 'next_spray_reminder')
    
    def validate(self, data):
        """Validation for spray schedule updates"""
        # If marking as completed, set completion_date
        if data.get('is_completed') and not data.get('completion_date'):
            from django.utils import timezone
            data['completion_date'] = timezone.now()
        
        return data

# Expenditure Management Serializers
class ExpenditureSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    amount_display = serializers.CharField(read_only=True)
    expense_date_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Expenditure
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def get_expense_date_display(self, obj):
        return obj.expense_date.strftime('%B %d, %Y')

class CreateExpenditureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expenditure
        exclude = ('user', 'created_at', 'updated_at')
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value

class UpdateExpenditureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expenditure
        fields = ('expense_title', 'category', 'amount', 'payment_method', 'expense_date', 
                 'notes', 'bill_number', 'vendor_name')
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value

# Sale Management Serializers
class SaleSerializer(serializers.ModelSerializer):
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    total_amount_display = serializers.CharField(read_only=True)
    price_per_unit_display = serializers.CharField(read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining_amount_display = serializers.CharField(read_only=True)
    payment_completion_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    net_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    net_amount_display = serializers.CharField(read_only=True)
    sale_date_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = ('user', 'total_amount', 'created_at', 'updated_at')
    
    def get_sale_date_display(self, obj):
        return obj.sale_date.strftime('%B %d, %Y')

class CreateSaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        exclude = ('user', 'total_amount', 'created_at', 'updated_at')
    
    def validate_quantity_sold(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Quantity sold must be greater than zero")
        return value
    
    def validate_price_per_unit(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Price per unit must be greater than zero")
        return value
    
    def validate_amount_received(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Amount received cannot be negative")
        return value
    
    def validate(self, data):
        # Only validate if both quantity and price are provided
        quantity = data.get('quantity_sold', 0)
        price = data.get('price_per_unit', 0)
        amount_received = data.get('amount_received', 0)
        
        if quantity and price:
            total_amount = quantity * price
            if amount_received and amount_received > total_amount:
                raise serializers.ValidationError("Amount received cannot be greater than total sale amount")
        
        return data

class UpdateSaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = ('crop_name', 'batch_code', 'quantity_sold', 'unit', 'price_per_unit', 
                 'buyer_name', 'buyer_contact', 'buyer_address', 'sale_date', 
                 'payment_status', 'payment_due_date', 'amount_received', 
                 'quality_grade', 'transportation_cost', 'commission_amount', 
                 'notes', 'invoice_number')
    
    def validate_quantity_sold(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity sold must be greater than zero")
        return value
    
    def validate_price_per_unit(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price per unit must be greater than zero")
        return value
    
    def validate_amount_received(self, value):
        if value < 0:
            raise serializers.ValidationError("Amount received cannot be negative")
        return value

class PlantDiseasePredictionSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    crop_stage_name = serializers.CharField(source='crop_stage.crop_name', read_only=True)
    primary_disease = serializers.ReadOnlyField()
    disease_count = serializers.ReadOnlyField()
    severity_level = serializers.ReadOnlyField()

    class Meta:
        model = PlantDiseasePrediction
        fields = ('id', 'farm', 'farm_name', 'user', 'user_name', 'user_full_name',
                 'crop_stage', 'crop_stage_name', 'image_data', 'image_filename',
                 'image_size_bytes', 'image_width', 'image_height', 'image_format',
                 'disease_status', 'diseases_detected', 'confidence_level', 'confidence_score',
                 'ai_analysis', 'remedies_suggested', 'prevention_tips',
                 'analysis_timestamp', 'gemini_model_version', 'processing_time_ms',
                 'user_notes', 'location_in_farm', 'is_resolved', 'actions_taken',
                 'primary_disease', 'disease_count', 'severity_level',
                 'created_at', 'updated_at')
        read_only_fields = ('id', 'analysis_timestamp', 'processing_time_ms',
                           'primary_disease', 'disease_count', 'severity_level',
                           'created_at', 'updated_at')

    def get_user_full_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        return ''

class CreatePlantDiseasePredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlantDiseasePrediction
        fields = ('farm', 'crop_stage', 'image_data', 'image_filename',
                 'location_in_farm', 'user_notes')

    def validate_image_data(self, value):
        if not value:
            raise serializers.ValidationError("Image data is required")

        # Basic validation for base64 image data
        if not value.startswith('data:image/'):
            raise serializers.ValidationError("Invalid image data format")

        return value

class UpdatePlantDiseasePredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlantDiseasePrediction
        fields = ('user_notes', 'location_in_farm', 'is_resolved', 'actions_taken')

class PlantDiseasePredictionListSerializer(serializers.ModelSerializer):
    """Optimized serializer for listing multiple predictions"""
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    crop_stage_name = serializers.CharField(source='crop_stage.crop_name', read_only=True)
    primary_disease_name = serializers.SerializerMethodField()
    disease_count = serializers.ReadOnlyField()
    severity_level = serializers.ReadOnlyField()

    class Meta:
        model = PlantDiseasePrediction
        fields = ('id', 'farm_name', 'user_name', 'crop_stage_name', 'image_filename',
                 'image_format', 'image_width', 'image_height', 'image_size_bytes',
                 'disease_status', 'confidence_level', 'confidence_score',
                 'primary_disease_name', 'disease_count', 'severity_level',
                 'location_in_farm', 'is_resolved', 'analysis_timestamp')

    def get_primary_disease_name(self, obj):
        primary = obj.primary_disease
        return primary.get('name', 'None') if primary else 'None'




class FarmTaskSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = FarmTask
        fields = ('id', 'farm', 'farm_name', 'user', 'user_name', 'user_full_name',
                 'title', 'description', 'priority', 'priority_display',
                 'status', 'status_display', 'due_date', 'completed_at', 'notes',
                 'image_data', 'is_overdue', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'completed_at', 'created_at', 'updated_at')
    
    def get_user_full_name(self, obj):
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        return ''
    
    def get_is_overdue(self, obj):
        if obj.due_date and obj.status != 'completed':
            from datetime import date
            return obj.due_date < date.today()
        return False

class CreateFarmTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmTask
        exclude = ('user', 'completed_at', 'created_at', 'updated_at')
    
    def validate(self, data):
        # Ensure the due_date is not in the past (optional validation)
        if 'due_date' in data and data['due_date']:
            from datetime import date
            if data['due_date'] < date.today():
                # Allow past dates, just log a warning
                pass
        return data

