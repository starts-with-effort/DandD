from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardVentasAPI, DashboardProductosAPI, DashboardUsuariosAPI
from .views import (
    UserViewSet,
    GroupViewSet,
    ComponenteViewSet,
    MenuItemViewSet,
    EstadoViewSet,
    MesaViewSet,
    ClienteViewSet,
    PedidoViewSet,
    OrdenViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'groups', GroupViewSet)
router.register(r'componentes', ComponenteViewSet)
router.register(r'menu-items', MenuItemViewSet)
router.register(r'estados', EstadoViewSet)
router.register(r'mesas', MesaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'pedidos', PedidoViewSet)
router.register(r'ordenes', OrdenViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('users/me/', UserViewSet.as_view({'get': 'me'}), name='user-info'),
    path('dashboard/ventas/', DashboardVentasAPI.as_view(), name='dashboard-ventas'),
    path('dashboard/productos/', DashboardProductosAPI.as_view(), name='dashboard-productos'),
    path('dashboard/usuarios/', DashboardUsuariosAPI.as_view(), name='dashboard-usuarios'),
]