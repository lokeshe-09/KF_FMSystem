from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True, required=False)
    assigned_farms = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'confirm_password', 'first_name', 'last_name', 'phone_number', 'user_type', 'assigned_farms')
        
    def validate(self, attrs):
        confirm_password = attrs.get('confirm_password')
        if confirm_password and attrs['password'] != confirm_password:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        assigned_farm_ids = validated_data.pop('assigned_farms', [])
        validated_data.pop('confirm_password', None)
        user = CustomUser.objects.create_user(**validated_data)
        
        # Assign farms to user
        if assigned_farm_ids:
            from farms.models import Farm
            farms = Farm.objects.filter(id__in=assigned_farm_ids, is_active=True)
            for farm in farms:
                farm.users.add(user)
            
        return user

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include username and password')
        
        return attrs

class UserSerializer(serializers.ModelSerializer):
    is_superuser = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'user_type', 'is_superuser', 'created_at')
        read_only_fields = ('id', 'created_at', 'is_superuser')