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
        self.assertEqual(orden_get.data['menu_item']['id'], self.menu_item.id)
        
        # 7. Probar el método calcular_total del pedido (si existe un endpoint para esto)
        recalcular_url = reverse('pedido-calcular-total', args=[pedido_id])
        recalcular_response = self.client.post(recalcular_url)
        self.assertEqual(recalcular_response.status_code, status.HTTP_200_OK)
        
        # Verificar que el total se actualizó correctamente
        pedido_actualizado = self.client.get(pedido_detail_url)
        self.assertEqual(float(pedido_actualizado.data['total']), 8.50)

class AuthenticationTestCase(APITestCase):
    """Pruebas específicas para el flujo completo de autenticación"""
    
    def setUp(self):
        # Crear usuario de prueba
        self.credentials = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'securepassword123'
        }
        self.user = User.objects.create_user(**self.credentials)
        
        # URLs para autenticación
        self.token_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')
        
        
    def test_login_valid_credentials(self):
        """Prueba inicio de sesión con credenciales válidas"""
        response = self.client.post(
            self.token_url, 
            {'username': 'testuser', 'password': 'securepassword123'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Guardar token para pruebas posteriores
        self.access_token = response.data['access']
        self.refresh_token = response.data['refresh']
        
        return response.data
        
    def test_login_invalid_credentials(self):
        """Prueba inicio de sesión con credenciales inválidas"""
        response = self.client.post(
            self.token_url, 
            {'username': 'testuser', 'password': 'wrongpassword'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        
    def test_token_refresh(self):
        """Prueba renovación de token de acceso usando refresh token"""
        # Primero obtenemos los tokens iniciales
        tokens = self.test_login_valid_credentials()
        
        # Luego intentamos refrescar con el refresh_token
        refresh_response = self.client.post(
            self.refresh_url,
            {'refresh': tokens['refresh']},
            format='json'
        )
        
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)
        
    def test_access_protected_endpoint_with_token(self):
        """Prueba acceso a endpoint protegido con token válido"""
        tokens = self.test_login_valid_credentials()
        
        # Intentar acceder a un endpoint protegido (lista de pedidos)
        protected_url = reverse('pedido-list')
        
        # Configurar header de autorización
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        response = self.client.get(protected_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_access_protected_endpoint_without_token(self):
        """Prueba acceso a endpoint protegido sin token (debería fallar)"""
        # Asegurar que no hay credenciales configuradas
        self.client.credentials()
        
        protected_url = reverse('pedido-list')
        response = self.client.get(protected_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_access_protected_endpoint_with_invalid_token(self):
        """Prueba acceso a endpoint protegido con token inválido"""
        # Configurar header de autorización con token inválido
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid_token_string")
        
        protected_url = reverse('pedido-list')
        response = self.client.get(protected_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_token_expiration(self):
        """
        Simula expiración de token y verifica que se rechace el acceso
        (Requiere ajustes en settings.py para tests - token de corta duración)
        """
        from rest_framework_simplejwt.settings import api_settings
        import time
        
        # Este test asume que has configurado ACCESS_TOKEN_LIFETIME muy corto para pruebas
        # Por ejemplo: ACCESS_TOKEN_LIFETIME = timedelta(seconds=1)
        
        # Obtener token
        tokens = self.test_login_valid_credentials()
        
        # Esperar a que expire (ajustar según configuración)
        time.sleep(2)  # Esperar 2 segundos (más que el tiempo de vida del token)
        
        # Intentar acceder con el token potencialmente expirado
        protected_url = reverse('pedido-list') 
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        response = self.client.get(protected_url)
        
        # Debería rechazar por token expirado
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])