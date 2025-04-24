from django.core.management.base import BaseCommand
from core.models import Componente, MenuItem, Estado, Mesa, Cliente, Pedido, Orden
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Populate the database with sample data'

    def handle(self, *args, **kwargs):
        # Crear componentes
        componentes = [
            Componente.objects.create(nombre="Queso"),
            Componente.objects.create(nombre="Tomate"),
            Componente.objects.create(nombre="Lechuga"),
            Componente.objects.create(nombre="Pan"),
            Componente.objects.create(nombre="Carne"),
        ]
        self.stdout.write(self.style.SUCCESS(f"Created {len(componentes)} componentes"))

        # Crear items del menú
        menu_items = [
            MenuItem.objects.create(
                nombre="Hamburguesa",
                precio=5.99,
                descripcion="Hamburguesa clásica con queso y tomate"
            ),
            MenuItem.objects.create(
                nombre="Ensalada",
                precio=3.99,
                descripcion="Ensalada fresca con lechuga y tomate"
            ),
        ]
        menu_items[0].componentes.add(componentes[0], componentes[1], componentes[3], componentes[4])  # Hamburguesa
        menu_items[1].componentes.add(componentes[1], componentes[2])  # Ensalada
        self.stdout.write(self.style.SUCCESS(f"Created {len(menu_items)} menu items"))

        # Crear estados
        estados = [
            Estado.objects.create(nombre="Pendiente"),
            Estado.objects.create(nombre="En preparación"),
            Estado.objects.create(nombre="Entregado"),
        ]
        self.stdout.write(self.style.SUCCESS(f"Created {len(estados)} estados"))

        # Crear mesas
        mesas = [Mesa.objects.create(numero=i) for i in range(1, 6)]
        self.stdout.write(self.style.SUCCESS(f"Created {len(mesas)} mesas"))

        # Crear clientes
        clientes = [
            Cliente.objects.create(documento="123456789", nombre="Juan Pérez", celular="555123456"),
            Cliente.objects.create(documento="987654321", nombre="Ana Gómez", celular="555987654"),
        ]
        self.stdout.write(self.style.SUCCESS(f"Created {len(clientes)} clientes"))

        self.stdout.write(self.style.SUCCESS("Database populated successfully!"))