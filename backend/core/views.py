from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth.models import User, Group
from .models import Componente, MenuItem, Estado, Mesa, Cliente, Pedido, Orden
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
        serializer.save(usuario=self.request.user)
    
    @action(detail=True, methods=['post'])
    def calcular_total(self, request, pk=None):
        # Verificar permiso para actualizar pedido
        if not request.user.has_perm('core.change_pedido'):
            return Response({'error': 'No tiene permisos para actualizar pedidos'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        pedido = self.get_object()
        pedido.calcular_total()
        return Response({'status': 'total calculado', 'subtotal': pedido.subtotal, 'total': pedido.total})
    
    @action(detail=False, methods=['get'])
    def mis_pedidos(self, request):
        # Los meseros y cocineros pueden ver sus pedidos asignados
        user = request.user
        if user.groups.filter(name__in=['Mesero', 'Cocinero']).exists():
            pedidos = Pedido.objects.filter(usuario=request.user)
        else:
            # Administradores y gerentes pueden ver todos los pedidos
            pedidos = Pedido.objects.all()
            
        serializer = PedidoSerializer(pedidos, many=True)
        return Response(serializer.data)

class OrdenViewSet(viewsets.ModelViewSet):
    queryset = Orden.objects.all()
    serializer_class = OrdenSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrdenDetailSerializer
        return OrdenSerializer
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        # Verificar permiso para modificar orden
        if not request.user.has_perm('core.change_orden'):
            return Response({'error': 'No tiene permisos para modificar órdenes'}, 
                          status=status.HTTP_403_FORBIDDEN)
            
        orden = self.get_object()
        estado_id = request.data.get('estado_id')
        try:
            estado = Estado.objects.get(id=estado_id)
            orden.estado = estado
            orden.save()
            return Response({'status': 'estado actualizado'})
        except Estado.DoesNotExist:
            return Response({'error': 'Estado not found'}, status=status.HTTP_404_NOT_FOUND)