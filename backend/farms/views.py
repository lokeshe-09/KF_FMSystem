import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Farm, DailyTask, Notification, SprayIrrigationLog, SpraySchedule, CropStage, Fertigation, Worker, WorkerTask, IssueReport, AgronomistNotification, Expenditure, Sale, PlantDiseasePrediction
from django.contrib.auth import get_user_model
User = get_user_model()
from .serializers import (
    FarmSerializer, CreateFarmSerializer, DailyTaskSerializer, CreateDailyTaskSerializer, 
    NotificationSerializer, SprayIrrigationLogSerializer, CreateSprayIrrigationLogSerializer, 
    SprayScheduleSerializer, CreateSprayScheduleSerializer, UpdateSprayScheduleSerializer,
    CropStageSerializer, CreateCropStageSerializer, FertigationSerializer, CreateFertigationSerializer,
    WorkerSerializer, CreateWorkerSerializer, WorkerTaskSerializer, CreateWorkerTaskSerializer, UpdateWorkerTaskSerializer,
    IssueReportSerializer, CreateIssueReportSerializer, UpdateIssueReportSerializer,
    AgronomistNotificationSerializer, ExpenditureSerializer, CreateExpenditureSerializer, UpdateExpenditureSerializer,
    SaleSerializer, CreateSaleSerializer, UpdateSaleSerializer,
    PlantDiseasePredictionSerializer, CreatePlantDiseasePredictionSerializer,
    UpdatePlantDiseasePredictionSerializer, PlantDiseasePredictionListSerializer
)
from datetime import date
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


def create_agronomist_notification(agronomist_user, title, message, notification_type, source_user=None, source_farm=None, related_object_id=None, related_model_name=None):
    """
    Helper function to create persistent agronomist notifications
    """
    return AgronomistNotification.objects.create(
        agronomist_user=agronomist_user,
        title=title,
        message=message,
        notification_type=notification_type,
        source_user=source_user,
        source_farm=source_farm,
        related_object_id=related_object_id,
        related_model_name=related_model_name
    )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_farm(request):
    if not (request.user.user_type == 'agronomist' or request.user.is_superuser):
        return Response({'error': 'Only agronomists and superusers can create farms'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = CreateFarmSerializer(data=request.data)
    if serializer.is_valid():
        farm = serializer.save(created_by=request.user)
        return Response(FarmSerializer(farm).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farms(request):
    
    if request.user.is_superuser:
        farms = Farm.objects.filter(is_active=True)
    elif request.user.user_type == 'agronomist':
        farms = Farm.objects.filter(created_by=request.user, is_active=True)
    else:
        # Farm users access farms through the assigned_farms relationship
        farms = request.user.assigned_farms.filter(is_active=True)
    
    serializer = FarmSerializer(farms, many=True)
    return Response(serializer.data)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_detail(request, farm_id):
        
    try:
        if request.user.is_superuser:
            farm = Farm.objects.get(id=farm_id, is_active=True)
        elif request.user.user_type == 'agronomist':
            farm = Farm.objects.get(id=farm_id, created_by=request.user, is_active=True)
        else:
            # Farm users access farms through the assigned_farms relationship
            farm = request.user.assigned_farms.get(id=farm_id, is_active=True)
    except Farm.DoesNotExist:
        return Response({'error': 'Farm not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = FarmSerializer(farm)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        if not (request.user.user_type == 'agronomist' or request.user.is_superuser):
            return Response({'error': 'Only agronomists and superusers can update farms'}, status=status.HTTP_403_FORBIDDEN)
        
        # Additional check for agronomists - they can only update their own farms
        if request.user.user_type == 'agronomist' and farm.created_by != request.user:
            return Response({'error': 'You can only update farms you created'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CreateFarmSerializer(farm, data=request.data, partial=True)
        if serializer.is_valid():
            farm = serializer.save()
            return Response(FarmSerializer(farm).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if not (request.user.user_type == 'agronomist' or request.user.is_superuser):
            return Response({'error': 'Only agronomists and superusers can delete farms'}, status=status.HTTP_403_FORBIDDEN)
        
        # Additional check for agronomists - they can only delete their own farms
        if request.user.user_type == 'agronomist' and farm.created_by != request.user:
            return Response({'error': 'You can only delete farms you created'}, status=status.HTTP_403_FORBIDDEN)
        
        farm.is_active = False
        farm.save()
        return Response({'message': 'Farm deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def daily_tasks(request):
    
    if request.method == 'GET':
        # Get today's task or task history
        today = date.today()
        if 'date' in request.query_params:
            try:
                task_date = request.query_params['date']
                tasks = DailyTask.objects.filter(user=request.user, date=task_date)
            except:
                tasks = DailyTask.objects.filter(user=request.user, date=today)
        elif 'history' in request.query_params:
            tasks = DailyTask.objects.filter(user=request.user).order_by('-created_at')
        else:
            tasks = DailyTask.objects.filter(user=request.user, date=today)
        
        serializer = DailyTaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Always create a new task entry with current timestamp
        farm_id = request.data.get('farm')
        
        # Verify user has access to this farm
        try:
            if request.user.is_superuser:
                farm = Farm.objects.get(id=farm_id, is_active=True)
            elif request.user.user_type == 'agronomist':
                farm = Farm.objects.get(id=farm_id, created_by=request.user, is_active=True)
            else:
                farm = request.user.assigned_farms.get(id=farm_id, is_active=True)
        except Farm.DoesNotExist:
            return Response({'error': 'You do not have access to this farm'}, status=status.HTTP_403_FORBIDDEN)
        
        # Create new task entry every time
        task = DailyTask.objects.create(
            farm=farm,
            user=request.user,
            date=date.today(),
            farm_hygiene=request.data.get('farm_hygiene', False),
            disease_pest_check=request.data.get('disease_pest_check', False),
            daily_crop_update=request.data.get('daily_crop_update', False),
            trellising=request.data.get('trellising', False),
            spraying=request.data.get('spraying', False),
            cleaning=request.data.get('cleaning', False),
            pruning=request.data.get('pruning', False),
            main_tank_ec=request.data.get('main_tank_ec') or None,
            main_tank_ph=request.data.get('main_tank_ph') or None,
            dripper_ec=request.data.get('dripper_ec') or None,
            dripper_ph=request.data.get('dripper_ph') or None,
        )
        
        # Create notification in database and send real-time WebSocket notification
        user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        # Find the agronomist who created this farm user first
        agronomist_user = request.user.created_by if hasattr(request.user, 'created_by') and request.user.created_by else None
        
        # Only create notification if agronomist exists
        if agronomist_user and agronomist_user.user_type in ['agronomist', 'superuser']:
            title = "Daily Task Submitted"
            message = f"{user_name} submitted daily tasks for {farm.name} at {task.created_at.strftime('%H:%M:%S')}"
            
            # Create both regular notification (for user) and persistent agronomist notification
            notification = Notification.objects.create(
                title=title,
                message=message,
                notification_type='daily_task',
                farm=farm,
                user=agronomist_user
            )
            
            # Create persistent agronomist notification
            agronomist_notification = create_agronomist_notification(
                agronomist_user=agronomist_user,
                title=title,
                message=message,
                notification_type='daily_task',
                source_user=request.user,
                source_farm=farm,
                related_object_id=task.id,
                related_model_name='DailyTask'
            )
            
            # Send real-time WebSocket notification to the specific agronomist
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    notification_data = {
                        'type': 'notification_message',
                        'title': title,
                        'message': message,
                        'notification_type': 'daily_task',
                        'notification_id': agronomist_notification.id,
                        'farm_id': farm.id,
                        'farm_name': farm.name,
                        'user_id': request.user.id,
                        'user_name': user_name,
                        'timestamp': agronomist_notification.created_at.isoformat()
                    }
                    
                    # Send to specific agronomist who created this farm user
                    specific_agronomist_group = f'agronomist_{agronomist_user.id}_notifications'
                    async_to_sync(channel_layer.group_send)(specific_agronomist_group, notification_data)
                    
                    # Also send to general agronomist notifications group (fallback)
                    async_to_sync(channel_layer.group_send)('agronomist_notifications', notification_data)
                    
                except Exception as e:
                    pass
            
        return Response(DailyTaskSerializer(task).data, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def daily_task_detail(request, task_id):
    """Get, update or delete a specific daily task (legacy endpoint for agronomist/superuser)"""
    try:
        if request.user.is_superuser:
            task = DailyTask.objects.get(id=task_id)
        elif request.user.user_type == 'agronomist':
            # Agronomist can only access tasks from farms they created
            task = DailyTask.objects.get(id=task_id, farm__created_by=request.user)
        else:
            # Farm users can only access their own tasks
            task = DailyTask.objects.get(id=task_id, user=request.user)
    except DailyTask.DoesNotExist:
        return Response({'error': 'Daily task not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = DailyTaskSerializer(task)
        return Response(serializer.data)

    elif request.method == 'PUT':
        # Update existing task
        for field in ['farm_hygiene', 'disease_pest_check', 'daily_crop_update',
                      'trellising', 'spraying', 'cleaning', 'pruning']:
            if field in request.data:
                setattr(task, field, request.data.get(field, False))

        # Update EC/pH measurements
        for field in ['main_tank_ec', 'main_tank_ph', 'dripper_ec', 'dripper_ph']:
            if field in request.data:
                value = request.data.get(field)
                setattr(task, field, value if value else None)

        task.save()

        # Create notification for agronomist (farm creator) only if task belongs to a farm user
        if task.user.user_type == 'farm_user':
            user_name = f"{task.user.first_name} {task.user.last_name}".strip() or task.user.username
            agronomist_user = task.farm.created_by  # Use farm creator as agronomist

            if agronomist_user and agronomist_user.user_type in ['agronomist', 'superuser']:
                # Count completed tasks
                completed_tasks = []
                if task.farm_hygiene:
                    completed_tasks.append("Farm Hygiene")
                if task.disease_pest_check:
                    completed_tasks.append("Disease & Pest Check")
                if task.daily_crop_update:
                    completed_tasks.append("Daily Crop Update")
                if task.trellising:
                    completed_tasks.append("Trellising")
                if task.spraying:
                    completed_tasks.append("Spraying")
                if task.cleaning:
                    completed_tasks.append("Cleaning")
                if task.pruning:
                    completed_tasks.append("Pruning")

                # Check water measurements
                measurements = []
                if task.main_tank_ec or task.main_tank_ph:
                    measurements.append("Main Tank")
                if task.dripper_ec or task.dripper_ph:
                    measurements.append("Dripper")

                title = "Daily Tasks Updated"
                message = f"{user_name} updated daily tasks for {task.farm.name}. "
                message += f"Tasks: {', '.join(completed_tasks) if completed_tasks else 'None'}. "
                if measurements:
                    message += f"Water measurements updated for: {', '.join(measurements)}. "
                message += f"Updated at {task.updated_at.strftime('%H:%M:%S')}"

                # Create persistent agronomist notification
                agronomist_notification = create_agronomist_notification(
                    agronomist_user=agronomist_user,
                    title=title,
                    message=message,
                    notification_type='daily_task',
                    source_user=task.user,
                    source_farm=task.farm,
                    related_object_id=task.id,
                    related_model_name='DailyTask'
                )

                # Send WebSocket notification
                channel_layer = get_channel_layer()
                if channel_layer:
                    try:
                        notification_data = {
                            'type': 'notification_message',
                            'title': title,
                            'message': message,
                            'notification_type': 'daily_task',
                            'notification_id': agronomist_notification.id,
                            'farm_id': task.farm.id,
                            'farm_name': task.farm.name,
                            'user_id': task.user.id,
                            'user_name': user_name,
                            'completed_tasks': completed_tasks,
                            'measurements': measurements,
                            'timestamp': agronomist_notification.created_at.isoformat(),
                            'action': 'updated'
                        }

                        specific_agronomist_group = f'agronomist_{agronomist_user.id}_notifications'
                        async_to_sync(channel_layer.group_send)(specific_agronomist_group, notification_data)
                        async_to_sync(channel_layer.group_send)('agronomist_notifications', notification_data)
                    except Exception as e:
                        logger.error(f"Failed to send WebSocket notification: {e}")

        return Response({
            'success': True,
            'message': 'Daily task updated successfully',
            'task_data': DailyTaskSerializer(task).data
        })

    elif request.method == 'DELETE':
        task.delete()
        return Response({'message': 'Daily task deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def notifications(request):
    from django.utils import timezone
    
    if request.method == 'GET':
        # Filter notifications based on user type
        if request.user.user_type in ['agronomist', 'superuser']:
            # Agronomists see their persistent agronomist notifications
            notifications = AgronomistNotification.objects.filter(agronomist_user=request.user).order_by('-created_at')
            serializer = AgronomistNotificationSerializer(notifications, many=True)
        else:
            # Farm users see only their own notifications
            notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
            serializer = NotificationSerializer(notifications, many=True)
        
        # Optional filtering
        notification_type = request.query_params.get('type')
        if notification_type:
            notifications = notifications.filter(notification_type=notification_type)
        
        # Optional pagination
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                notifications = notifications[:limit]
            except ValueError:
                pass
        
        # Re-serialize after filtering
        if request.user.user_type in ['agronomist', 'superuser']:
            serializer = AgronomistNotificationSerializer(notifications, many=True)
        else:
            serializer = NotificationSerializer(notifications, many=True)
        
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Mark notifications as read
        notification_ids = request.data.get('notification_ids', [])
        if notification_ids:
            if request.user.user_type in ['agronomist', 'superuser']:
                updated_count = AgronomistNotification.objects.filter(id__in=notification_ids, agronomist_user=request.user).update(is_read=True)
            else:
                updated_count = Notification.objects.filter(id__in=notification_ids, user=request.user).update(is_read=True)
            return Response({'message': f'{updated_count} notifications marked as read'})
        else:
            # Mark all as read
            if request.user.user_type in ['agronomist', 'superuser']:
                AgronomistNotification.objects.filter(agronomist_user=request.user).update(is_read=True)
            else:
                Notification.objects.filter(user=request.user).update(is_read=True)
            return Response({'message': 'All notifications marked as read'})
    
    elif request.method == 'DELETE':
        # Delete notifications
        notification_ids = request.data.get('notification_ids', [])
        if notification_ids:
            if request.user.user_type in ['agronomist', 'superuser']:
                deleted_count, _ = AgronomistNotification.objects.filter(id__in=notification_ids, agronomist_user=request.user).delete()
            else:
                deleted_count, _ = Notification.objects.filter(id__in=notification_ids, user=request.user).delete()
            return Response({'message': f'{deleted_count} notifications deleted'})
        else:
            # Delete all notifications for current user
            if request.user.user_type in ['agronomist', 'superuser']:
                deleted_count, _ = AgronomistNotification.objects.filter(agronomist_user=request.user).delete()
            else:
                deleted_count, _ = Notification.objects.filter(user=request.user).delete()
            return Response({'message': f'All {deleted_count} notifications deleted'})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def spray_irrigation_logs(request):
    
    if request.method == 'GET':
        # Get logs for the user
        today = date.today()
        if 'date' in request.query_params:
            try:
                log_date = request.query_params['date']
                logs = SprayIrrigationLog.objects.filter(user=request.user, date=log_date)
            except:
                logs = SprayIrrigationLog.objects.filter(user=request.user, date=today)
        elif 'history' in request.query_params:
            logs = SprayIrrigationLog.objects.filter(user=request.user).order_by('-created_at')
        else:
            logs = SprayIrrigationLog.objects.filter(user=request.user, date=today)
        
        serializer = SprayIrrigationLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new spray/irrigation log
        farm_id = request.data.get('farm')
        
        # Verify user has access to this farm
        try:
            if request.user.is_superuser:
                farm = Farm.objects.get(id=farm_id, is_active=True)
            elif request.user.user_type == 'agronomist':
                farm = Farm.objects.get(id=farm_id, created_by=request.user, is_active=True)
            else:
                farm = request.user.assigned_farms.get(id=farm_id, is_active=True)
        except Farm.DoesNotExist:
            return Response({'error': 'You do not have access to this farm'}, status=status.HTTP_403_FORBIDDEN)
        
        # Create log entry
        log_data = request.data.copy()
        if not log_data.get('date'):
            log_data['date'] = date.today()
            
        serializer = CreateSprayIrrigationLogSerializer(data=log_data)
        if serializer.is_valid():
            log = serializer.save(user=request.user)
            return Response(SprayIrrigationLogSerializer(log).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def crop_stages(request):
    
    if request.method == 'GET':
        # Get crop stages for the user
        if 'history' in request.query_params:
            stages = CropStage.objects.filter(user=request.user).order_by('-created_at')
        else:
            stages = CropStage.objects.filter(user=request.user).order_by('-created_at')
        
        serializer = CropStageSerializer(stages, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new crop stage
        farm_id = request.data.get('farm')
        
        # Verify user has access to this farm
        try:
            if request.user.is_superuser:
                farm = Farm.objects.get(id=farm_id, is_active=True)
            elif request.user.user_type == 'agronomist':
                farm = Farm.objects.get(id=farm_id, created_by=request.user, is_active=True)
            else:
                farm = request.user.assigned_farms.get(id=farm_id, is_active=True)
        except Farm.DoesNotExist:
            return Response({'error': 'You do not have access to this farm'}, status=status.HTTP_403_FORBIDDEN)
        
        # Create crop stage entry
        stage_data = request.data.copy()
        if not stage_data.get('transplant_date'):
            stage_data['transplant_date'] = date.today()
            
        serializer = CreateCropStageSerializer(data=stage_data)
        if serializer.is_valid():
            stage = serializer.save(user=request.user)
            return Response(CropStageSerializer(stage).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def crop_stage_detail(request, stage_id):
    
    try:
        stage = CropStage.objects.get(id=stage_id, user=request.user)
    except CropStage.DoesNotExist:
        return Response({'error': 'Crop stage not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = CropStageSerializer(stage)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = CreateCropStageSerializer(stage, data=request.data, partial=True)
        if serializer.is_valid():
            stage = serializer.save()
            return Response(CropStageSerializer(stage).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        stage.delete()
        return Response({'message': 'Crop stage deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_crop_stages(request):
    """
    Import crop stages from CSV file
    """
    import csv
    import io
    from datetime import datetime
    
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    file = request.FILES['file']
    
    if not file.name.endswith('.csv'):
        return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file size (max 5MB)
    if file.size > 5 * 1024 * 1024:
        return Response({'error': 'File size must be less than 5MB'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Read CSV data
        data = file.read().decode('utf-8')
        csv_data = csv.DictReader(io.StringIO(data))
        
        created_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_data, start=1):
            try:
                # Validate required fields
                required_fields = ['crop_name', 'variety', 'batch_code', 'farm_id']
                for field in required_fields:
                    if not row.get(field):
                        errors.append(f"Row {row_num}: Missing required field '{field}'")
                        continue
                
                # Validate farm access
                try:
                    if request.user.is_superuser:
                        farm = Farm.objects.get(id=row['farm_id'], is_active=True)
                    elif request.user.user_type == 'agronomist':
                        farm = Farm.objects.get(id=row['farm_id'], created_by=request.user, is_active=True)
                    else:
                        farm = request.user.assigned_farms.get(id=row['farm_id'], is_active=True)
                except Farm.DoesNotExist:
                    errors.append(f"Row {row_num}: Invalid farm ID or no access to farm {row['farm_id']}")
                    continue
                
                # Parse dates
                transplant_date = None
                expected_harvest_date = None
                
                if row.get('transplant_date'):
                    try:
                        transplant_date = datetime.strptime(row['transplant_date'], '%Y-%m-%d').date()
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid transplant_date format. Use YYYY-MM-DD")
                        continue
                
                if row.get('expected_harvest_date'):
                    try:
                        expected_harvest_date = datetime.strptime(row['expected_harvest_date'], '%Y-%m-%d').date()
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid expected_harvest_date format. Use YYYY-MM-DD")
                        continue
                
                # Validate current_stage
                valid_stages = ['germination', 'seedling', 'vegetative', 'flowering', 'fruiting', 'harvest']
                current_stage = row.get('current_stage', 'seedling').lower()
                if current_stage not in valid_stages:
                    errors.append(f"Row {row_num}: Invalid current_stage. Must be one of: {', '.join(valid_stages)}")
                    continue
                
                # Check for duplicate batch_code
                if CropStage.objects.filter(batch_code=row['batch_code'], user=request.user).exists():
                    errors.append(f"Row {row_num}: Batch code '{row['batch_code']}' already exists")
                    continue
                
                # Create crop stage
                crop_stage = CropStage.objects.create(
                    user=request.user,
                    farm=farm,
                    crop_name=row['crop_name'],
                    variety=row['variety'],
                    batch_code=row['batch_code'],
                    current_stage=current_stage,
                    transplant_date=transplant_date,
                    expected_harvest_date=expected_harvest_date,
                    notes=row.get('notes', '')
                )
                created_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: Error processing row - {str(e)}")
                continue
        
        return Response({
            'message': f'Import completed. Created {created_count} crop stages.',
            'created_count': created_count,
            'errors': errors,
            'total_errors': len(errors)
        })
        
    except Exception as e:
        return Response({'error': f'Error processing file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_crop_stages(request):
    """
    Export crop stages to CSV file
    """
    import csv
    from django.http import HttpResponse
    
    # Get user's crop stages
    crop_stages = CropStage.objects.filter(user=request.user).order_by('-created_at')
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="crop_stages_export.csv"'
    
    writer = csv.writer(response)
    
    # Write header
    writer.writerow([
        'crop_name',
        'variety', 
        'batch_code',
        'current_stage',
        'transplant_date',
        'expected_harvest_date',
        'growth_duration_days',
        'farm_name',
        'farm_id',
        'notes',
        'created_at'
    ])
    
    # Write data
    for stage in crop_stages:
        writer.writerow([
            stage.crop_name,
            stage.variety,
            stage.batch_code,
            stage.current_stage,
            stage.transplant_date.strftime('%Y-%m-%d') if stage.transplant_date else '',
            stage.expected_harvest_date.strftime('%Y-%m-%d') if stage.expected_harvest_date else '',
            stage.growth_duration_days,
            stage.farm.name if stage.farm else '',
            stage.farm.id if stage.farm else '',
            stage.notes or '',
            stage.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])
    
    return response

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fertigations(request):
    """
    Fertigation management - List user's fertigations or create new one
    """
    if request.method == 'GET':
        # Get filter parameters
        status_filter = request.query_params.get('status')  # scheduled, completed, cancelled
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        farm_id = request.query_params.get('farm')
        
        # Base queryset - user's fertigations only
        fertigations = Fertigation.objects.filter(user=request.user)
        
        # Apply filters
        if status_filter:
            fertigations = fertigations.filter(status=status_filter)
        
        if date_from:
            fertigations = fertigations.filter(date_time__gte=date_from)
        
        if date_to:
            fertigations = fertigations.filter(date_time__lte=date_to)
        
        if farm_id:
            fertigations = fertigations.filter(farm_id=farm_id)
        
        fertigations = fertigations.order_by('-date_time')
        
        serializer = FertigationSerializer(fertigations, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new fertigation
        serializer = CreateFertigationSerializer(data=request.data)
        
        if serializer.is_valid():
            # Verify user has access to the selected farm
            farm_id = serializer.validated_data.get('farm')
            if not farm_id:
                return Response({'error': 'Farm is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                farm = Farm.objects.get(id=farm_id.id)
                if request.user not in farm.users.all() and farm.created_by != request.user:
                    return Response({'error': 'You do not have access to this farm'}, status=status.HTTP_403_FORBIDDEN)
            except Farm.DoesNotExist:
                return Response({'error': 'Farm not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Save with user
            fertigation = serializer.save(user=request.user)
            
            # Create notification for completed fertigation
            if fertigation.status == 'completed':
                title = f"Fertigation Completed: {fertigation.crop_zone_name}"
                message = f"Fertigation activity completed for {fertigation.crop_zone_name} at {farm.name}. EC change: {fertigation.ec_change:.2f}, pH change: {fertigation.ph_change:.2f}"
                
                Notification.objects.create(
                    title=title,
                    message=message,
                    notification_type='general',
                    farm=farm,
                    user=request.user
                )
            
            return Response(FertigationSerializer(fertigation).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def fertigation_detail(request, pk):
    """
    Get, update, or delete a specific fertigation
    """
    try:
        fertigation = Fertigation.objects.get(pk=pk, user=request.user)
    except Fertigation.DoesNotExist:
        return Response({'error': 'Fertigation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = FertigationSerializer(fertigation)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = CreateFertigationSerializer(fertigation, data=request.data)
        if serializer.is_valid():
            # Verify farm access
            farm_id = serializer.validated_data.get('farm')
            if farm_id:
                try:
                    farm = Farm.objects.get(id=farm_id.id)
                    if request.user not in farm.users.all() and farm.created_by != request.user:
                        return Response({'error': 'You do not have access to this farm'}, status=status.HTTP_403_FORBIDDEN)
                except Farm.DoesNotExist:
                    return Response({'error': 'Farm not found'}, status=status.HTTP_404_NOT_FOUND)
            
            fertigation = serializer.save(user=request.user)
            return Response(FertigationSerializer(fertigation).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        fertigation.delete()
        return Response({'message': 'Fertigation deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fertigation_analytics(request):
    """
    Get analytics data for fertigation activities
    """
    from django.db.models import Avg, Count, Sum
    from datetime import datetime, timedelta
    
    # Get date range (default: last 30 days)
    from django.utils import timezone
    days = int(request.query_params.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    
    fertigations = Fertigation.objects.filter(
        user=request.user,
        date_time__gte=start_date,
        status='completed'
    )
    
    analytics = {
        'total_fertigations': fertigations.count(),
        'avg_ec_change': fertigations.aggregate(Avg('ec_after'))['ec_after__avg'] or 0,
        'avg_ph_change': fertigations.aggregate(Avg('ph_after'))['ph_after__avg'] or 0,
        'total_water_used': fertigations.aggregate(Sum('water_volume'))['water_volume__sum'] or 0,
        'fertigations_by_status': fertigations.values('status').annotate(count=Count('id')),
        'recent_fertigations': FertigationSerializer(fertigations.order_by('-date_time')[:5], many=True).data,
        'ec_ph_trends': []
    }
    
    # Get EC/pH trends over time
    for fertigation in fertigations.order_by('date_time')[:20]:
        analytics['ec_ph_trends'].append({
            'date': fertigation.date_time.strftime('%Y-%m-%d'),
            'ec_before': float(fertigation.ec_before),
            'ec_after': float(fertigation.ec_after),
            'ph_before': float(fertigation.ph_before),
            'ph_after': float(fertigation.ph_after),
            'crop_zone': fertigation.crop_zone_name
        })
    
    return Response(analytics)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fertigation_schedule(request):
    """
    Manage fertigation schedules - get scheduled fertigations or create new schedule
    """
    if request.method == 'GET':
        # Get upcoming scheduled fertigations
        from django.utils import timezone
        scheduled_fertigations = Fertigation.objects.filter(
            user=request.user,
            status='scheduled',
            scheduled_date__gte=timezone.now()
        ).order_by('scheduled_date')
        
        serializer = FertigationSerializer(scheduled_fertigations, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create scheduled fertigation
        data = request.data.copy()
        data['status'] = 'scheduled'
        data['is_scheduled'] = True
        
        serializer = CreateFertigationSerializer(data=data)
        
        if serializer.is_valid():
            # Verify farm access
            farm_id = serializer.validated_data.get('farm')
            try:
                farm = Farm.objects.get(id=farm_id.id)
                if request.user not in farm.users.all() and farm.created_by != request.user:
                    return Response({'error': 'You do not have access to this farm'}, status=status.HTTP_403_FORBIDDEN)
            except Farm.DoesNotExist:
                return Response({'error': 'Farm not found'}, status=status.HTTP_404_NOT_FOUND)
            
            fertigation = serializer.save(user=request.user)
            
            # Create notification for scheduled fertigation
            title = f"Fertigation Scheduled: {fertigation.crop_zone_name}"
            message = f"Fertigation scheduled for {fertigation.crop_zone_name} at {farm.name} on {fertigation.scheduled_date.strftime('%Y-%m-%d %H:%M')}"
            
            Notification.objects.create(
                title=title,
                message=message,
                notification_type='general',
                farm=farm,
                user=request.user
            )
            
            return Response(FertigationSerializer(fertigation).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# Worker Management Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def workers(request):
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can manage workers'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get workers managed by this user
        user_farms = Farm.objects.filter(users=request.user)
        workers = Worker.objects.filter(farm__in=user_farms, user=request.user)
        
        # Filter by employment type if provided
        employment_type = request.GET.get('employment_type')
        if employment_type:
            workers = workers.filter(employment_type=employment_type)
        
        # Filter by farm if provided
        farm_id = request.GET.get('farm')
        if farm_id:
            workers = workers.filter(farm_id=farm_id)
        
        serializer = WorkerSerializer(workers, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new worker
        serializer = CreateWorkerSerializer(data=request.data)
        if serializer.is_valid():
            # Verify farm access
            farm = serializer.validated_data['farm']
            if request.user not in farm.users.all() and farm.created_by != request.user:
                return Response({'error': 'You do not have permission to add workers to this farm'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            worker = serializer.save(user=request.user)
            return Response(WorkerSerializer(worker).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def worker_detail(request, worker_id):
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can manage workers'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        worker = Worker.objects.get(id=worker_id, user=request.user)
    except Worker.DoesNotExist:
        return Response({'error': 'Worker not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = WorkerSerializer(worker)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UpdateWorkerSerializer(worker, data=request.data, partial=True)
        if serializer.is_valid():
            # Verify farm access if farm is being updated
            if 'farm' in serializer.validated_data:
                farm = serializer.validated_data['farm']
                if request.user not in farm.users.all() and farm.created_by != request.user:
                    return Response({'error': 'You do not have permission to assign worker to this farm'}, 
                                  status=status.HTTP_403_FORBIDDEN)
            
            worker = serializer.save()
            return Response(WorkerSerializer(worker).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        worker.delete()
        return Response({'message': 'Worker deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

# Worker Task Management Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def worker_tasks(request):
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can manage worker tasks'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get tasks assigned by this farm user
        tasks = WorkerTask.objects.filter(user=request.user)
        
        # Filter by status if specified
        status_filter = request.query_params.get('status')
        if status_filter:
            tasks = tasks.filter(status=status_filter)
        
        # Filter by worker if provided
        worker_id = request.query_params.get('worker')
        if worker_id:
            tasks = tasks.filter(worker_id=worker_id)
        
        # Filter by date range if specified
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            tasks = tasks.filter(assigned_date__gte=date_from)
        if date_to:
            tasks = tasks.filter(assigned_date__lte=date_to)
        
        serializer = WorkerTaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new worker task
        serializer = CreateWorkerTaskSerializer(data=request.data)
        if serializer.is_valid():
            # Verify worker access
            worker = serializer.validated_data['worker']
            if worker.user != request.user:
                return Response({'error': 'You can only assign tasks to your workers'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            task = serializer.save(user=request.user, farm=worker.farm)
            return Response(WorkerTaskSerializer(task).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def worker_task_detail(request, task_id):
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can manage worker tasks'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        task = WorkerTask.objects.get(id=task_id, user=request.user)
    except WorkerTask.DoesNotExist:
        return Response({'error': 'Worker task not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = WorkerTaskSerializer(task)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UpdateWorkerTaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            task = serializer.save()
            return Response(WorkerTaskSerializer(task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        task.delete()
        return Response({'message': 'Worker task deleted successfully'}, status=status.HTTP_204_NO_CONTENT)




# Worker Dashboard Summary
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def worker_dashboard_summary(request):
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can view worker dashboard'}, status=status.HTTP_403_FORBIDDEN)
    
    from datetime import date
    
    # Get today's statistics
    today = date.today()
    
    # Tasks managed by this farm user
    all_tasks = WorkerTask.objects.filter(user=request.user)
    
    # Today's tasks
    today_tasks = all_tasks.filter(assigned_date=today)
    
    # Get unique workers
    user_farms = Farm.objects.filter(users=request.user)
    workers = Worker.objects.filter(farm__in=user_farms, user=request.user)
    
    summary = {
        'total_workers': workers.count(),
        'total_tasks': all_tasks.count(),
        'today_tasks_assigned': today_tasks.count(),
        'today_tasks_completed': today_tasks.filter(status='completed').count(),
        'pending_tasks': all_tasks.filter(status='pending').count(),
        'completed_tasks': all_tasks.filter(status='completed').count(),
        'tasks_with_issues': all_tasks.filter(status='issue').count(),
        'recent_completed_tasks': WorkerTaskSerializer(
            all_tasks.filter(status='completed').order_by('-updated_at')[:5],
            many=True
        ).data,
        'pending_issues': WorkerTaskSerializer(
            all_tasks.filter(status='issue').order_by('-assigned_date')[:5],
            many=True
        ).data,
    }
    
    return Response(summary)

# Issue Report Management
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def issue_reports(request):
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can access issue reports'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get all issue reports created by this farm user
        issues = IssueReport.objects.filter(farm_user=request.user).order_by('-created_at')
        
        # Filter by status if provided
        status_filter = request.GET.get('status')
        if status_filter:
            issues = issues.filter(status=status_filter)
        
        # Filter by issue type if provided
        issue_type_filter = request.GET.get('issue_type')
        if issue_type_filter:
            issues = issues.filter(issue_type=issue_type_filter)
        
        # Filter by severity if provided
        severity_filter = request.GET.get('severity')
        if severity_filter:
            issues = issues.filter(severity=severity_filter)
        
        serializer = IssueReportSerializer(issues, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = CreateIssueReportSerializer(data=request.data)
        if serializer.is_valid():
            # Get the agronomist user who created this farm user
            agronomist_user = None
            try:
                agronomist_user = request.user.created_by
                if agronomist_user and agronomist_user.user_type not in ['agronomist', 'superuser']:
                    agronomist_user = None
            except Exception as e:
                agronomist_user = None
            
            # Get the first assigned farm for this user (or None if no farms assigned)
            user_farm = request.user.assigned_farms.first()
            
            issue_report = serializer.save(
                farm_user=request.user,
                agronomist_user=agronomist_user,
                farm=user_farm
            )
            
            # Create notifications for both farm user and agronomist
            farm_user_notification = Notification.objects.create(
                user=request.user,
                title=f"Issue Report Submitted",
                message=f"Your issue report has been submitted successfully. Issue Type: {issue_report.get_issue_type_display()}, Severity: {issue_report.get_severity_display()}",
                notification_type='issue_report_submitted',
                farm=issue_report.farm,
                related_object_id=issue_report.id
            )
            
            if agronomist_user:
                title = f"New Issue Report from {request.user.username}"
                message = f"Farm: {issue_report.farm.name if issue_report.farm else 'N/A'}, Issue Type: {issue_report.get_issue_type_display()}, Severity: {issue_report.get_severity_display()}, Description: {issue_report.description[:100]}{'...' if len(issue_report.description) > 100 else ''}"
                
                # Create regular notification for agronomist
                agronomist_notification = Notification.objects.create(
                    user=agronomist_user,
                    title=title,
                    message=message,
                    notification_type='issue_report',
                    farm=issue_report.farm,
                    related_object_id=issue_report.id
                )
                
                # Create persistent agronomist notification
                persistent_agronomist_notification = create_agronomist_notification(
                    agronomist_user=agronomist_user,
                    title=title,
                    message=message,
                    notification_type='issue_report',
                    source_user=request.user,
                    source_farm=issue_report.farm,
                    related_object_id=issue_report.id,
                    related_model_name='IssueReport'
                )
                
                # Send real-time notification via channels to specific agronomist
                try:
                    from channels.layers import get_channel_layer
                    channel_layer = get_channel_layer()
                    
                    if channel_layer:
                        notification_data = {
                            'type': 'notification_message',
                            'title': persistent_agronomist_notification.title,
                            'message': persistent_agronomist_notification.message,
                            'notification_type': persistent_agronomist_notification.notification_type,
                            'notification_id': persistent_agronomist_notification.id,
                            'farm_id': issue_report.farm.id if issue_report.farm else None,
                            'farm_name': issue_report.farm.name if issue_report.farm else None,
                            'user_id': request.user.id,
                            'user_name': request.user.username,
                            'timestamp': persistent_agronomist_notification.created_at.isoformat()
                        }
                        
                        # Send to specific agronomist who created this farm user
                        specific_agronomist_group = f'agronomist_{agronomist_user.id}_notifications'
                        async_to_sync(channel_layer.group_send)(specific_agronomist_group, notification_data)
                        
                        # Also send to general agronomist notifications group (fallback)
                        async_to_sync(channel_layer.group_send)('agronomist_notifications', notification_data)
                        
                        
                except Exception as e:
                    pass
            
            response_serializer = IssueReportSerializer(issue_report)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def issue_report_detail(request, issue_id):
    try:
        issue = IssueReport.objects.get(id=issue_id, farm_user=request.user)
    except IssueReport.DoesNotExist:
        return Response({'error': 'Issue report not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = IssueReportSerializer(issue)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UpdateIssueReportSerializer(issue, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            response_serializer = IssueReportSerializer(issue)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if issue.status != 'reported':
            return Response({'error': 'Cannot delete issue that is already being reviewed or resolved'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        issue.delete()
        return Response({'message': 'Issue report deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def spray_schedules(request):
    if request.method == 'GET':
        # Get spray schedules for the current user's farms
        if request.user.is_superuser:
            spray_schedules = SpraySchedule.objects.all()
        elif request.user.user_type == 'agronomist':
            # Agronomist can see spray schedules from farms they created
            agronomist_farms = Farm.objects.filter(created_by=request.user, is_active=True)
            spray_schedules = SpraySchedule.objects.filter(farm__in=agronomist_farms)
        else:
            # Farm users can see spray schedules from their assigned farms
            user_farms = request.user.assigned_farms.filter(is_active=True)
            spray_schedules = SpraySchedule.objects.filter(farm__in=user_farms)
        
        # Filter by farm if provided
        farm_filter = request.GET.get('farm')
        if farm_filter:
            spray_schedules = spray_schedules.filter(farm_id=farm_filter)
        
        # Filter by reason if provided
        reason_filter = request.GET.get('reason')
        if reason_filter:
            spray_schedules = spray_schedules.filter(reason=reason_filter)
        
        # Filter by completion status
        status_filter = request.GET.get('status')
        if status_filter == 'completed':
            spray_schedules = spray_schedules.filter(is_completed=True)
        elif status_filter == 'pending':
            spray_schedules = spray_schedules.filter(is_completed=False)
        
        # Filter by upcoming reminders
        reminder_filter = request.GET.get('reminder_due')
        if reminder_filter == 'true':
            from django.utils import timezone
            spray_schedules = spray_schedules.filter(
                next_spray_reminder__lte=timezone.now(),
                next_spray_reminder__isnull=False
            )
        
        # Order by date_time (newest first)
        spray_schedules = spray_schedules.order_by('-date_time')
        
        serializer = SprayScheduleSerializer(spray_schedules, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = CreateSprayScheduleSerializer(data=request.data)
        if serializer.is_valid():
            spray_schedule = serializer.save(user=request.user)
            
            # Create notification for spray schedule creation
            Notification.objects.create(
                user=request.user,
                title="Spray Schedule Created",
                message=f"Spray schedule {spray_schedule.spray_id} for {spray_schedule.crop_zone} has been created. Product: {spray_schedule.product_used}, Date: {spray_schedule.date_time.strftime('%Y-%m-%d %H:%M')}",
                notification_type='spray_scheduled',
                farm=spray_schedule.farm,
                related_object_id=spray_schedule.id
            )
            
            # If there's a next spray reminder, create notification for that too
            if spray_schedule.next_spray_reminder:
                Notification.objects.create(
                    user=request.user,
                    title="Spray Reminder Set",
                    message=f"Reminder set for next spray on {spray_schedule.crop_zone}. Reminder date: {spray_schedule.next_spray_reminder.strftime('%Y-%m-%d %H:%M')}",
                    notification_type='spray_reminder',
                    farm=spray_schedule.farm,
                    due_date=spray_schedule.next_spray_reminder,
                    related_object_id=spray_schedule.id
                )
            
            response_serializer = SprayScheduleSerializer(spray_schedule)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def spray_schedule_detail(request, schedule_id):
    try:
        if request.user.is_superuser:
            spray_schedule = SpraySchedule.objects.get(id=schedule_id)
        elif request.user.user_type == 'agronomist':
            # Agronomist can access spray schedules from farms they created
            agronomist_farms = Farm.objects.filter(created_by=request.user, is_active=True)
            spray_schedule = SpraySchedule.objects.get(id=schedule_id, farm__in=agronomist_farms)
        else:
            # Farm users can access spray schedules from their assigned farms
            user_farms = request.user.assigned_farms.filter(is_active=True)
            spray_schedule = SpraySchedule.objects.get(id=schedule_id, farm__in=user_farms)
    except SpraySchedule.DoesNotExist:
        return Response({'error': 'Spray schedule not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = SprayScheduleSerializer(spray_schedule)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Only farm users can update spray schedules (mark as completed, add notes, etc.)
        if request.user.user_type in ['agronomist'] and not request.user.is_superuser:
            return Response({'error': 'Only farm users can update spray schedules'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        serializer = UpdateSprayScheduleSerializer(spray_schedule, data=request.data, partial=True)
        if serializer.is_valid():
            updated_schedule = serializer.save()
            
            # If marked as completed, create completion notification
            if updated_schedule.is_completed and 'is_completed' in request.data:
                Notification.objects.create(
                    user=request.user,
                    title="Spray Application Completed",
                    message=f"Spray {updated_schedule.spray_id} for {updated_schedule.crop_zone} has been completed. Product: {updated_schedule.product_used}. PHI: {updated_schedule.phi_log} days.",
                    notification_type='spray_completed',
                    farm=updated_schedule.farm,
                    related_object_id=updated_schedule.id
                )
            
            response_serializer = SprayScheduleSerializer(updated_schedule)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Only allow deletion of uncompleted spray schedules
        if spray_schedule.is_completed:
            return Response({'error': 'Cannot delete completed spray schedules'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Only farm users who created it or agronomists/superusers can delete
        if not (request.user == spray_schedule.user or 
                request.user.user_type == 'agronomist' or 
                request.user.is_superuser):
            return Response({'error': 'Permission denied'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        spray_schedule.delete()
        return Response({'message': 'Spray schedule deleted successfully'}, 
                       status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spray_schedule_analytics(request):
    """Get analytics data for spray schedules"""
    if request.user.is_superuser:
        spray_schedules = SpraySchedule.objects.all()
    elif request.user.user_type == 'agronomist':
        agronomist_farms = Farm.objects.filter(created_by=request.user, is_active=True)
        spray_schedules = SpraySchedule.objects.filter(farm__in=agronomist_farms)
    else:
        user_farms = request.user.assigned_farms.filter(is_active=True)
        spray_schedules = SpraySchedule.objects.filter(farm__in=user_farms)
    
    # Get date range filter
    from django.utils import timezone
    from datetime import timedelta
    
    date_filter = request.GET.get('period', '30')  # Default to last 30 days
    if date_filter == '7':
        start_date = timezone.now() - timedelta(days=7)
    elif date_filter == '30':
        start_date = timezone.now() - timedelta(days=30)
    elif date_filter == '90':
        start_date = timezone.now() - timedelta(days=90)
    else:
        start_date = timezone.now() - timedelta(days=30)
    
    period_schedules = spray_schedules.filter(date_time__gte=start_date)
    
    analytics_data = {
        'total_schedules': period_schedules.count(),
        'completed_schedules': period_schedules.filter(is_completed=True).count(),
        'pending_schedules': period_schedules.filter(is_completed=False).count(),
        'overdue_reminders': spray_schedules.filter(
            next_spray_reminder__lt=timezone.now(),
            next_spray_reminder__isnull=False,
            is_completed=False
        ).count(),
        'phi_violations': period_schedules.filter(
            is_completed=True,
            completion_date__isnull=False
        ).count(),  # This would need more complex logic for actual PHI violations
        'reason_breakdown': {
            'pest': period_schedules.filter(reason='pest').count(),
            'disease': period_schedules.filter(reason='disease').count(),
            'nutrient': period_schedules.filter(reason='nutrient').count(),
        },
        'monthly_trend': []  # Could add monthly breakdown here
    }
    
    return Response(analytics_data)

# Expenditure Management Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def expenditures(request):
    """
    Get all expenditures for the user's farms or create a new expenditure
    """
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can manage expenditures'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get expenditures for all farms the user has access to
        user_farms = Farm.objects.filter(users=request.user)
        expenditures = Expenditure.objects.filter(farm__in=user_farms, user=request.user)
        
        # Filter by category if provided
        category = request.GET.get('category')
        if category:
            expenditures = expenditures.filter(category=category)
        
        # Filter by payment method if provided
        payment_method = request.GET.get('payment_method')
        if payment_method:
            expenditures = expenditures.filter(payment_method=payment_method)
        
        # Filter by date range
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if date_from:
            expenditures = expenditures.filter(expense_date__gte=date_from)
        if date_to:
            expenditures = expenditures.filter(expense_date__lte=date_to)
        
        # Filter by farm if provided
        farm_id = request.GET.get('farm')
        if farm_id:
            expenditures = expenditures.filter(farm_id=farm_id)
        
        serializer = ExpenditureSerializer(expenditures, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new expenditure
        serializer = CreateExpenditureSerializer(data=request.data)
        if serializer.is_valid():
            # Verify farm access
            farm = serializer.validated_data['farm']
            if request.user not in farm.users.all() and farm.created_by != request.user:
                return Response({'error': 'You do not have permission to add expenditures to this farm'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            expenditure = serializer.save(user=request.user)
            return Response(ExpenditureSerializer(expenditure).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def expenditure_detail(request, expenditure_id):
    """
    Get, update, or delete a specific expenditure
    """
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can manage expenditures'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        expenditure = Expenditure.objects.get(id=expenditure_id, user=request.user)
    except Expenditure.DoesNotExist:
        return Response({'error': 'Expenditure not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = ExpenditureSerializer(expenditure)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UpdateExpenditureSerializer(expenditure, data=request.data, partial=True)
        if serializer.is_valid():
            expenditure = serializer.save()
            return Response(ExpenditureSerializer(expenditure).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        expenditure.delete()
        return Response({'message': 'Expenditure deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expenditure_analytics(request):
    """
    Get expenditure analytics and summary
    """
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can view expenditure analytics'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get user's farms
    user_farms = Farm.objects.filter(users=request.user)
    expenditures = Expenditure.objects.filter(farm__in=user_farms, user=request.user)
    
    # Filter by date range if provided
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    if date_from:
        expenditures = expenditures.filter(expense_date__gte=date_from)
    if date_to:
        expenditures = expenditures.filter(expense_date__lte=date_to)
    
    # Calculate analytics
    from django.db.models import Sum
    from decimal import Decimal
    
    total_amount = expenditures.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    # Category wise breakdown
    category_breakdown = {}
    for category_code, category_name in Expenditure.CATEGORY_CHOICES:
        category_total = expenditures.filter(category=category_code).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        if category_total > 0:
            category_breakdown[category_name] = {
                'amount': category_total,
                'percentage': round((category_total / total_amount * 100) if total_amount > 0 else 0, 2)
            }
    
    # Payment method breakdown
    payment_breakdown = {}
    for payment_code, payment_name in Expenditure.PAYMENT_METHOD_CHOICES:
        payment_total = expenditures.filter(payment_method=payment_code).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        if payment_total > 0:
            payment_breakdown[payment_name] = payment_total
    
    analytics_data = {
        'total_expenditure': total_amount,
        'total_transactions': expenditures.count(),
        'average_transaction': round(total_amount / expenditures.count() if expenditures.count() > 0 else 0, 2),
        'category_breakdown': category_breakdown,
        'payment_method_breakdown': payment_breakdown,
        'recent_expenditures': ExpenditureSerializer(expenditures[:5], many=True).data
    }
    
    return Response(analytics_data)

# Sale Management Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sales(request):
    """
    Get all sales for the user's farms or create a new sale
    """
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can manage sales'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get sales for all farms the user has access to
        user_farms = Farm.objects.filter(users=request.user)
        sales = Sale.objects.filter(farm__in=user_farms, user=request.user)
        
        # Filter by payment status if provided
        payment_status = request.GET.get('payment_status')
        if payment_status:
            sales = sales.filter(payment_status=payment_status)
        
        # Filter by crop name if provided
        crop_name = request.GET.get('crop_name')
        if crop_name:
            sales = sales.filter(crop_name__icontains=crop_name)
        
        # Filter by buyer name if provided
        buyer_name = request.GET.get('buyer_name')
        if buyer_name:
            sales = sales.filter(buyer_name__icontains=buyer_name)
        
        # Filter by date range
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if date_from:
            sales = sales.filter(sale_date__gte=date_from)
        if date_to:
            sales = sales.filter(sale_date__lte=date_to)
        
        # Filter by farm if provided
        farm_id = request.GET.get('farm')
        if farm_id:
            sales = sales.filter(farm_id=farm_id)
        
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new sale
        serializer = CreateSaleSerializer(data=request.data)
        if serializer.is_valid():
            # Verify farm access
            farm = serializer.validated_data['farm']
            if request.user not in farm.users.all() and farm.created_by != request.user:
                return Response({'error': 'You do not have permission to add sales to this farm'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            sale = serializer.save(user=request.user)
            return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def sale_detail(request, sale_id):
    """
    Get, update, or delete a specific sale
    """
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can manage sales'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        sale = Sale.objects.get(id=sale_id, user=request.user)
    except Sale.DoesNotExist:
        return Response({'error': 'Sale not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = SaleSerializer(sale)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UpdateSaleSerializer(sale, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(SaleSerializer(sale).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        sale.delete()
        return Response({'message': 'Sale deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sale_analytics(request):
    """
    Get sale analytics for the user's farms
    """
    if request.user.user_type != 'farm_user':
        return Response({'error': 'Only farm users can view sale analytics'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get sales for user's farms
    user_farms = Farm.objects.filter(users=request.user)
    sales = Sale.objects.filter(farm__in=user_farms, user=request.user)
    
    # Apply date range filter if provided
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    if date_from:
        sales = sales.filter(sale_date__gte=date_from)
    if date_to:
        sales = sales.filter(sale_date__lte=date_to)
    
    # Calculate analytics
    total_sales_amount = sum([sale.total_amount for sale in sales])
    total_amount_received = sum([sale.amount_received for sale in sales])
    total_pending_amount = sum([sale.remaining_amount for sale in sales])
    total_net_amount = sum([sale.net_amount for sale in sales])
    
    # Payment status breakdown
    payment_status_breakdown = []
    for status_choice in Sale.PAYMENT_STATUS_CHOICES:
        status_sales = sales.filter(payment_status=status_choice[0])
        status_amount = sum([sale.total_amount for sale in status_sales])
        payment_status_breakdown.append({
            'status': status_choice[0],
            'status_display': status_choice[1],
            'count': status_sales.count(),
            'total_amount': status_amount,
        })
    
    # Crop breakdown
    crop_breakdown = {}
    for sale in sales:
        crop = sale.crop_name
        if crop in crop_breakdown:
            crop_breakdown[crop]['count'] += 1
            crop_breakdown[crop]['total_amount'] += sale.total_amount
            crop_breakdown[crop]['total_quantity'] += sale.quantity_sold
        else:
            crop_breakdown[crop] = {
                'crop_name': crop,
                'count': 1,
                'total_amount': sale.total_amount,
                'total_quantity': sale.quantity_sold,
                'unit': sale.get_unit_display()
            }
    
    crop_breakdown_list = list(crop_breakdown.values())
    
    # Top buyers
    buyer_breakdown = {}
    for sale in sales:
        buyer = sale.buyer_name
        if buyer in buyer_breakdown:
            buyer_breakdown[buyer]['count'] += 1
            buyer_breakdown[buyer]['total_amount'] += sale.total_amount
        else:
            buyer_breakdown[buyer] = {
                'buyer_name': buyer,
                'count': 1,
                'total_amount': sale.total_amount,
            }
    
    top_buyers = sorted(buyer_breakdown.values(), key=lambda x: x['total_amount'], reverse=True)[:5]
    
    analytics_data = {
        'total_sales_amount': total_sales_amount,
        'total_amount_received': total_amount_received,
        'total_pending_amount': total_pending_amount,
        'total_net_amount': total_net_amount,
        'total_transactions': sales.count(),
        'average_sale_amount': round(total_sales_amount / sales.count() if sales.count() > 0 else 0, 2),
        'payment_completion_rate': round((total_amount_received / total_sales_amount * 100) if total_sales_amount > 0 else 0, 2),
        'payment_status_breakdown': payment_status_breakdown,
        'crop_breakdown': crop_breakdown_list,
        'top_buyers': top_buyers,
        'recent_sales': SaleSerializer(sales[:5], many=True).data
    }
    
    return Response(analytics_data)

# ============================================================================
# NEW FARM-CENTRIC VIEWS FOR FARM USERS
# ============================================================================

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Farm, DailyTask, Notification, SprayIrrigationLog, SpraySchedule, CropStage, Fertigation, Worker, WorkerTask, IssueReport, AgronomistNotification, Expenditure, Sale, PlantDiseasePrediction
from django.contrib.auth import get_user_model
User = get_user_model()
from .serializers import (
    FarmSerializer, CreateFarmSerializer, DailyTaskSerializer, CreateDailyTaskSerializer, 
    NotificationSerializer, SprayIrrigationLogSerializer, CreateSprayIrrigationLogSerializer, 
    SprayScheduleSerializer, CreateSprayScheduleSerializer, UpdateSprayScheduleSerializer,
    CropStageSerializer, CreateCropStageSerializer, FertigationSerializer, CreateFertigationSerializer,
    WorkerSerializer, CreateWorkerSerializer, WorkerTaskSerializer, CreateWorkerTaskSerializer, UpdateWorkerTaskSerializer,
    IssueReportSerializer, CreateIssueReportSerializer, UpdateIssueReportSerializer,
    AgronomistNotificationSerializer, ExpenditureSerializer, CreateExpenditureSerializer, UpdateExpenditureSerializer,
    SaleSerializer, CreateSaleSerializer, UpdateSaleSerializer,
    PlantDiseasePredictionSerializer, CreatePlantDiseasePredictionSerializer,
    UpdatePlantDiseasePredictionSerializer, PlantDiseasePredictionListSerializer
)
from datetime import date
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def create_agronomist_notification(agronomist_user, title, message, notification_type, source_user=None, source_farm=None, related_object_id=None, related_model_name=None):
    """
    Helper function to create persistent agronomist notifications
    """
    return AgronomistNotification.objects.create(
        agronomist_user=agronomist_user,
        title=title,
        message=message,
        notification_type=notification_type,
        source_user=source_user,
        source_farm=source_farm,
        related_object_id=related_object_id,
        related_model_name=related_model_name
    )

def get_farm_access(user, farm_id):
    """Helper function to get farm with proper access control"""
    try:
        if user.is_superuser:
            return Farm.objects.get(id=farm_id, is_active=True)
        elif user.user_type == 'agronomist':
            return Farm.objects.get(id=farm_id, created_by=user, is_active=True)
        else:
            return user.assigned_farms.get(id=farm_id, is_active=True)
    except Farm.DoesNotExist:
        return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_farms(request):
    """Get all farms assigned to the current farm user"""
    try:
        # Debug: Log user information
        print(f"DEBUG: my_farms called by user: {request.user.username}, user_type: {request.user.user_type}")
        
        if request.user.user_type != 'farm_user':
            print(f"DEBUG: User type mismatch - Expected: farm_user, Got: {request.user.user_type}")
            return Response({'error': 'This endpoint is only for farm users'}, status=status.HTTP_403_FORBIDDEN)
        
        # Debug: Check all assigned farms (including inactive)
        all_assigned_farms = request.user.assigned_farms.all()
        print(f"DEBUG: Total assigned farms (all): {all_assigned_farms.count()}")
        for farm in all_assigned_farms:
            print(f"DEBUG: All farms - ID: {farm.id}, Name: {farm.name}, Active: {farm.is_active}")
        
        # Debug: Check assigned active farms only
        farms = request.user.assigned_farms.filter(is_active=True)
        print(f"DEBUG: Found {farms.count()} active assigned farms for user {request.user.username}")
        
        # Debug: Print active farm details
        for farm in farms:
            print(f"DEBUG: Active Farm - ID: {farm.id}, Name: {farm.name}, Active: {farm.is_active}")
        
        # Debug: Check all farms in the system
        from farms.models import Farm
        all_farms_count = Farm.objects.filter(is_active=True).count()
        print(f"DEBUG: Total active farms in system: {all_farms_count}")
        
        serializer = FarmSerializer(farms, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        print(f"ERROR in my_farms endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': 'Internal server error', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_farm_assignments(request):
    """Debug endpoint to check farm assignments - Only for debugging"""
    try:
        # Get all users and their farm assignments
        from accounts.models import CustomUser
        from farms.models import Farm
        
        debug_info = {
            'current_user': {
                'username': request.user.username,
                'user_type': request.user.user_type,
                'id': request.user.id,
                'is_superuser': request.user.is_superuser,
            },
            'all_farms': [],
            'all_farm_users': [],
            'farm_assignments': {}
        }
        
        # Get all farms
        all_farms = Farm.objects.all()
        for farm in all_farms:
            farm_data = {
                'id': farm.id,
                'name': farm.name,
                'location': farm.location,
                'is_active': farm.is_active,
                'created_by': farm.created_by.username if farm.created_by else None,
                'assigned_users': [user.username for user in farm.users.all()]
            }
            debug_info['all_farms'].append(farm_data)
        
        # Get all farm users
        farm_users = CustomUser.objects.filter(user_type='farm_user')
        for user in farm_users:
            user_data = {
                'id': user.id,
                'username': user.username,
                'created_by': user.created_by.username if user.created_by else None,
                'assigned_farms': [{'id': f.id, 'name': f.name} for f in user.assigned_farms.all()]
            }
            debug_info['all_farm_users'].append(user_data)
        
        return Response(debug_info)
        
    except Exception as e:
        print(f"ERROR in debug_farm_assignments: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': 'Debug endpoint error', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_user_dashboard(request):
    """General dashboard for farm users showing overview of all assigned farms"""
    if request.user.user_type != 'farm_user':
        return Response({'error': 'This endpoint is only for farm users'}, status=status.HTTP_403_FORBIDDEN)
    
    farms = request.user.assigned_farms.filter(is_active=True)
    
    dashboard_data = {
        'total_farms': farms.count(),
        'farms': []
    }
    
    for farm in farms:
        # Get basic stats for each farm
        today_tasks = DailyTask.objects.filter(user=request.user, farm=farm, date=date.today()).count()
        total_crop_stages = CropStage.objects.filter(user=request.user, farm=farm).count()
        pending_tasks = WorkerTask.objects.filter(user=request.user, farm=farm, status='pending').count()
        recent_notifications = Notification.objects.filter(user=request.user, farm=farm, is_read=False).count()
        
        farm_data = {
            'id': farm.id,
            'name': farm.name,
            'location': farm.location,
            'size_in_acres': farm.size_in_acres,
            'today_tasks_completed': today_tasks,
            'total_crop_stages': total_crop_stages,
            'pending_tasks': pending_tasks,
            'unread_notifications': recent_notifications
        }
        dashboard_data['farms'].append(farm_data)
    
    return Response(dashboard_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_specific_dashboard(request, farm_id):
    """Specific dashboard for a single farm"""
    if request.user.user_type != 'farm_user':
        return Response({'error': 'This endpoint is only for farm users'}, status=status.HTTP_403_FORBIDDEN)
    
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get comprehensive stats for this specific farm
    today = date.today()
    
    # Daily tasks stats
    today_tasks = DailyTask.objects.filter(user=request.user, farm=farm, date=today).count()
    total_tasks_this_month = DailyTask.objects.filter(
        user=request.user, 
        farm=farm, 
        date__month=today.month,
        date__year=today.year
    ).count()
    
    # Crop stages stats
    crop_stages = CropStage.objects.filter(user=request.user, farm=farm)
    total_crop_stages = crop_stages.count()
    healthy_crops = crop_stages.filter(health_status='healthy').count()
    crops_needing_attention = crop_stages.filter(health_status='needs_attention').count()
    
    # Worker tasks stats
    pending_worker_tasks = WorkerTask.objects.filter(user=request.user, farm=farm, status='pending').count()
    completed_worker_tasks = WorkerTask.objects.filter(user=request.user, farm=farm, status='completed').count()
    
    # Recent activities
    recent_spray_logs = SprayIrrigationLog.objects.filter(
        user=request.user, farm=farm
    ).order_by('-created_at')[:5]
    
    recent_fertigations = Fertigation.objects.filter(
        user=request.user, farm=farm
    ).order_by('-created_at')[:5]
    
    # Notifications for this farm
    unread_notifications = Notification.objects.filter(
        user=request.user, farm=farm, is_read=False
    ).count()
    
    dashboard_data = {
        'farm': FarmSerializer(farm).data,
        'stats': {
            'today_tasks_completed': today_tasks,
            'total_tasks_this_month': total_tasks_this_month,
            'total_crop_stages': total_crop_stages,
            'healthy_crops': healthy_crops,
            'crops_needing_attention': crops_needing_attention,
            'pending_worker_tasks': pending_worker_tasks,
            'completed_worker_tasks': completed_worker_tasks,
            'unread_notifications': unread_notifications
        },
        'recent_activities': {
            'spray_logs': SprayIrrigationLogSerializer(recent_spray_logs, many=True).data,
            'fertigations': FertigationSerializer(recent_fertigations, many=True).data
        }
    }
    
    return Response(dashboard_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_user_notifications(request):
    """Get notifications for farm user from their agronomist"""
    if request.user.user_type != 'farm_user':
        return Response({'error': 'This endpoint is only for farm users'}, status=status.HTTP_403_FORBIDDEN)
    
    notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
    
    # Optional filtering
    farm_id = request.query_params.get('farm_id')
    if farm_id:
        notifications = notifications.filter(farm_id=farm_id)
    
    notification_type = request.query_params.get('type')
    if notification_type:
        notifications = notifications.filter(notification_type=notification_type)
    
    # Pagination
    limit = request.query_params.get('limit', 20)
    try:
        limit = int(limit)
        notifications = notifications[:limit]
    except ValueError:
        notifications = notifications[:20]
    
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)

# ============================================================================
# FARM-SPECIFIC FEATURE VIEWS (No Farm Dropdown Needed)
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_daily_tasks(request, farm_id):
    """Daily tasks for a specific farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        today = date.today()
        if 'date' in request.query_params:
            try:
                task_date = request.query_params['date']
                tasks = DailyTask.objects.filter(user=request.user, farm=farm, date=task_date)
            except:
                tasks = DailyTask.objects.filter(user=request.user, farm=farm, date=today)
        elif 'history' in request.query_params:
            tasks = DailyTask.objects.filter(user=request.user, farm=farm).order_by('-created_at')
        else:
            tasks = DailyTask.objects.filter(user=request.user, farm=farm, date=today)
        
        serializer = DailyTaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        today = date.today()

        # Check if user has already submitted tasks for today for this farm
        existing_task = DailyTask.objects.filter(
            user=request.user,
            farm=farm,
            date=today
        ).first()

        if existing_task:
            return Response({
                'error': 'Daily tasks already submitted for today',
                'message': f'You have already submitted daily tasks for {farm.name} today at {existing_task.created_at.strftime("%H:%M:%S")}',
                'already_submitted': True,
                'submission_time': existing_task.created_at,
                'task_data': DailyTaskSerializer(existing_task).data
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create new task entry for this specific farm
        task = DailyTask.objects.create(
            farm=farm,
            user=request.user,
            date=today,
            farm_hygiene=request.data.get('farm_hygiene', False),
            disease_pest_check=request.data.get('disease_pest_check', False),
            daily_crop_update=request.data.get('daily_crop_update', False),
            trellising=request.data.get('trellising', False),
            spraying=request.data.get('spraying', False),
            cleaning=request.data.get('cleaning', False),
            pruning=request.data.get('pruning', False),
            main_tank_ec=request.data.get('main_tank_ec') or None,
            main_tank_ph=request.data.get('main_tank_ph') or None,
            dripper_ec=request.data.get('dripper_ec') or None,
            dripper_ph=request.data.get('dripper_ph') or None,
        )

        # Create notification for agronomist (farm creator)
        user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        agronomist_user = farm.created_by  # Use farm creator as agronomist

        if agronomist_user and agronomist_user.user_type in ['agronomist', 'superuser']:
            # Count completed tasks
            completed_tasks = []
            if task.farm_hygiene:
                completed_tasks.append("Farm Hygiene")
            if task.disease_pest_check:
                completed_tasks.append("Disease & Pest Check")
            if task.daily_crop_update:
                completed_tasks.append("Daily Crop Update")
            if task.trellising:
                completed_tasks.append("Trellising")
            if task.spraying:
                completed_tasks.append("Spraying")
            if task.cleaning:
                completed_tasks.append("Cleaning")
            if task.pruning:
                completed_tasks.append("Pruning")

            # Check water measurements
            measurements = []
            if task.main_tank_ec or task.main_tank_ph:
                measurements.append("Main Tank")
            if task.dripper_ec or task.dripper_ph:
                measurements.append("Dripper")

            title = "Daily Tasks Completed"
            message = f"{user_name} completed daily tasks for {farm.name}. "
            message += f"Tasks: {', '.join(completed_tasks) if completed_tasks else 'None'}. "
            if measurements:
                message += f"Water measurements recorded for: {', '.join(measurements)}. "
            message += f"Submitted at {task.created_at.strftime('%H:%M:%S')}"

            # Create persistent agronomist notification
            agronomist_notification = create_agronomist_notification(
                agronomist_user=agronomist_user,
                title=title,
                message=message,
                notification_type='daily_task',
                source_user=request.user,
                source_farm=farm,
                related_object_id=task.id,
                related_model_name='DailyTask'
            )

            # Send WebSocket notification
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    notification_data = {
                        'type': 'notification_message',
                        'title': title,
                        'message': message,
                        'notification_type': 'daily_task',
                        'notification_id': agronomist_notification.id,
                        'farm_id': farm.id,
                        'farm_name': farm.name,
                        'user_id': request.user.id,
                        'user_name': user_name,
                        'completed_tasks': completed_tasks,
                        'measurements': measurements,
                        'timestamp': agronomist_notification.created_at.isoformat()
                    }

                    specific_agronomist_group = f'agronomist_{agronomist_user.id}_notifications'
                    async_to_sync(channel_layer.group_send)(specific_agronomist_group, notification_data)
                    async_to_sync(channel_layer.group_send)('agronomist_notifications', notification_data)
                except Exception as e:
                    logger.error(f"Failed to send WebSocket notification: {e}")

        return Response({
            'success': True,
            'message': 'Daily tasks submitted successfully',
            'task_data': DailyTaskSerializer(task).data,
            'notification_sent': agronomist_user is not None
        }, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_daily_task_detail(request, farm_id, task_id):
    """Get, update or delete a specific daily task for a farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    try:
        task = DailyTask.objects.get(
            id=task_id,
            user=request.user,
            farm=farm
        )
    except DailyTask.DoesNotExist:
        return Response({'error': 'Daily task not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = DailyTaskSerializer(task)
        return Response(serializer.data)

    elif request.method == 'PUT':
        # Update existing task
        for field in ['farm_hygiene', 'disease_pest_check', 'daily_crop_update',
                      'trellising', 'spraying', 'cleaning', 'pruning']:
            if field in request.data:
                setattr(task, field, request.data.get(field, False))

        # Update EC/pH measurements
        for field in ['main_tank_ec', 'main_tank_ph', 'dripper_ec', 'dripper_ph']:
            if field in request.data:
                value = request.data.get(field)
                setattr(task, field, value if value else None)

        task.save()

        # Create notification for agronomist (farm creator)
        user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        agronomist_user = farm.created_by  # Use farm creator as agronomist

        if agronomist_user and agronomist_user.user_type in ['agronomist', 'superuser']:
            # Count completed tasks
            completed_tasks = []
            if task.farm_hygiene:
                completed_tasks.append("Farm Hygiene")
            if task.disease_pest_check:
                completed_tasks.append("Disease & Pest Check")
            if task.daily_crop_update:
                completed_tasks.append("Daily Crop Update")
            if task.trellising:
                completed_tasks.append("Trellising")
            if task.spraying:
                completed_tasks.append("Spraying")
            if task.cleaning:
                completed_tasks.append("Cleaning")
            if task.pruning:
                completed_tasks.append("Pruning")

            # Check water measurements
            measurements = []
            if task.main_tank_ec or task.main_tank_ph:
                measurements.append("Main Tank")
            if task.dripper_ec or task.dripper_ph:
                measurements.append("Dripper")

            title = "Daily Tasks Updated"
            message = f"{user_name} updated daily tasks for {farm.name}. "
            message += f"Tasks: {', '.join(completed_tasks) if completed_tasks else 'None'}. "
            if measurements:
                message += f"Water measurements updated for: {', '.join(measurements)}. "
            message += f"Updated at {task.updated_at.strftime('%H:%M:%S')}"

            # Create persistent agronomist notification
            agronomist_notification = create_agronomist_notification(
                agronomist_user=agronomist_user,
                title=title,
                message=message,
                notification_type='daily_task',
                source_user=request.user,
                source_farm=farm,
                related_object_id=task.id,
                related_model_name='DailyTask'
            )

            # Send WebSocket notification
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    notification_data = {
                        'type': 'notification_message',
                        'title': title,
                        'message': message,
                        'notification_type': 'daily_task',
                        'notification_id': agronomist_notification.id,
                        'farm_id': farm.id,
                        'farm_name': farm.name,
                        'user_id': request.user.id,
                        'user_name': user_name,
                        'completed_tasks': completed_tasks,
                        'measurements': measurements,
                        'timestamp': agronomist_notification.created_at.isoformat(),
                        'action': 'updated'
                    }

                    specific_agronomist_group = f'agronomist_{agronomist_user.id}_notifications'
                    async_to_sync(channel_layer.group_send)(specific_agronomist_group, notification_data)
                    async_to_sync(channel_layer.group_send)('agronomist_notifications', notification_data)
                except Exception as e:
                    logger.error(f"Failed to send WebSocket notification: {e}")

        return Response({
            'success': True,
            'message': 'Daily tasks updated successfully',
            'task_data': DailyTaskSerializer(task).data,
            'notification_sent': agronomist_user is not None
        })

    elif request.method == 'DELETE':
        task.delete()
        return Response({'message': 'Daily task deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_crop_stages(request, farm_id):
    """Crop stages for a specific farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        crop_stages = CropStage.objects.filter(user=request.user, farm=farm).order_by('-created_at')
        
        # Optional filtering
        current_stage = request.query_params.get('stage')
        if current_stage:
            crop_stages = crop_stages.filter(current_stage=current_stage)
        
        health_status = request.query_params.get('health')
        if health_status:
            crop_stages = crop_stages.filter(health_status=health_status)
        
        serializer = CropStageSerializer(crop_stages, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = CreateCropStageSerializer(data=request.data)
        if serializer.is_valid():
            crop_stage = serializer.save(user=request.user, farm=farm)
            return Response(CropStageSerializer(crop_stage).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_crop_stage_detail(request, farm_id, stage_id):
    """Specific crop stage detail for a farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        crop_stage = CropStage.objects.get(id=stage_id, user=request.user, farm=farm)
    except CropStage.DoesNotExist:
        return Response({'error': 'Crop stage not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = CropStageSerializer(crop_stage)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = CreateCropStageSerializer(crop_stage, data=request.data, partial=True)
        if serializer.is_valid():
            crop_stage = serializer.save()
            return Response(CropStageSerializer(crop_stage).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        crop_stage.delete()
        return Response({'message': 'Crop stage deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def farm_notifications(request, farm_id):
    """Enhanced farm-specific notifications with complete database isolation and agronomist capabilities"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        # Get notifications ONLY for this specific farm - complete isolation
        notifications = Notification.objects.filter(farm=farm).order_by('-priority', '-created_at')
        
        # For farm users, show their personal notifications + farm-wide announcements
        if request.user.user_type == 'farm_user':
            from django.db import models
            notifications = notifications.filter(
                models.Q(user=request.user, is_farm_wide=False) |  # Personal notifications
                models.Q(is_farm_wide=True, user__isnull=True)     # Farm-wide announcements
            )
        
        # Include unread count
        unread_count = notifications.filter(is_read=False).count()
        
        notifications_data = []
        for notif in notifications:
            notifications_data.append({
                'id': notif.id,
                'title': notif.title,
                'message': notif.message,
                'notification_type': notif.notification_type,
                'priority': notif.priority,
                'is_read': notif.is_read,
                'is_farm_wide': notif.is_farm_wide,
                'created_by': notif.created_by.username if notif.created_by else 'System',
                'created_at': notif.created_at,
                'due_date': notif.due_date,
            })
        
        return Response({
            'notifications': notifications_data,
            'unread_count': unread_count,
            'total_count': len(notifications_data)
        })
    
    elif request.method == 'POST':
        # Only agronomists can create notifications
        if request.user.user_type not in ['agronomist'] and not request.user.is_superuser:
            return Response({'error': 'Only agronomists can create notifications'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate that agronomist has access to this farm
        if not (request.user.is_superuser or farm.created_by == request.user):
            return Response({'error': 'You can only send notifications to farms you manage'}, status=status.HTTP_403_FORBIDDEN)
        
        is_farm_wide = request.data.get('is_farm_wide', False)
        target_user_id = request.data.get('user_id')
        
        # If targeting specific user, validate user has access to this farm
        if target_user_id and not is_farm_wide:
            try:
                target_user = farm.users.get(id=target_user_id)
            except:
                return Response({'error': 'Target user not found or not assigned to this farm'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_user = None
        
        # Create notification specifically for this farm
        notification = Notification.objects.create(
            title=request.data.get('title', ''),
            message=request.data.get('message', ''),
            notification_type=request.data.get('notification_type', 'agronomist_message'),
            priority=request.data.get('priority', 'medium'),
            farm=farm,  # Ensures notification is tied to this specific farm
            user=target_user,  # Specific user or None for farm-wide
            is_farm_wide=is_farm_wide,
            created_by=request.user,  # Track which agronomist created it
            due_date=request.data.get('due_date') if request.data.get('due_date') else None,
        )
        
        return Response({
            'id': notification.id,
            'title': notification.title,
            'message': notification.message,
            'farm_id': farm.id,
            'is_farm_wide': notification.is_farm_wide,
            'priority': notification.priority,
            'created_at': notification.created_at,
        }, status=status.HTTP_201_CREATED)
    
    elif request.method == 'PUT':
        # Mark notifications as read
        notification_ids = request.data.get('notification_ids', [])
        if notification_ids:
            from django.db import models
            
            # Debug: Log the request details
            logger.info(f"User {request.user} attempting to mark notifications as read: {notification_ids} for farm {farm.id}")
            
            # First, let's check what notifications exist
            all_notifications = Notification.objects.filter(
                id__in=notification_ids,
                farm=farm
            )
            
            logger.info(f"Found notifications in farm {farm.id}: {[(n.id, n.user_id, n.is_farm_wide, n.is_read) for n in all_notifications]}")
            
            # Update ALL notifications that the user can see (matching GET request logic)
            # This ensures any notification shown in the UI can be marked as read
            if request.user.user_type == 'farm_user':
                # Farm users can mark read:
                # 1. Their personal notifications 
                # 2. ANY farm-wide notification (regardless of user field)
                notifications_to_update = Notification.objects.filter(
                    id__in=notification_ids,
                    farm=farm
                ).filter(
                    models.Q(user=request.user) |                       # Personal notifications
                    models.Q(is_farm_wide=True)                        # All farm-wide notifications
                )
            else:
                # Agronomist/superuser can mark any notification in their farm as read
                notifications_to_update = Notification.objects.filter(
                    id__in=notification_ids,
                    farm=farm
                )
            
            logger.info(f"Notifications matching access criteria: {[(n.id, n.user_id, n.is_farm_wide, n.is_read) for n in notifications_to_update]}")
            
            updated = notifications_to_update.update(is_read=True)
            
            logger.info(f"Updated {updated} notifications to read status")
            
            if updated > 0:
                return Response({'updated': updated, 'message': f'{updated} notifications marked as read'})
            else:
                return Response({'error': 'No notifications found or already read'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'error': 'No notification IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def agronomist_notifications(request):
    """Agronomist notification management - send notifications to specific farms/users"""
    if request.user.user_type not in ['agronomist'] and not request.user.is_superuser:
        return Response({'error': 'Only agronomists can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get all farms managed by this agronomist
        if request.user.is_superuser:
            managed_farms = Farm.objects.filter(is_active=True)
        else:
            managed_farms = Farm.objects.filter(created_by=request.user, is_active=True)
        
        farms_data = []
        for farm in managed_farms:
            # Get farm users
            farm_users = farm.users.filter(user_type='farm_user')
            users_data = [{'id': user.id, 'username': user.username, 'full_name': f"{user.first_name} {user.last_name}".strip()} for user in farm_users]
            
            # Get recent notifications sent to this farm
            recent_notifications = Notification.objects.filter(
                farm=farm, 
                created_by=request.user
            ).order_by('-created_at')[:5]
            
            notifications_data = []
            for notif in recent_notifications:
                notifications_data.append({
                    'id': notif.id,
                    'title': notif.title,
                    'notification_type': notif.notification_type,
                    'priority': notif.priority,
                    'is_farm_wide': notif.is_farm_wide,
                    'target_user': notif.user.username if notif.user else 'All Users',
                    'created_at': notif.created_at,
                })
            
            farms_data.append({
                'id': farm.id,
                'name': farm.name,
                'location': farm.location,
                'users': users_data,
                'recent_notifications': notifications_data,
            })
        
        return Response({'farms': farms_data})
    
    elif request.method == 'POST':
        # Send notification to specific farm
        farm_id = request.data.get('farm_id')
        if not farm_id:
            return Response({'error': 'Farm ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate admin has access to this farm
        try:
            if request.user.is_superuser:
                farm = Farm.objects.get(id=farm_id, is_active=True)
            else:
                farm = Farm.objects.get(id=farm_id, created_by=request.user, is_active=True)
        except Farm.DoesNotExist:
            return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
        
        is_farm_wide = request.data.get('is_farm_wide', False)
        target_user_ids = request.data.get('user_ids', [])
        
        notifications_created = []
        
        if is_farm_wide:
            # Create farm-wide notification
            notification = Notification.objects.create(
                title=request.data.get('title', ''),
                message=request.data.get('message', ''),
                notification_type=request.data.get('notification_type', 'farm_announcement'),
                priority=request.data.get('priority', 'medium'),
                farm=farm,
                user=None,
                is_farm_wide=True,
                created_by=request.user,
                due_date=request.data.get('due_date') if request.data.get('due_date') else None,
            )
            notifications_created.append(notification.id)
        else:
            # Create notifications for specific users
            if not target_user_ids:
                return Response({'error': 'User IDs are required for user-specific notifications'}, status=status.HTTP_400_BAD_REQUEST)
            
            for user_id in target_user_ids:
                try:
                    target_user = farm.users.get(id=user_id)
                    notification = Notification.objects.create(
                        title=request.data.get('title', ''),
                        message=request.data.get('message', ''),
                        notification_type=request.data.get('notification_type', 'agronomist_message'),
                        priority=request.data.get('priority', 'medium'),
                        farm=farm,
                        user=target_user,
                        is_farm_wide=False,
                        created_by=request.user,
                        due_date=request.data.get('due_date') if request.data.get('due_date') else None,
                    )
                    notifications_created.append(notification.id)
                except:
                    continue  # Skip invalid user IDs
        
        return Response({
            'message': f'{len(notifications_created)} notification(s) sent successfully',
            'notifications_created': notifications_created,
            'farm_id': farm.id,
        }, status=status.HTTP_201_CREATED)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_sales(request, farm_id):
    """Farm-specific sales - complete database isolation per farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        # Get sales ONLY for this specific farm - complete isolation
        sales = Sale.objects.filter(farm=farm, user=request.user)
        
        # Apply filters if provided
        payment_status = request.GET.get('payment_status')
        if payment_status:
            sales = sales.filter(payment_status=payment_status)
            
        crop_name = request.GET.get('crop_name')
        if crop_name:
            sales = sales.filter(crop_name__icontains=crop_name)
            
        buyer_name = request.GET.get('buyer_name')
        if buyer_name:
            sales = sales.filter(buyer_name__icontains=buyer_name)
            
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        if date_from:
            sales = sales.filter(sale_date__gte=date_from)
        if date_to:
            sales = sales.filter(sale_date__lte=date_to)
        
        # Serialize sales data
        sales_data = []
        for sale in sales:
            sales_data.append({
                'id': sale.id,
                'crop_name': sale.crop_name,
                'batch_code': sale.batch_code,
                'quantity_sold': float(sale.quantity_sold) if sale.quantity_sold else 0,
                'unit': sale.unit,
                'price_per_unit': float(sale.price_per_unit) if sale.price_per_unit else 0,
                'total_amount': float(sale.total_amount),
                'buyer_name': sale.buyer_name,
                'buyer_contact': sale.buyer_contact,
                'sale_date': sale.sale_date,
                'payment_status': sale.payment_status,
                'amount_received': float(sale.amount_received),
                'quality_grade': sale.quality_grade,
                'notes': sale.notes,
                'created_at': sale.created_at,
            })
        
        return Response(sales_data)
    
    elif request.method == 'POST':
        # Create sale for this specific farm only
        data = request.data.copy()
        
        sale = Sale.objects.create(
            farm=farm,  # Ensures sale is tied to this specific farm only
            user=request.user,
            crop_name=data.get('crop_name', ''),
            batch_code=data.get('batch_code', ''),
            quantity_sold=data.get('quantity_sold'),
            unit=data.get('unit', 'kg'),
            price_per_unit=data.get('price_per_unit'),
            total_amount=data.get('total_amount', 0),
            buyer_name=data.get('buyer_name', ''),
            buyer_contact=data.get('buyer_contact', ''),
            buyer_address=data.get('buyer_address', ''),
            sale_date=data.get('sale_date'),
            payment_status=data.get('payment_status', 'pending'),
            payment_due_date=data.get('payment_due_date'),
            amount_received=data.get('amount_received', 0),
            quality_grade=data.get('quality_grade', ''),
            transportation_cost=data.get('transportation_cost', 0),
            commission_amount=data.get('commission_amount', 0),
            notes=data.get('notes', ''),
            invoice_number=data.get('invoice_number', ''),
        )
        
        return Response({
            'id': sale.id,
            'crop_name': sale.crop_name,
            'total_amount': float(sale.total_amount),
            'farm_id': farm.id,
            'created_at': sale.created_at,
        }, status=status.HTTP_201_CREATED)

# Farm-specific Spray Schedules
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_spray_schedules(request, farm_id):
    """Spray schedules for a specific farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        spray_schedules = SpraySchedule.objects.filter(farm=farm, user=request.user).order_by('-date_time')

        # Apply filters
        reason_filter = request.GET.get('reason')
        if reason_filter:
            spray_schedules = spray_schedules.filter(reason=reason_filter)

        status_filter = request.GET.get('status')
        if status_filter == 'completed':
            spray_schedules = spray_schedules.filter(is_completed=True)
        elif status_filter == 'pending':
            spray_schedules = spray_schedules.filter(is_completed=False)

        serializer = SprayScheduleSerializer(spray_schedules, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Add farm to request data for validation
        data = request.data.copy()
        data['farm'] = farm.id
        serializer = CreateSprayScheduleSerializer(data=data)
        if serializer.is_valid():
            spray_schedule = serializer.save(user=request.user)
            return Response(SprayScheduleSerializer(spray_schedule).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_spray_schedule_detail(request, farm_id, schedule_id):
    """Specific spray schedule detail for a farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    try:
        spray_schedule = SpraySchedule.objects.get(id=schedule_id, farm=farm, user=request.user)
    except SpraySchedule.DoesNotExist:
        return Response({'error': 'Spray schedule not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = SprayScheduleSerializer(spray_schedule)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UpdateSprayScheduleSerializer(spray_schedule, data=request.data, partial=True)
        if serializer.is_valid():
            updated_schedule = serializer.save()
            return Response(SprayScheduleSerializer(updated_schedule).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        if spray_schedule.is_completed:
            return Response({'error': 'Cannot delete completed spray schedules'}, status=status.HTTP_400_BAD_REQUEST)
        spray_schedule.delete()
        return Response({'message': 'Spray schedule deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

# Farm-specific Fertigations
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_fertigations(request, farm_id):
    """Fertigations for a specific farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        fertigations = Fertigation.objects.filter(farm=farm, user=request.user).order_by('-date_time')
        serializer = FertigationSerializer(fertigations, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Add farm to request data for validation
        data = request.data.copy()
        data['farm'] = farm.id
        serializer = CreateFertigationSerializer(data=data)
        if serializer.is_valid():
            fertigation = serializer.save(user=request.user)
            return Response(FertigationSerializer(fertigation).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_fertigation_detail(request, farm_id, pk):
    """Specific fertigation detail for a farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    try:
        fertigation = Fertigation.objects.get(id=pk, farm=farm, user=request.user)
    except Fertigation.DoesNotExist:
        return Response({'error': 'Fertigation not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = FertigationSerializer(fertigation)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = CreateFertigationSerializer(fertigation, data=request.data, partial=True)
        if serializer.is_valid():
            updated_fertigation = serializer.save()
            return Response(FertigationSerializer(updated_fertigation).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        fertigation.delete()
        return Response({'message': 'Fertigation deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

# Farm-specific Workers
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_workers(request, farm_id):
    """Workers for a specific farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        workers = Worker.objects.filter(farm=farm, user=request.user).order_by('-created_at')
        serializer = WorkerSerializer(workers, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Add farm to request data for validation
        data = request.data.copy()
        data['farm'] = farm.id
        serializer = CreateWorkerSerializer(data=data)
        if serializer.is_valid():
            worker = serializer.save(user=request.user)
            return Response(WorkerSerializer(worker).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_worker_detail(request, farm_id, worker_id):
    """Specific worker detail for a farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    try:
        worker = Worker.objects.get(id=worker_id, farm=farm, user=request.user)
    except Worker.DoesNotExist:
        return Response({'error': 'Worker not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = WorkerSerializer(worker)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = CreateWorkerSerializer(worker, data=request.data, partial=True)
        if serializer.is_valid():
            updated_worker = serializer.save()
            return Response(WorkerSerializer(updated_worker).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        worker.delete()
        return Response({'message': 'Worker deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

# Farm-specific Worker Tasks
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_worker_tasks(request, farm_id):
    """Worker tasks for a specific farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        worker_tasks = WorkerTask.objects.filter(farm=farm, user=request.user).order_by('-created_at')
        serializer = WorkerTaskSerializer(worker_tasks, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Add farm to request data for validation
        data = request.data.copy()
        data['farm'] = farm.id
        serializer = CreateWorkerTaskSerializer(data=data)
        if serializer.is_valid():
            worker_task = serializer.save(user=request.user)
            return Response(WorkerTaskSerializer(worker_task).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_worker_task_detail(request, farm_id, task_id):
    """Specific worker task detail for a farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    try:
        worker_task = WorkerTask.objects.get(id=task_id, farm=farm, user=request.user)
    except WorkerTask.DoesNotExist:
        return Response({'error': 'Worker task not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = WorkerTaskSerializer(worker_task)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = CreateWorkerTaskSerializer(worker_task, data=request.data, partial=True)
        if serializer.is_valid():
            updated_task = serializer.save()
            return Response(WorkerTaskSerializer(updated_task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        worker_task.delete()
        return Response({'message': 'Worker task deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

# Farm-specific Issue Reports
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_issue_reports(request, farm_id):
    """Issue reports for a specific farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        issue_reports = IssueReport.objects.filter(farm=farm, farm_user=request.user).order_by('-created_at')
        serializer = IssueReportSerializer(issue_reports, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Add farm to request data for validation
        data = request.data.copy()
        data['farm'] = farm.id
        serializer = CreateIssueReportSerializer(data=data)
        if serializer.is_valid():
            issue_report = serializer.save(farm_user=request.user)
            return Response(IssueReportSerializer(issue_report).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_issue_report_detail(request, farm_id, issue_id):
    """Specific issue report detail for a farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    try:
        issue_report = IssueReport.objects.get(id=issue_id, farm=farm, farm_user=request.user)
    except IssueReport.DoesNotExist:
        return Response({'error': 'Issue report not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = IssueReportSerializer(issue_report)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UpdateIssueReportSerializer(issue_report, data=request.data, partial=True)
        if serializer.is_valid():
            updated_report = serializer.save()
            return Response(IssueReportSerializer(updated_report).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        if issue_report.status != 'reported':
            return Response({'error': 'Cannot delete issue that is already being reviewed or resolved'}, status=status.HTTP_400_BAD_REQUEST)
        issue_report.delete()
        return Response({'message': 'Issue report deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

# Farm-specific Expenditures
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_expenditures(request, farm_id):
    """Expenditures for a specific farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        expenditures = Expenditure.objects.filter(farm=farm, user=request.user).order_by('-expense_date')
        serializer = ExpenditureSerializer(expenditures, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Add farm to request data for validation
        data = request.data.copy()
        data['farm'] = farm.id
        serializer = CreateExpenditureSerializer(data=data)
        if serializer.is_valid():
            expenditure = serializer.save(user=request.user)
            return Response(ExpenditureSerializer(expenditure).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_expenditure_detail(request, farm_id, expenditure_id):
    """Specific expenditure detail for a farm"""
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    try:
        expenditure = Expenditure.objects.get(id=expenditure_id, farm=farm, user=request.user)
    except Expenditure.DoesNotExist:
        return Response({'error': 'Expenditure not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ExpenditureSerializer(expenditure)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = CreateExpenditureSerializer(expenditure, data=request.data, partial=True)
        if serializer.is_valid():
            updated_expenditure = serializer.save()
            return Response(ExpenditureSerializer(updated_expenditure).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        expenditure.delete()
        return Response({'message': 'Expenditure deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

# Plant Disease & Pest Analysis Views with Gemini AI Integration

import google.generativeai as genai
import base64
import io
import json
import time
from PIL import Image
from django.conf import settings
from decouple import config

# Configure Gemini AI
genai.configure(api_key=config('GEMINI_API_KEY'))

def extract_image_metadata(image_data):
    """
    Extract metadata from base64 encoded image
    """
    try:
        # Decode base64 image
        if image_data.startswith('data:image/'):
            # Extract format from data URL
            format_part = image_data.split(';')[0].split('/')[-1]
            # Remove data URL prefix
            base64_data = image_data.split(',')[1]
        else:
            format_part = 'unknown'
            base64_data = image_data

        image_bytes = base64.b64decode(base64_data)

        # Calculate size in bytes
        size_bytes = len(image_bytes)

        # Open image to get dimensions
        image = Image.open(io.BytesIO(image_bytes))
        width, height = image.size

        # Get format
        image_format = image.format.lower() if image.format else format_part

        return {
            'size_bytes': size_bytes,
            'width': width,
            'height': height,
            'format': image_format
        }

    except Exception as e:
        logger.warning(f"Failed to extract image metadata: {str(e)}")
        return {
            'size_bytes': None,
            'width': None,
            'height': None,
            'format': None
        }

def analyze_plant_image_with_gemini(image_data, model_version='gemini-2.5-pro'):
    """
    Analyze plant image using Gemini AI for disease detection with plant validation
    """
    try:
        start_time = time.time()

        # Initialize the model
        model = genai.GenerativeModel(model_version)

        # Decode base64 image
        if image_data.startswith('data:image/'):
            # Remove data URL prefix
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))

        # First, validate if the image contains plant material
        validation_prompt = """
        IMPORTANT: You are a strict plant identification expert. Analyze this image and determine if it shows plant material (leaves, stems, flowers, fruits, or any plant parts).

        Respond with ONLY a JSON object in this exact format:
        {
            "is_plant": true/false,
            "confidence": 0-100,
            "description": "Brief description of what you see"
        }

        STRICT RULES:
        - Only return true if you can clearly see plant material (leaves, stems, flowers, fruits, etc.)
        - Return false for: animals, people, objects, buildings, landscapes without clear plant focus
        - Return false if the image is unclear, too dark, or you cannot identify plant material with confidence
        - Be very strict - when in doubt, return false
        """

        # Validate plant content first
        validation_response = model.generate_content([validation_prompt, image])

        try:
            validation_text = validation_response.text.strip()
            # Extract JSON from validation response
            json_start = validation_text.find('{')
            json_end = validation_text.rfind('}') + 1

            if json_start != -1 and json_end != -1:
                validation_json = json.loads(validation_text[json_start:json_end])

                # Check if it's a plant image
                if not validation_json.get('is_plant', False) or validation_json.get('confidence', 0) < 70:
                    return {
                        'success': False,
                        'error': 'Please upload an image that clearly shows plant leaves, stems, or other plant parts. The uploaded image does not appear to contain identifiable plant material.',
                        'processing_time_ms': int((time.time() - start_time) * 1000),
                        'model_version': model_version
                    }
            else:
                # If we can't parse validation, be conservative
                return {
                    'success': False,
                    'error': 'Unable to validate if the image contains plant material. Please ensure you upload a clear image of plant leaves or other plant parts.',
                    'processing_time_ms': int((time.time() - start_time) * 1000),
                    'model_version': model_version
                }

        except (json.JSONDecodeError, KeyError):
            # If validation fails, be conservative
            return {
                'success': False,
                'error': 'Unable to validate if the image contains plant material. Please ensure you upload a clear image of plant leaves or other plant parts.',
                'processing_time_ms': int((time.time() - start_time) * 1000),
                'model_version': model_version
            }

        # Now proceed with disease analysis since we confirmed it's a plant
        analysis_prompt = """
        You are an expert plant pathologist and agricultural specialist. This image has been confirmed to contain plant material.
        Analyze this plant image for any diseases, pests, or health issues.

        CRITICAL INSTRUCTIONS:
        1. ONLY analyze if you can clearly see plant leaves, stems, or plant parts
        2. If the plant parts are not clearly visible or identifiable, return "uncertain" status
        3. Be conservative in your diagnosis - only report diseases if you are confident
        4. Provide specific, actionable advice

        Respond with ONLY a JSON object in this exact format:
        {
            "disease_status": "healthy" | "diseased" | "uncertain",
            "confidence_score": 0-100,
            "confidence_level": "high" | "medium" | "low",
            "diseases_detected": [
                {
                    "name": "Disease Name",
                    "confidence": 0-100,
                    "severity": "mild" | "moderate" | "severe",
                    "description": "Brief description of the disease"
                }
            ],
            "analysis": "Detailed analysis of the plant's health condition",
            "remedies": "Recommended treatments and remedies",
            "prevention": "Prevention tips for future care"
        }

        STRICT GUIDELINES:
        - confidence_level: "high" if confidence_score >80%, "medium" if 50-80%, "low" if <50%
        - disease_status: "healthy" if no issues detected, "diseased" if problems found, "uncertain" if unclear
        - Only include diseases you can identify with reasonable confidence
        - Provide specific, actionable remedies and prevention tips
        - Include both organic and chemical treatment options when applicable
        - If you cannot clearly see plant details, return "uncertain" status with low confidence
        """

        # Generate disease analysis
        response = model.generate_content([analysis_prompt, image])
        processing_time = int((time.time() - start_time) * 1000)

        # Parse the response
        try:
            response_text = response.text.strip()

            # Find JSON in the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1

            if json_start != -1 and json_end != -1:
                json_text = response_text[json_start:json_end]
                parsed_response = json.loads(json_text)

                # Validate required fields
                required_fields = ['disease_status', 'confidence_score', 'confidence_level', 'analysis']
                for field in required_fields:
                    if field not in parsed_response:
                        raise KeyError(f"Missing required field: {field}")

            else:
                raise json.JSONDecodeError("No valid JSON found in response", response_text, 0)

        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse AI response: {str(e)}")
            # Fallback response with conservative analysis
            parsed_response = {
                "disease_status": "uncertain",
                "confidence_score": 30,
                "confidence_level": "low",
                "diseases_detected": [],
                "analysis": f"AI analysis completed but response format was unclear. Raw response: {response_text[:500]}...",
                "remedies": "Please consult with a local agricultural expert for specific recommendations.",
                "prevention": "Maintain proper plant care practices including adequate watering, nutrition, and pest monitoring."
            }

        return {
            'success': True,
            'data': parsed_response,
            'processing_time_ms': processing_time,
            'model_version': model_version
        }

    except Exception as e:
        logger.error(f"Gemini AI analysis failed: {str(e)}")
        return {
            'success': False,
            'error': f"AI analysis failed: {str(e)}",
            'processing_time_ms': int((time.time() - start_time) * 1000) if 'start_time' in locals() else None,
            'model_version': model_version
        }

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_plant_disease(request):
    """
    Analyze plant image for disease detection using Gemini AI
    """
    if request.user.user_type not in ['farm_user', 'agronomist'] and not request.user.is_superuser:
        return Response({'error': 'Only farm users and agronomists can analyze plant diseases'}, status=status.HTTP_403_FORBIDDEN)

    serializer = CreatePlantDiseasePredictionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Get the farm and verify user access
    farm_id = serializer.validated_data['farm'].id
    farm = Farm.objects.get(id=farm_id)

    # Check if user has access to this farm
    if request.user.user_type == 'farm_user' and request.user not in farm.users.all():
        return Response({'error': 'You do not have access to this farm'}, status=status.HTTP_403_FORBIDDEN)

    try:
        # Extract image metadata before analysis
        image_data = serializer.validated_data['image_data']
        image_metadata = extract_image_metadata(image_data)

        # Analyze image with Gemini AI
        ai_result = analyze_plant_image_with_gemini(
            image_data,
            model_version='gemini-2.5-pro'
        )

        if not ai_result['success']:
            return Response({
                'error': 'Failed to analyze image with AI',
                'details': ai_result.get('error', 'Unknown error')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        ai_data = ai_result['data']

        # Create prediction record with image metadata
        prediction = PlantDiseasePrediction.objects.create(
            farm=farm,
            user=request.user,
            crop_stage=serializer.validated_data.get('crop_stage'),
            image_data=image_data,
            image_filename=serializer.validated_data.get('image_filename', ''),
            image_size_bytes=image_metadata.get('size_bytes'),
            image_width=image_metadata.get('width'),
            image_height=image_metadata.get('height'),
            image_format=image_metadata.get('format'),
            disease_status=ai_data.get('disease_status', 'uncertain'),
            diseases_detected=ai_data.get('diseases_detected', []),
            confidence_level=ai_data.get('confidence_level', 'medium'),
            confidence_score=ai_data.get('confidence_score'),
            ai_analysis=ai_data.get('analysis', ''),
            remedies_suggested=ai_data.get('remedies', ''),
            prevention_tips=ai_data.get('prevention', ''),
            gemini_model_version=ai_result['model_version'],
            processing_time_ms=ai_result['processing_time_ms'],
            user_notes=serializer.validated_data.get('user_notes', ''),
            location_in_farm=serializer.validated_data.get('location_in_farm', '')
        )

        # Create notification for farm-wide visibility
        if prediction.disease_status == 'diseased':
            disease_names = [d.get('name', 'Unknown') for d in prediction.diseases_detected]
            title = f"Plant Disease & Pest Detected: {', '.join(disease_names[:2])}"
            message = f"Disease detected in {farm.name}. Location: {prediction.location_in_farm or 'Not specified'}. Confidence: {prediction.confidence_level}"

            Notification.objects.create(
                title=title,
                message=message,
                notification_type='general',
                farm=farm,
                user=None,  # Farm-wide notification
                is_farm_wide=True,
                priority='high' if prediction.confidence_level == 'high' else 'medium',
                related_object_id=prediction.id
            )

        return Response(PlantDiseasePredictionSerializer(prediction).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error creating plant disease prediction: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_plant_disease_predictions(request):
    """
    Get plant disease predictions for user's farms
    """
    if request.user.user_type not in ['farm_user', 'agronomist'] and not request.user.is_superuser:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    farm_id = request.GET.get('farm_id')
    if not farm_id:
        return Response({'error': 'farm_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        farm = Farm.objects.get(id=farm_id)

        # Check user access to farm
        if request.user.user_type == 'farm_user' and request.user not in farm.users.all():
            return Response({'error': 'You do not have access to this farm'}, status=status.HTTP_403_FORBIDDEN)

        predictions = PlantDiseasePrediction.objects.filter(farm=farm).select_related(
            'farm', 'user', 'crop_stage'
        )

        # Apply filters
        status_filter = request.GET.get('status')
        if status_filter:
            predictions = predictions.filter(disease_status=status_filter)

        confidence_filter = request.GET.get('confidence')
        if confidence_filter:
            predictions = predictions.filter(confidence_level=confidence_filter)

        resolved_filter = request.GET.get('resolved')
        if resolved_filter is not None:
            predictions = predictions.filter(is_resolved=resolved_filter.lower() == 'true')

        # Pagination
        page_size = min(int(request.GET.get('page_size', 20)), 100)
        page = int(request.GET.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size

        total_count = predictions.count()
        predictions = predictions[start:end]

        serializer = PlantDiseasePredictionListSerializer(predictions, many=True)

        return Response({
            'results': serializer.data,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        })

    except Farm.DoesNotExist:
        return Response({'error': 'Farm not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error fetching predictions: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_plant_disease_prediction_detail(request, prediction_id):
    """
    Get detailed plant disease prediction
    """
    try:
        prediction = PlantDiseasePrediction.objects.select_related(
            'farm', 'user', 'crop_stage'
        ).get(id=prediction_id)

        # Check user access
        if request.user.user_type == 'farm_user' and request.user not in prediction.farm.users.all():
            return Response({'error': 'You do not have access to this prediction'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PlantDiseasePredictionSerializer(prediction)
        return Response(serializer.data)

    except PlantDiseasePrediction.DoesNotExist:
        return Response({'error': 'Prediction not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error fetching prediction detail: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_plant_disease_prediction(request, prediction_id):
    """
    Update plant disease prediction (user notes, resolution status, actions taken)
    """
    try:
        prediction = PlantDiseasePrediction.objects.get(id=prediction_id)

        # Check user access
        if request.user.user_type == 'farm_user' and request.user not in prediction.farm.users.all():
            return Response({'error': 'You do not have access to this prediction'}, status=status.HTTP_403_FORBIDDEN)

        serializer = UpdatePlantDiseasePredictionSerializer(prediction, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()

            # If marked as resolved, create notification
            if serializer.validated_data.get('is_resolved') and not prediction.is_resolved:
                Notification.objects.create(
                    title="Plant Disease & Pest Issue Resolved",
                    message=f"Disease issue in {prediction.farm.name} has been marked as resolved by {request.user.username}",
                    notification_type='general',
                    farm=prediction.farm,
                    user=None,
                    is_farm_wide=True,
                    priority='low',
                    related_object_id=prediction.id
                )

            return Response(PlantDiseasePredictionSerializer(prediction).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except PlantDiseasePrediction.DoesNotExist:
        return Response({'error': 'Prediction not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error updating prediction: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# FARM TASKS MANAGEMENT (Farm-Specific with Complete Data Isolation)
# Farm users can create and manage tasks for themselves
# Ensures hierarchical structure: Farm -> Farm User -> Tasks
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def farm_tasks(request, farm_id):
    """
    GET: List all tasks for a specific farm (only tasks for current user in this farm)
    POST: Create a new task for a specific farm
    
    Data isolation: Users can only see/create tasks for farms they are assigned to.
    Hierarchy: Agronomist -> Farm -> Farm User -> Tasks
    """
    from .serializers import FarmTaskSerializer, CreateFarmTaskSerializer
    from .models import FarmTask
    
    # Get farm with access control
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        # Complete data isolation: Only show tasks for THIS farm AND THIS user
        tasks = FarmTask.objects.filter(farm=farm, user=request.user).select_related('farm', 'user')
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            tasks = tasks.filter(status=status_filter)
        
        priority_filter = request.query_params.get('priority')
        if priority_filter:
            tasks = tasks.filter(priority=priority_filter)
        
        date_from = request.query_params.get('date_from')
        if date_from:
            tasks = tasks.filter(due_date__gte=date_from)
        
        date_to = request.query_params.get('date_to')
        if date_to:
            tasks = tasks.filter(due_date__lte=date_to)
        
        # Order by: pending/in_progress first, then by due date, then by priority
        tasks = tasks.order_by('status', 'due_date', '-priority', '-created_at')
        
        serializer = FarmTaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new task for this farm
        data = request.data.copy()
        
        # Enforce data isolation: set farm to current farm
        data['farm'] = farm.id
        
        serializer = CreateFarmTaskSerializer(data=data)
        if serializer.is_valid():
            # Save with current user
            task = serializer.save(user=request.user)
            return Response(FarmTaskSerializer(task).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def farm_task_detail(request, farm_id, task_id):
    """
    GET: Retrieve a specific task
    PUT: Update a specific task
    DELETE: Delete a specific task
    
    Data isolation: Users can only access tasks they created in their assigned farms
    """
    from .serializers import FarmTaskSerializer, CreateFarmTaskSerializer
    from .models import FarmTask
    
    # Get farm with access control
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        # Complete data isolation: Task must belong to THIS farm AND THIS user
        task = FarmTask.objects.select_related('farm', 'user').get(
            id=task_id,
            farm=farm,
            user=request.user
        )
    except FarmTask.DoesNotExist:
        return Response({'error': 'Task not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = FarmTaskSerializer(task)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        data = request.data.copy()
        
        # Prevent changing farm or user
        data.pop('farm', None)
        data.pop('user', None)

        # Handle status change to completed
        if data.get('status') == 'completed' and task.status != 'completed':
            from django.utils import timezone
            data['completed_at'] = timezone.now()
        elif data.get('status') != 'completed':
            data['completed_at'] = None
        
        serializer = FarmTaskSerializer(task, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_tasks_summary(request, farm_id):
    """
    Get summary/analytics for farm tasks
    
    Data isolation: Only tasks for current user in this farm
    """
    from .models import FarmTask
    from django.db.models import Count, Q
    from datetime import date
    
    # Get farm with access control
    farm = get_farm_access(request.user, farm_id)
    if not farm:
        return Response({'error': 'Farm not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
    
    # Complete data isolation: Only THIS farm AND THIS user
    tasks = FarmTask.objects.filter(farm=farm, user=request.user)
    
    # Calculate statistics
    total_tasks = tasks.count()
    pending_tasks = tasks.filter(status='pending').count()
    in_progress_tasks = tasks.filter(status='in_progress').count()
    completed_tasks = tasks.filter(status='completed').count()
    
    # Overdue tasks (pending or in_progress with due_date in past)
    today = date.today()
    overdue_tasks = tasks.filter(
        Q(status='pending') | Q(status='in_progress'),
        due_date__lt=today
    ).count()
    
    # Tasks by priority
    high_priority = tasks.filter(priority='high', status__in=['pending', 'in_progress']).count()
    medium_priority = tasks.filter(priority='medium', status__in=['pending', 'in_progress']).count()
    low_priority = tasks.filter(priority='low', status__in=['pending', 'in_progress']).count()
    
    # Due this week
    from datetime import timedelta
    week_end = today + timedelta(days=7)
    due_this_week = tasks.filter(
        status__in=['pending', 'in_progress'],
        due_date__gte=today,
        due_date__lte=week_end
    ).count()
    
    return Response({
        'total_tasks': total_tasks,
        'pending_tasks': pending_tasks,
        'in_progress_tasks': in_progress_tasks,
        'completed_tasks': completed_tasks,
        'overdue_tasks': overdue_tasks,
        'high_priority_active': high_priority,
        'medium_priority_active': medium_priority,
        'low_priority_active': low_priority,
        'due_this_week': due_this_week,
    })

