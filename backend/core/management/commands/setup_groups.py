from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from core.models import Componente, MenuItem, Estado, Mesa, Cliente, Pedido, Orden
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Configura los grupos y permisos para la aplicación'

    def handle(self, *args, **kwargs):
        # Crear grupos si no existen
        admin_group, _ = Group.objects.get_or_create(name='Administrador')
        gerente_group, _ = Group.objects.get_or_create(name='Gerente')
        mesero_group, _ = Group.objects.get_or_create(name='Mesero')
        cocinero_group, _ = Group.objects.get_or_create(name='Cocinero')
        
        # Eliminar permisos antiguos para reconfigurar
        admin_group.permissions.clear()
        gerente_group.permissions.clear()
        mesero_group.permissions.clear()
        cocinero_group.permissions.clear()
        
        # Diccionario de modelos y sus permisos por grupo
        modelo_permisos = {
            'Administrador': {
                Componente: ['add', 'change', 'delete', 'view'],
                MenuItem: ['add', 'change', 'delete', 'view'],
                Estado: ['add', 'change', 'delete', 'view'],
                Mesa: ['add', 'change', 'delete', 'view'],
                Cliente: ['add', 'change', 'delete', 'view'],
                Pedido: ['add', 'change', 'delete', 'view'],
                Orden: ['add', 'change', 'delete', 'view'],
            },
            'Gerente': {
                Componente: ['add', 'change', 'delete', 'view'],
                MenuItem: ['add', 'change', 'delete', 'view'],
                Estado: ['view'],
                Mesa: ['view'],
                Cliente: ['view'],
                Pedido: ['add', 'change', 'delete', 'view'],
                Orden: ['add', 'change', 'delete', 'view'],
            },
            'Mesero': {
                Componente: ['view'],
                MenuItem: ['view'],
                Estado: ['view'],
                Mesa: ['view'],
                Cliente: ['view'],
                Pedido: ['add', 'change', 'view', 'delete'],
                Orden: ['add', 'change', 'delete', 'view'],
            },
            'Cocinero': {
                Componente: ['view'],
                MenuItem: ['view'],
                Estado: ['view'],
                Mesa: ['view'],
                Cliente: ['view'],
                Pedido: ['change', 'view'],
                Orden: ['change', 'view'],
            }
        }
        
        # Asignar permisos a cada grupo
        for grupo_nombre, modelos in modelo_permisos.items():
            grupo = Group.objects.get(name=grupo_nombre)
            for modelo, permisos in modelos.items():
                content_type = ContentType.objects.get_for_model(modelo)
                for permiso in permisos:
                    codename = f"{permiso}_{modelo.__name__.lower()}"
                    perm = Permission.objects.get(content_type=content_type, codename=codename)
                    grupo.permissions.add(perm)
                    
        # Crear un usuario administrador para pruebas manuales

        admin_username = 'admin'
        admin_email = 'admin@example.com'
        admin_password = 'admin123'

        if not User.objects.filter(username=admin_username).exists():
            admin_user = User.objects.create_user(
            username=admin_username,
            email=admin_email,
            password=admin_password
            )
            admin_user.groups.add(admin_group)
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Usuario administrador creado: {admin_username}'))
        else:
            self.stdout.write(self.style.WARNING(f'El usuario administrador "{admin_username}" ya existe'))
        
        self.stdout.write(self.style.SUCCESS('Grupos y permisos configurados con éxito'))