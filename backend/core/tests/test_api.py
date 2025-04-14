from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth.models import User
from core.models import Componente, MenuItem, Estado, Mesa, Cliente, Pedido, Orden

class APIEndpointTestCase(APITestCase):
    def setUp(self):
        # Crear un usuario para autenticación
        self.usuario = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='password123'
        )
        
        # Autenticar para las pruebas
        self.client.force_authenticate(user=self.usuario)
        
        # Crear datos de prueba para cada modelo con IDs específicos
        self.estado = Estado.objects.create(id='EST01', nombre="En preparación")
        self.componente = Componente.objects.create(id='COMP001', nombre="Lechuga")
        self.menu_item = MenuItem.objects.create(
            id='MENU001', 
            nombre="Hamburguesa", 
            precio=10.00, 
            descripcion="Hamburguesa clásica"
        )
        self.mesa = Mesa.objects.create(id='MES01', numero=1)
        self.cliente = Cliente.objects.create(
            id='CLI001', 
            nombre="Cliente Test", 
            documento="1234567890",
            celular="123456789"
        )
        self.pedido = Pedido.objects.create(
            id='PED001',
            mesa=self.mesa,
            cliente=self.cliente,
            usuario=self.usuario,
            subtotal=10.00,
            total=10.00
        )
        self.orden = Orden.objects.create(
            id='ORD001',
            pedido=self.pedido,
            menu_item=self.menu_item,
            estado=self.estado,
            anotacion="Sin cebolla"
        )

    def test_get_user_list(self):
        """Prueba para obtener lista de usuarios"""
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_componente_list(self):
        """Prueba para obtener lista de componentes"""
        url = reverse('componente-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)

    def test_get_componente_detail(self):
        """Prueba para obtener detalle de un componente"""
        url = reverse('componente-detail', args=[self.componente.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Lechuga')

    def test_create_componente(self):
        """Prueba para crear un componente"""
        url = reverse('componente-list')
        data = {'id': 'COMP002', 'nombre': 'Tomate'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nombre'], 'Tomate')

    def test_update_componente(self):
        """Prueba para actualizar un componente"""
        url = reverse('componente-detail', args=[self.componente.id])
        data = {'id': self.componente.id, 'nombre': 'Lechuga Premium'}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Lechuga Premium')

    def test_delete_componente(self):
        """Prueba para eliminar un componente"""
        url = reverse('componente-detail', args=[self.componente.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    # Tests para MenuItem
    def test_get_menu_item_list(self):
        url = reverse('menuitem-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_menu_item(self):
        url = reverse('menuitem-list')
        data = {
            'id': 'MENU002',
            'nombre': 'Pizza',
            'precio': 12.50,
            'descripcion': 'Pizza Margarita'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
    # Tests para Pedido
    def test_get_pedido_list(self):
        url = reverse('pedido-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_create_pedido(self):
        url = reverse('pedido-list')
        data = {
            'id': 'PED002',
            'mesa': self.mesa.id,
            'cliente': self.cliente.id,
            'usuario': self.usuario.id,
            'subtotal': 15.50,
            'total': 15.50
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
    # Test para autenticación
    def test_token_auth(self):
        """Prueba de obtención del token JWT"""
        self.client.force_authenticate(user=None)  # Desautenticar
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {'username': 'testuser', 'password': 'password123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('access' in response.data)
        self.assertTrue('refresh' in response.data)