from rest_framework import serializers
from django.contrib.auth.models import User, Group
from .models import Componente, MenuItem, Estado, Mesa, Cliente, Pedido, Orden

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class UserSerializer(serializers.ModelSerializer):
    grupos = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)
    groups = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), 
        many=True, 
        required=False
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 
                 'first_name', 'last_name', 'is_active', 
                 'groups', 'grupos']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def get_grupos(self, obj):
        return [group.name for group in obj.groups.all()]
    
    def create(self, validated_data):
        groups = validated_data.pop('groups', [])
        password = validated_data.pop('password', None)
        
        user = User.objects.create(**validated_data)
        
        if password:
            user.set_password(password)
        
        if groups:
            user.groups.set(groups)
        
        user.save()
        return user
    
    def update(self, instance, validated_data):
        groups = validated_data.pop('groups', None)
        password = validated_data.pop('password', None)
        
        # Actualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Actualizar contraseña si se proporciona
        if password:
            instance.set_password(password)
        
        # Actualizar grupos si se proporcionan
        if groups is not None:
            instance.groups.set(groups)
        
        instance.save()
        return instance

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