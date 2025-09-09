import logging
from django.contrib.auth.models import AnonymousUser
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token):
    try:
        # Validate token
        UntypedToken(token)
        # Get user from token
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(token)
        user = jwt_auth.get_user(validated_token)
        return user
    except (InvalidToken, TokenError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        # Get token from query params
        query_params = parse_qs(scope["query_string"].decode())
        token = query_params.get("token", [None])[0]
        
        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()
            
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)


class ProtocolSafetyMiddleware(MiddlewareMixin):
    """
    Middleware to handle protocol-related issues gracefully.
    Helps prevent HTTPS requests from causing server errors on HTTP-only development server.
    """
    
    def process_exception(self, request, exception):
        # Log SSL/TLS related errors but don't crash
        if any(keyword in str(exception).upper() for keyword in ['SSL', 'TLS', 'HTTPS', 'HANDSHAKE']):
            logger.warning(f"SSL/TLS related error handled gracefully: {exception}")
            return HttpResponse(
                "This development server only supports HTTP. Please use http:// instead of https://", 
                status=400,
                content_type='text/plain'
            )
        
        # Let other exceptions pass through
        return None
    
    def process_request(self, request):
        # Log the request protocol for debugging
        if hasattr(request, 'is_secure'):
            protocol = 'HTTPS' if request.is_secure() else 'HTTP'
            logger.debug(f"Incoming {protocol} request to {request.get_full_path()}")
        
        return None