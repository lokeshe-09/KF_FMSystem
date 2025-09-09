import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    
    @database_sync_to_async
    def get_user_from_jwt(self, token):
        try:
            from rest_framework_simplejwt.tokens import UntypedToken
            from rest_framework_simplejwt.authentication import JWTAuthentication
            from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
            
            # Validate token
            UntypedToken(token)
            # Get user from token
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token)
            user = jwt_auth.get_user(validated_token)
            return user
        except (InvalidToken, TokenError) as e:
            logger.error(f"JWT authentication failed: {e}")
            return AnonymousUser()
        except Exception as e:
            logger.error(f"Unexpected error during JWT auth: {e}")
            return AnonymousUser()

    async def connect(self):
        # Get token from query params
        query_params = parse_qs(self.scope["query_string"].decode())
        token = query_params.get("token", [None])[0]
        
        if token:
            self.user = await self.get_user_from_jwt(token)
        else:
            self.user = AnonymousUser()
        
        if self.user.is_anonymous:
            await self.close(code=4001)
            return
            
        # Accept connection first
        await self.accept()
        
        # Join admin notification group if user is admin or superuser
        if hasattr(self.user, 'user_type') and self.user.user_type in ['admin', 'superuser']:
            self.group_name = 'admin_notifications'
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            
            # Also join specific admin group for targeted notifications
            self.specific_admin_group = f'admin_{self.user.id}_notifications'
            await self.channel_layer.group_add(
                self.specific_admin_group,
                self.channel_name
            )
            
            # Send confirmation message
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': f'Successfully connected to admin notifications as {self.user.username}',
                'user_type': self.user.user_type,
                'admin_id': self.user.id,
                'groups': [self.group_name, self.specific_admin_group]
            }))
        else:
            # Non-admin users can connect but don't join notification group
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': f'Successfully connected as {self.user.username}',
                'user_type': self.user.user_type
            }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
        if hasattr(self, 'specific_admin_group'):
            await self.channel_layer.group_discard(
                self.specific_admin_group,
                self.channel_name
            )

    async def receive(self, text_data):
        pass

    @database_sync_to_async
    def save_notification_to_db(self, title, message, notification_type='general', farm_id=None, user_id=None):
        from farms.models import Notification, Farm
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        farm = None
        user = None
        
        if farm_id:
            try:
                farm = Farm.objects.get(id=farm_id)
            except Farm.DoesNotExist:
                pass
                
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass
        
        notification = Notification.objects.create(
            title=title,
            message=message,
            notification_type=notification_type,
            farm=farm,
            user=user
        )
        return notification

    async def notification_message(self, event):
        # Send notification to WebSocket client
        try:
            notification_data = {
                'type': 'notification',
                'title': event.get('title', 'Notification'),
                'message': event['message'],
                'notification_type': event.get('notification_type'),
                'notification_id': event.get('notification_id'),
                'farm_id': event.get('farm_id'),
                'farm_name': event.get('farm_name'),
                'user_id': event.get('user_id'),
                'user_name': event.get('user_name'),
                'timestamp': event.get('timestamp', datetime.now().isoformat())
            }
            
            await self.send(text_data=json.dumps(notification_data))
            
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")

    @classmethod
    async def send_notification_to_admins(cls, title, message, notification_type='general', farm=None, user=None):
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        if channel_layer:
            await channel_layer.group_send(
                'admin_notifications',
                {
                    'type': 'notification_message',
                    'title': title,
                    'message': message,
                    'notification_type': notification_type,
                    'farm': farm,
                    'user': user,
                    'timestamp': datetime.now().isoformat()
                }
            )
            pass