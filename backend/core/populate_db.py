from core.models import Componente, MenuItem, Estado, Mesa, Cliente, Pedido, Orden
from django.contrib.auth import get_user_model
from django.utils.timezone import now
import random

def populate_db():
    # Crear estados
    estados = ["Anotado", "Preparando", "Listo para Entrega", "Entregado", "Pagado"]
    for estado in estados:
        Estado.objects.get_or_create(id=estado[:5].upper(), nombre=estado)

    # Crear mesas
    for numero in range(1, 21):
        Mesa.objects.get_or_create(id=f"M{numero:02}", numero=numero)

    # Crear componentes
    componentes = ["Queso", "Tomate", "Lechuga", "Pan", "Carne", "Pollo", "Papas", "Salsa"]
    for i, componente in enumerate(componentes, start=1):
        Componente.objects.get_or_create(id=f"C{i:02}", nombre=componente)

    # Crear menú
    menu_items = [
        {"id": "M001", "nombre": "Hamburguesa", "precio": 5.99, "descripcion": "Hamburguesa clásica con queso y tomate"},
        {"id": "M002", "nombre": "Papas Fritas", "precio": 2.99, "descripcion": "Papas fritas crujientes"},
        {"id": "M003", "nombre": "Pollo Frito", "precio": 6.99, "descripcion": "Pollo frito con especias"},
        {"id": "M004", "nombre": "Ensalada", "precio": 4.99, "descripcion": "Ensalada fresca con aderezo"},
    ]
    for item in menu_items:
        menu_item, _ = MenuItem.objects.get_or_create(
            id=item["id"],
            nombre=item["nombre"],
            precio=item["precio"],
            descripcion=item["descripcion"]
        )
        # Asignar componentes aleatorios
        menu_item.componentes.set(Componente.objects.order_by("?")[:3])

    # Crear clientes
    clientes = [
        {"id": "C001", "documento": "123456789", "nombre": "Juan Pérez", "celular": "5551234567"},
        {"id": "C002", "documento": "987654321", "nombre": "María López", "celular": "5559876543"},
        {"id": "C003", "documento": "456789123", "nombre": "Carlos Gómez", "celular": "5554567891"},
    ]
    for cliente in clientes:
        Cliente.objects.get_or_create(
            id=cliente["id"],
            documento=cliente["documento"],
            nombre=cliente["nombre"],
            celular=cliente["celular"]
        )

    # Crear pedidos y órdenes
    User = get_user_model()
    usuario = User.objects.first()  # Asegúrate de tener un usuario creado
    mesas = Mesa.objects.all()
    clientes = Cliente.objects.all()
    estados = Estado.objects.all()
    menu_items = MenuItem.objects.all()

    for i in range(1, 11):  # Crear 10 pedidos
        pedido = Pedido.objects.create(
            id=f"P{i:03}",
            usuario=usuario,
            mesa=random.choice(mesas),
            cliente=random.choice(clientes),
        )
        for j in range(1, random.randint(2, 5)):  # Crear entre 2 y 5 órdenes por pedido
            Orden.objects.create(
                id=f"O{i:03}{j}",
                pedido=pedido,
                menu_item=random.choice(menu_items),
                estado=random.choice(estados),
            )
        pedido.calcular_total()

if __name__ == "__main__":
    populate_db()