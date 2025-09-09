import os
from django.core.asgi import get_asgi_application

# Django setup must come first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'farm_management.settings')
django_asgi_app = get_asgi_application()

# Import Channels components after Django setup
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from . import routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(URLRouter(routing.websocket_urlpatterns))
    ),
})