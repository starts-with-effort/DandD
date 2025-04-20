import socketio
import asyncio
import os
import django
from channels.db import database_sync_to_async

# Asegúrate de que Django está configurado antes de importar modelos
if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings

# Crear el servidor Socket.IO
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Crear la aplicación ASGI
socket_app = socketio.ASGIApp(sio)

# Función asíncrona para validar el token
@database_sync_to_async
def validate_token(token):
    try:
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(token)
        user = jwt_auth.get_user(validated_token)
        
        if not user or not user.is_active:
            return None
        
        return {
            'user_id': str(user.id),
            'username': user.username
        }
    except (InvalidToken, TokenError) as e:
        print(f"Error validando token: {e}")
        return None
    except Exception as e:
        print(f"Excepción inesperada: {e}")
        return None

# Middleware de autenticación
@sio.event
async def connect(sid, environ, auth):
    try:
        # Verificar el token JWT enviado por el cliente
        if not auth or 'token' not in auth:
            print("No se proporcionó token")
            await sio.disconnect(sid)
            return
        
        token = auth['token']
        user_data = await validate_token(token)
        
        if not user_data:
            print("Token inválido o usuario inactivo")
            await sio.disconnect(sid)
            return
        
        # Guardar el user_id en la sesión de socket
        await sio.save_session(sid, user_data)
        print(f"Usuario {user_data['username']} (ID: {user_data['user_id']}) conectado con sid {sid}")
            
    except Exception as e:
        print(f"Error en conexión: {e}")
        await sio.disconnect(sid)

@sio.event
async def disconnect(sid):
    print(f"Cliente {sid} desconectado")

# Importa modelos aquí para evitar importaciones circulares
from core.models import Orden, Pedido

# Funciones asíncronas para acceder a la base de datos
@database_sync_to_async
def get_orden_data(orden_id):
    try:
        orden = Orden.objects.get(id=orden_id)
        return {
            'id': str(orden.id),
            'pedido': str(orden.pedido.id),
            'menu_item': {
                'id': str(orden.menu_item.id),
                'nombre': orden.menu_item.nombre,
                'precio': float(orden.menu_item.precio)
            },
            'estado': {
                'id': str(orden.estado.id),
                'nombre': orden.estado.nombre
            },
            'anotacion': orden.anotacion,
            'hora_creacion': orden.hora_creacion.isoformat() if orden.hora_creacion else None,
            'hora_entrega': orden.hora_entrega.isoformat() if orden.hora_entrega else None,
        }
    except Orden.DoesNotExist:
        return None
    except Exception as e:
        print(f"Error al obtener datos de orden: {e}")
        return None

@database_sync_to_async
def get_pedido_data(pedido_id):
    try:
        pedido = Pedido.objects.get(id=pedido_id)
        return {
            'id': str(pedido.id),
            'mesa': {
                'id': str(pedido.mesa.id),
                'numero': pedido.mesa.numero
            },
            'subtotal': float(pedido.subtotal),
            'total': float(pedido.total),
            'fecha_creacion': pedido.fecha_creacion.isoformat() if pedido.fecha_creacion else None,
            'hora_creacion': pedido.hora_creacion.isoformat() if pedido.hora_creacion else None,
            'hora_pago': pedido.hora_pago.isoformat() if pedido.hora_pago else None,
        }
    except Pedido.DoesNotExist:
        return None
    except Exception as e:
        print(f"Error al obtener datos de pedido: {e}")
        return None

# Función para emitir actualización de orden
async def emitir_orden_actualizada(orden_id):
    try:
        data = await get_orden_data(orden_id)
        if data:
            await sio.emit('orden_actualizada', data)
            print(f"Orden {orden_id} actualizada y emitida")
        else:
            print(f"Orden {orden_id} no encontrada")
    except Exception as e:
        print(f"Error al emitir orden actualizada: {e}")

# Función para emitir nuevo pedido
async def emitir_pedido_creado(pedido_id):
    try:
        data = await get_pedido_data(pedido_id)
        if data:
            await sio.emit('pedido_creado', data)
            print(f"Pedido {pedido_id} creado y emitido")
        else:
            print(f"Pedido {pedido_id} no encontrado")
    except Exception as e:
        print(f"Error al emitir pedido creado: {e}")