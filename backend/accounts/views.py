from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import CustomUser
from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_farm_user(request):
    if not (request.user.user_type == 'admin' or request.user.is_superuser):
        return Response({'error': 'Only admins and superusers can create farm users'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save(user_type='farm_user', created_by=request.user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farm_users(request):
    if not (request.user.user_type == 'admin' or request.user.is_superuser):
        return Response({'error': 'Only admins and superusers can view farm users'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.user.is_superuser:
        farm_users = CustomUser.objects.filter(user_type='farm_user', is_superuser=False)
    elif request.user.user_type == 'admin':
        # Get only farm users created by this admin
        farm_users = CustomUser.objects.filter(
            user_type='farm_user', 
            is_superuser=False,
            created_by=request.user
        )
    
    serializer = UserSerializer(farm_users, many=True)
    return Response(serializer.data)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not current_password or not new_password:
        return Response({'error': 'Current password and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not request.user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    request.user.set_password(new_password)
    request.user.save()
    
    return Response({'message': 'Password updated successfully'})

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_farm_user(request, user_id):
    if not (request.user.user_type == 'admin' or request.user.is_superuser):
        return Response({'error': 'Only admins and superusers can manage farm users'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        if request.user.is_superuser:
            user = CustomUser.objects.get(id=user_id, user_type='farm_user')
        elif request.user.user_type == 'admin':
            # Admin can only manage farm users they created
            user = CustomUser.objects.get(
                id=user_id, 
                user_type='farm_user',
                created_by=request.user
            )
    except CustomUser.DoesNotExist:
        return Response({'error': 'Farm user not found or not accessible'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Handle farm assignment
            if 'assigned_farm' in request.data:
                user.assigned_farms.clear()
                if request.data['assigned_farm']:
                    from farms.models import Farm
                    try:
                        farm = Farm.objects.get(id=request.data['assigned_farm'])
                        farm.users.add(user)
                    except Farm.DoesNotExist:
                        pass
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        user.delete()
        return Response({'message': 'Farm user deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

# Password reset functionality for superusers and admins
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_user_password(request, user_id):
    # Only superusers and admins can reset other users' passwords
    if not (request.user.is_superuser or request.user.user_type == 'admin'):
        return Response({'error': 'Only superusers and admins can reset user passwords'}, status=status.HTTP_403_FORBIDDEN)
    
    new_password = request.data.get('new_password')
    if not new_password:
        return Response({'error': 'New password is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters long'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = CustomUser.objects.get(id=user_id)
        
        # Permission checks based on user type
        if request.user.is_superuser:
            # Superusers can reset any non-superuser password
            if user.is_superuser and user != request.user:
                return Response({'error': 'Cannot reset another superuser\'s password'}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.user_type == 'admin':
            # Admins can only reset farm user passwords from their own farms
            if user.user_type != 'farm_user':
                return Response({'error': 'Admins can only reset farm user passwords'}, status=status.HTTP_403_FORBIDDEN)
            
            # Check if the farm user was created by this admin
            if user.created_by != request.user:
                return Response({'error': 'You can only reset passwords for farm users you created'}, status=status.HTTP_403_FORBIDDEN)
        
        user.set_password(new_password)
        user.save()
        
        return Response({
            'message': f'Password reset successfully for user: {user.username}',
            'user_type': 'Superuser' if user.is_superuser else user.user_type.title(),
            'username': user.username
        })
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_users(request):
    # Only superusers can view all users
    if not request.user.is_superuser:
        return Response({'error': 'Only superusers can view all users'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all users except other superusers
    users = CustomUser.objects.filter(is_superuser=False).order_by('-date_joined')
    
    user_data = []
    for user in users:
        user_info = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'user_type': user.user_type,
            'is_active': user.is_active,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
            'created_by': user.created_by.username if user.created_by else None,
        }
        user_data.append(user_info)
    
    return Response(user_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admins(request):
    # Only superusers can view admin users
    if not request.user.is_superuser:
        return Response({'error': 'Only superusers can view admin users'}, status=status.HTTP_403_FORBIDDEN)
    
    admins = CustomUser.objects.filter(user_type='admin', is_superuser=False).order_by('-date_joined')
    
    admin_data = []
    for admin in admins:
        admin_info = {
            'id': admin.id,
            'username': admin.username,
            'email': admin.email,
            'first_name': admin.first_name,
            'last_name': admin.last_name,
            'is_active': admin.is_active,
            'date_joined': admin.date_joined,
            'last_login': admin.last_login,
            'created_by': admin.created_by.username if admin.created_by else None,
        }
        admin_data.append(admin_info)
    
    return Response(admin_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_admin(request):
    if not request.user.is_superuser:
        return Response({'error': 'Only superusers can create admin users'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save(user_type='admin', created_by=request.user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)