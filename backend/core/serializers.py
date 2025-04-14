from rest_framework import serializers
from .models import Componente, MenuItem, Estado, Mesa, Cliente, Pedido, Orden
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

class ComponenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Componente
        fields = '__all__'

class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = '__all__'

class MenuItemDetailSerializer(serializers.ModelSerializer):
    componentes = ComponenteSerializer(many=True, read_only=True)
    
    class Meta:
        model = MenuItem
        fields = '__all__'

class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estado
        fields = '__all__'

class MesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mesa
        fields = '__all__'

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'

class OrdenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Orden
        fields = '__all__'

class OrdenDetailSerializer(serializers.ModelSerializer):
    menu_item = MenuItemSerializer(read_only=True)
    estado = EstadoSerializer(read_only=True)
    
    class Meta:
        model = Orden
        fields = '__all__'

class PedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pedido
        fields = '__all__'

class PedidoDetailSerializer(serializers.ModelSerializer):
    ordenes = OrdenSerializer(many=True, read_only=True)
    mesa = MesaSerializer(read_only=True)
    cliente = ClienteSerializer(read_only=True)
    usuario = UserSerializer(read_only=True)
    
    class Meta:
        model = Pedido
        fields = '__all__'