from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth.models import User
from core.models import Componente, MenuItem, Estado, Mesa, Cliente, Pedido, Orden

class WorkflowTestCase(APITestCase):
    def setUp(self):
        # Crear un usuario para autenticación
        self.usuario = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='password123'
        )
        
        # Autenticar para las pruebas
        self.client.force_authenticate(user=self.usuario)
        
        # Crear datos básicos
        self.estado = Estado.objects.create(id='EST01', nombre="Pendiente")
        self.mesa = Mesa.objects.create(id='MES01', numero=2)
        self.componente1 = Componente.objects.create(id='COMP001', nombre="Pan")
        self.componente2 = Componente.objects.create(id='COMP002', nombre="Carne")
        self.menu_item = MenuItem.objects.create(
            id='MENU001',
            nombre="Hamburguesa", 
            precio=8.50, 
            descripcion="Hamburguesa clásica"
        )
        # Agregar componentes al MenuItem
        self.menu_item.componentes.add(self.componente1, self.componente2)
        
    def test_complete_order_workflow(self):
        """Prueba el flujo completo de creación de un pedido"""
        
        # 1. Crear un cliente
        cliente_url = reverse('cliente-list')
        cliente_data = {
            'id': 'CLI001',
            'nombre': 'Juan Pérez',
            'documento': '987654321',
            'celular': '987654321'
        }
        cliente_response = self.client.post(cliente_url, cliente_data)
        self.assertEqual(cliente_response.status_code, status.HTTP_201_CREATED)
        cliente_id = cliente_response.data['id']
        
        # 2. Crear un pedido
        pedido_url = reverse('pedido-list')
        pedido_data = {
            'id': 'PED001',
            'mesa': self.mesa.id,
            'cliente': cliente_id,
            'usuario': self.usuario.id,
            'subtotal': 8.50,
            'total': 8.50
        }
        pedido_response = self.client.post(pedido_url, pedido_data)
        self.assertEqual(pedido_response.status_code, status.HTTP_201_CREATED)
        pedido_id = pedido_response.data['id']
        
        # 3. Añadir una orden al pedido
        orden_url = reverse('orden-list')
        orden_data = {
            'id': 'ORD001',
            'pedido': pedido_id,
            'menu_item': self.menu_item.id,
            'estado': self.estado.id,
            'anotacion': 'Sin cebolla'
        }
        orden_response = self.client.post(orden_url, orden_data)
        self.assertEqual(orden_response.status_code, status.HTTP_201_CREATED)
        
        # 4. Actualizar el estado de la orden a "En preparación"
        estado_preparacion = Estado.objects.create(id='EST02', nombre="En preparación")
        orden_id = orden_response.data['id']
        orden_detail_url = reverse('orden-detail', args=[orden_id])
        update_data = {'id': orden_id, 'estado': estado_preparacion.id}
        update_response = self.client.patch(orden_detail_url, update_data)
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        
        # 5. Verificar que el pedido y su orden existen
        pedido_detail_url = reverse('pedido-detail', args=[pedido_id])
        pedido_get = self.client.get(pedido_detail_url)
        self.assertEqual(pedido_get.status_code, status.HTTP_200_OK)
        
        # 6. Verificar el detalle de la orden
        orden_get = self.client.get(orden_detail_url)
        self.assertEqual(orden_get.status_code, status.HTTP_200_OK)
        self.assertEqual(orden_get.data['menu_item'], self.menu_item.id)
        
        # 7. Probar el método calcular_total del pedido (si existe un endpoint para esto)
        recalcular_url = reverse('pedido-calcular-total', args=[pedido_id])
        recalcular_response = self.client.post(recalcular_url)
        self.assertEqual(recalcular_response.status_code, status.HTTP_200_OK)
        
        # Verificar que el total se actualizó correctamente
        pedido_actualizado = self.client.get(pedido_detail_url)
        self.assertEqual(float(pedido_actualizado.data['total']), 8.50)