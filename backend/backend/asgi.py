"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from core.socketio_server import socket_app

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'DandD.settings')

django_asgi_app = get_asgi_application()

# Configura Channels con Socket.io
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("socket.io/", socket_app),
        ])
    ),
})
