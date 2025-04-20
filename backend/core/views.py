from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth.models import User, Group
from .models import Componente, MenuItem, Estado, Mesa, Cliente, Pedido, Orden
from rest_framework.views import APIView
from django.db.models import Count, Sum, Avg, F, ExpressionWrapper, FloatField
from django.db.models.functions import TruncDate, TruncHour, TruncMonth, TruncWeek
from django.utils import timezone
from datetime import timedelta, datetime
from .serializers import (
    UserSerializer,
    GroupSerializer,
    ComponenteSerializer, 
    MenuItemSerializer, 
    MenuItemDetailSerializer,
    EstadoSerializer, 
    MesaSerializer, 
    ClienteSerializer, 
    PedidoSerializer, 
    PedidoDetailSerializer,
    OrdenSerializer,
    OrdenDetailSerializer
)
from rest_framework.permissions import BasePermission, IsAuthenticated, DjangoModelPermissions
import asyncio
from asgiref.sync import async_to_sync
from .socketio_server import emitir_orden_actualizada, emitir_pedido_creado

class DashboardVentasAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Verificar si el usuario tiene permisos de gerente o admin
        user = request.user
        if not (user.is_superuser or user.groups.filter(name__in=['Administrador', 'Gerente']).exists()):
            return Response({"error": "No tienes permisos para ver el dashboard"}, status=status.HTTP_403_FORBIDDEN)
        
        # Obtener período desde los parámetros de la consulta
        periodo = request.query_params.get('periodo', 'semana')
        
        # Calcular fecha de inicio según el período
        now = timezone.now()
        if periodo == 'dia':
            dias_atras = 1
            # Para vista por horas en un día
            fecha_inicio = now.replace(hour=0, minute=0, second=0, microsecond=0)
            # Agrupar por hora para vista diaria
            ventas_data = []
            # Crear 24 horas para el día actual
            for hour in range(24):
                hora_inicio = fecha_inicio.replace(hour=hour)
                hora_fin = hora_inicio + timedelta(hours=1)
                
                # Consultar ventas para esta hora
                subtotal = Pedido.objects.filter(
                    hora_creacion__gte=hora_inicio,
                    hora_creacion__lt=hora_fin
                ).aggregate(
                    total_ventas=Sum('total'),
                    cantidad_pedidos=Count('id')
                )
                
                ventas_data.append({
                    'periodo': hora_inicio.isoformat(),
                    'total_ventas': subtotal['total_ventas'] or 0,
                    'cantidad_pedidos': subtotal['cantidad_pedidos'] or 0
                })
                
            ventas = ventas_data
        else:
            # Para vistas por día (semana, mes, trimestre)
            if periodo == 'semana':
                dias_atras = 7
            elif periodo == 'mes':
                dias_atras = 30
            elif periodo == 'trimestre':
                dias_atras = 90
            else:
                dias_atras = 7
                
            fecha_inicio = now - timedelta(days=dias_atras)
            
            # Crear un arreglo de días desde fecha_inicio hasta hoy
            ventas_data = []
            current_date = fecha_inicio.date()
            end_date = now.date()
            
            while current_date <= end_date:
                # Inicio y fin del día
                dia_inicio = timezone.make_aware(datetime.combine(current_date, datetime.min.time()))
                dia_fin = timezone.make_aware(datetime.combine(current_date, datetime.max.time()))
                
                # Consultar ventas para este día
                subtotal = Pedido.objects.filter(
                    fecha_creacion=current_date
                ).aggregate(
                    total_ventas=Sum('total'),
                    cantidad_pedidos=Count('id')
                )
                
                ventas_data.append({
                    'periodo': dia_inicio.isoformat(),
                    'total_ventas': subtotal['total_ventas'] or 0,
                    'cantidad_pedidos': subtotal['cantidad_pedidos'] or 0
                })
                
                current_date += timedelta(days=1)
                
            ventas = ventas_data
        
        # Calcular resumen de ventas
        resumen = {
            'total_ventas': Pedido.objects.filter(fecha_creacion__gte=fecha_inicio.date()).aggregate(total=Sum('total'))['total'] or 0,
            'cantidad_pedidos': Pedido.objects.filter(fecha_creacion__gte=fecha_inicio.date()).count(),
            'ticket_promedio': 0
        }
        
        # Calcular ticket promedio (evitar división por cero)
        if resumen['cantidad_pedidos'] > 0:
            resumen['ticket_promedio'] = resumen['total_ventas'] / resumen['cantidad_pedidos']
        
        # Calcular tendencia (comparar con período anterior)
        periodo_anterior_inicio = fecha_inicio - timedelta(days=dias_atras)
        ventas_periodo_actual = resumen['total_ventas']
        ventas_periodo_anterior = Pedido.objects.filter(
            fecha_creacion__gte=periodo_anterior_inicio.date(),
            fecha_creacion__lt=fecha_inicio.date()
        ).aggregate(total=Sum('total'))['total'] or 0
        
        if ventas_periodo_anterior > 0:
            tendencia = ((ventas_periodo_actual - ventas_periodo_anterior) / ventas_periodo_anterior) * 100
        else:
            tendencia = 100  # Si no hay ventas anteriores, mostrar 100% de incremento
        
        resumen['tendencia'] = round(tendencia, 2)
        
        return Response({
            'ventas': ventas,
            'resumen': resumen
        })

class DashboardProductosAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Verificar permisos
        user = request.user
        if not (user.is_superuser or user.groups.filter(name__in=['Administrador', 'Gerente']).exists()):
            return Response({"error": "No tienes permisos para ver el dashboard"}, status=status.HTTP_403_FORBIDDEN)
        
        # Obtener período desde los parámetros de la consulta
        periodo = request.query_params.get('periodo', 'semana')
        
        # Definir días atrás según el período
        if periodo == 'dia':
            dias_atras = 1
        elif periodo == 'semana':
            dias_atras = 7
        elif periodo == 'mes':
            dias_atras = 30
        elif periodo == 'trimestre':
            dias_atras = 90
        else:
            dias_atras = 7
        
        fecha_inicio = timezone.now() - timedelta(days=dias_atras)
        
        # Productos más vendidos en el período
        productos_populares = MenuItem.objects.filter(
            orden__pedido__fecha_creacion__gte=fecha_inicio
        ).annotate(
            veces_ordenado=Count('orden'),
            total_ventas=Sum('orden__pedido__total')
        ).order_by('-veces_ordenado')[:10]
        
        return Response({
            'productos_populares': [
                {
                    'id': producto.id,
                    'nombre': producto.nombre,
                    'veces_ordenado': producto.veces_ordenado,
                    'total_ventas': producto.total_ventas or 0
                }
                for producto in productos_populares
            ]
        })

class DashboardUsuariosAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Verificar permisos
        user = request.user
        if not (user.is_superuser or user.groups.filter(name__in=['Administrador', 'Gerente']).exists()):
            return Response({"error": "No tienes permisos para ver el dashboard"}, status=status.HTTP_403_FORBIDDEN)
        
        # Obtener período desde los parámetros de la consulta
        periodo = request.query_params.get('periodo', 'semana')
        
        # Definir días atrás según el período
        if periodo == 'dia':
            dias_atras = 1
        elif periodo == 'semana':
            dias_atras = 7
        elif periodo == 'mes':
            dias_atras = 30
        elif periodo == 'trimestre':
            dias_atras = 90
        else:
            dias_atras = 7
        
        fecha_inicio = timezone.now() - timedelta(days=dias_atras)
        
        # Usuarios con más ventas en el período
        usuarios_rendimiento = User.objects.filter(
            pedido__fecha_creacion__gte=fecha_inicio
        ).annotate(
            total_ventas=Sum('pedido__total'),
            pedidos_atendidos=Count('pedido')
        ).order_by('-total_ventas')[:5]
        
        return Response({
            'usuarios_rendimiento': [
                {
                    'id': usuario.id,
                    'username': usuario.username,
                    'nombre': f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
                    'total_ventas': usuario.total_ventas or 0,
                    'pedidos_atendidos': usuario.pedidos_atendidos
                }
                for usuario in usuarios_rendimiento
            ]
        })

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]
    
    def get_queryset(self):
        # Si es superusuario o está en grupo Administrador puede ver todos los usuarios
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='Administrador').exists():
            return User.objects.all()
        # Si no, solo puede ver su propio perfil
        return User.objects.filter(id=user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Endpoint para obtener información del usuario actual y sus permisos"""
        user = request.user
        permisos = user.get_all_permissions()
        grupos = [group.name for group in user.groups.all()]
        
        serializer = self.get_serializer(user)
        data = serializer.data
        data['permisos'] = list(permisos)
        data['grupos'] = grupos
        
        return Response(data)

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]

class ComponenteViewSet(viewsets.ModelViewSet):
    queryset = Componente.objects.all()
    serializer_class = ComponenteSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]

class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]
    
    def get_serializer_class(self):
        # Always return the detail serializer to include componentes
        return MenuItemDetailSerializer
    
    # Ensure consistent response format for list
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    # Ensure proper data format for single item
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_componente(self, request, pk=None):
        # Verificar permiso para modificar MenuItem
        if not request.user.has_perm('core.change_menuitem'):
            return Response({'error': 'No tiene permisos para modificar ítems del menú'}, 
                          status=status.HTTP_403_FORBIDDEN)
            
        menu_item = self.get_object()
        componente_id = request.data.get('componente_id')
        try:
            componente = Componente.objects.get(id=componente_id)
            menu_item.componentes.add(componente)
            return Response({'status': 'componente added'})
        except Componente.DoesNotExist:
            return Response({'error': 'Componente not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def remove_componente(self, request, pk=None):
        # Verificar permiso para modificar MenuItem
        if not request.user.has_perm('core.change_menuitem'):
            return Response({'error': 'No tiene permisos para modificar ítems del menú'}, 
                          status=status.HTTP_403_FORBIDDEN)
            
        menu_item = self.get_object()
        componente_id = request.data.get('componente_id')
        try:
            componente = Componente.objects.get(id=componente_id)
            menu_item.componentes.remove(componente)
            return Response({'status': 'componente removed'})
        except Componente.DoesNotExist:
            return Response({'error': 'Componente not found'}, status=status.HTTP_404_NOT_FOUND)

class EstadoViewSet(viewsets.ModelViewSet):
    queryset = Estado.objects.all()
    serializer_class = EstadoSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]

class MesaViewSet(viewsets.ModelViewSet):
    queryset = Mesa.objects.all()
    serializer_class = MesaSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]

class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PedidoDetailSerializer
        return PedidoSerializer
    
    def perform_create(self, serializer):
        pedido = serializer.save(usuario=self.request.user)
        # Emitir evento de socket.io
        async_to_sync(emitir_pedido_creado)(str(pedido.id))
    
    @action(detail=True, methods=['post'])
    def calcular_total(self, request, pk=None):
        # Verificar permiso para actualizar pedido
        if not request.user.has_perm('core.change_pedido'):
            return Response({'error': 'No tiene permisos para actualizar pedidos'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        pedido = self.get_object()
        pedido.calcular_total()
        return Response({'status': 'total calculado', 'subtotal': pedido.subtotal, 'total': pedido.total})

class OrdenViewSet(viewsets.ModelViewSet):
    queryset = Orden.objects.all()
    serializer_class = OrdenSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrdenDetailSerializer
        return OrdenSerializer
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cambiar_estado(self, request, pk=None):
        # Verificar permiso
        if not (request.user.groups.filter(name='Cocinero').exists() or request.user.has_perm('core.change_orden')):
            return Response({"error": "No tienes permiso para cambiar estados"}, status=status.HTTP_403_FORBIDDEN)
        
        orden = self.get_object()
        estado_id = request.data.get('estado_id')
        
        try:
            estado = Estado.objects.get(id=estado_id)
            orden.estado = estado
            
            # Si el estado es "Listo", registrar hora de entrega
            if estado.nombre == 'Listo':
                orden.hora_entrega = timezone.now()
                
            orden.save()
            
            # Ejecutar la tarea asíncrona para emitir el evento
            async_to_sync(emitir_orden_actualizada)(str(orden.id))
            
            return Response({"status": "Estado actualizado", "estado": estado.nombre})
        except Estado.DoesNotExist:
            return Response({"error": "Estado no encontrado"}, status=status.HTTP_404_NOT_FOUND)