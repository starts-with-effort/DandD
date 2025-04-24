'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/app/context/SocketContext';
import { ordenesApi, pedidosApi, estadosApi, Pedido, Orden, Estado } from '@/lib/api';
import { 
  Button, Card, Chip, Divider, Badge, CircularProgress, 
  Grid, Paper, Typography, Box, Alert, IconButton
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CookingIcon from '@mui/icons-material/OutdoorGrill';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getUserInfo, logout } from '@/lib/auth';

// Interfaces para los eventos de socket
interface SocketPedidoCreado {
  id: string;
  hora_creacion: string;
  hora_pago: string | null;
  fecha_creacion: string;
  subtotal: number;
  total: number;
  usuario: number;
  mesa: string | { id: string; numero: number };
  cliente: string | { id: string; documento: string; nombre: string; celular: string } | null;
}

interface SocketOrdenActualizada {
  id: string;
  hora_creacion: string;
  hora_entrega: string | null;
  anotacion: string;
  pedido: string;
  menu_item: string | { id: string; nombre: string; precio: number; descripcion?: string };
  estado: string | { id: string; nombre: string };
}

interface PedidoConOrdenes extends Pedido {
  ordenes: OrdenDetallada[];
}

interface OrdenDetallada extends Orden { 
  menu_item: {
    id: string;
    nombre: string;
    precio: number;
    descripcion?: string;
  };
  estado: {
    id: string;
    nombre: string;
  };
}

// Constantes para los IDs de estados
const ESTADO_PENDIENTE_ID = 1;
const ESTADO_PREPARACION_ID = 2;
const ESTADO_ENTREGADO_ID = 3;

export default function CocineroPage() {
  const [pedidos, setPedidos] = useState<PedidoConOrdenes[]>([]);
  const [loading, setLoading] = useState(true);
  const [estados, setEstados] = useState<Estado[]>([]);
  const { socket, isConnected } = useSocket();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  // Convertir actualizarPedidos a useCallback para mantener una referencia estable
  const actualizarPedidos = useCallback(async () => {
    try {
      const pedidosData = await pedidosApi.getAll();
      
      const pedidosConDetalle = await Promise.all(
        pedidosData
          .filter(pedido => !pedido.hora_pago)
          .map(async (pedido) => {
            const detalles = await pedidosApi.getOne(pedido.id);
            return detalles as PedidoConOrdenes;
          })
      );

      // Filtrar usando IDs de estado en lugar de nombres
      const pedidosFiltrados = pedidosConDetalle.filter(pedido => 
        pedido.ordenes?.some(orden => {
          const estadoId = typeof orden.estado === 'object' ? 
            parseInt(orden.estado.id) : 
            (typeof orden.estado === 'string' ? parseInt(orden.estado) : orden.estado);
          
          return estadoId === ESTADO_PENDIENTE_ID || estadoId === ESTADO_PREPARACION_ID;
        })
      );
      
      setPedidos(pedidosFiltrados);
    } catch (error) {
      console.error('Error actualizando pedidos:', error);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar los estados primero para poder usarlos en el filtrado
        const estadosData = await estadosApi.getAll();
        setEstados(estadosData);
        
        // Cargar los pedidos
        await actualizarPedidos();
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar los pedidos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [actualizarPedidos]);

  // Escuchar eventos de socket
  useEffect(() => {
    if (!socket) return;

    const handlePedidoCreado = (nuevoPedido: SocketPedidoCreado) => {
      console.log('Nuevo pedido recibido:', nuevoPedido);
      actualizarPedidos();
      toast.success('¡Nuevo pedido recibido!');
    };

    const handleOrdenActualizada = (ordenActualizada: SocketOrdenActualizada) => {
      console.log('Orden actualizada:', ordenActualizada);
      actualizarPedidos();
    };

    socket.on('pedido_creado', handlePedidoCreado);
    socket.on('orden_actualizada', handleOrdenActualizada);

    return () => {
      socket.off('pedido_creado', handlePedidoCreado);
      socket.off('orden_actualizada', handleOrdenActualizada);
    };
  }, [socket, actualizarPedidos]);

  const cambiarEstadoOrden = async (ordenId: string, nuevoEstadoNombre: string) => {
    try {
      // Encontrar el ID del estado por su nombre
      const estado = estados.find(e => e.nombre === nuevoEstadoNombre);
      if (!estado) {
        toast.error(`Estado "${nuevoEstadoNombre}" no encontrado`);
        return;
      }

      await ordenesApi.cambiarEstado(ordenId, estado.id);
      toast.success(`Orden actualizada a: ${nuevoEstadoNombre}`);
      
      // Actualizar manualmente si el socket no responde rápido
      setTimeout(actualizarPedidos, 500);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al actualizar la orden');
    }
  };

  // Nueva función para cambiar el estado de todas las órdenes de un pedido
  const cambiarEstadoTodasOrdenes = async (pedidoId: string, nuevoEstadoNombre: string) => {
    try {
      const pedido = pedidos.find(p => p.id === pedidoId);
      if (!pedido) {
        toast.error('Pedido no encontrado');
        return;
      }

      const estado = estados.find(e => e.nombre === nuevoEstadoNombre);
      if (!estado) {
        toast.error(`Estado "${nuevoEstadoNombre}" no encontrado`);
        return;
      }

      // Filtrar órdenes por el estado deseado para la transición
      let ordenesAActualizar = pedido.ordenes;
      
      if (nuevoEstadoNombre === 'En Preparación') {
        // Solo cambiar a "En Preparación" las que están en "Pendiente"
        ordenesAActualizar = pedido.ordenes.filter(orden => {
          const estadoId = typeof orden.estado === 'object' ? 
            parseInt(orden.estado.id) : 
            (typeof orden.estado === 'string' ? parseInt(orden.estado) : orden.estado);
          return estadoId === ESTADO_PENDIENTE_ID;
        });
      } else if (nuevoEstadoNombre === 'Entregado') {
        // Solo cambiar a "Entregado" las que están en "En Preparación"
        ordenesAActualizar = pedido.ordenes.filter(orden => {
          const estadoId = typeof orden.estado === 'object' ? 
            parseInt(orden.estado.id) : 
            (typeof orden.estado === 'string' ? parseInt(orden.estado) : orden.estado);
          return estadoId === ESTADO_PREPARACION_ID;
        });
      }

      if (ordenesAActualizar.length === 0) {
        toast(`No hay órdenes para cambiar a "${nuevoEstadoNombre}"`, { icon: 'ℹ️' });
        return;
      }

      // Actualizar todas las órdenes seleccionadas
      const promises = ordenesAActualizar.map(orden => 
        ordenesApi.cambiarEstado(orden.id, estado.id)
      );
      
      await Promise.all(promises);
      
      toast.success(`${ordenesAActualizar.length} órdenes actualizadas a: ${nuevoEstadoNombre}`);
      setTimeout(actualizarPedidos, 500);
    } catch (error) {
      console.error('Error al cambiar estados:', error);
      toast.error('Error al actualizar las órdenes');
    }
  };

  // Utilidad para obtener el nombre del estado a partir del ID
  const getNombreEstado = (estadoId: number | string) => {
    const id = typeof estadoId === 'string' ? parseInt(estadoId) : estadoId;
    
    switch (id) {
      case ESTADO_PENDIENTE_ID:
        return 'Pendiente';
      case ESTADO_PREPARACION_ID:
        return 'En Preparación';
      case ESTADO_ENTREGADO_ID:
        return 'Entregado';
      default:
        return 'Desconocido';
    }
  };

  const getChipColor = (estadoNombre: string) => {
    switch (estadoNombre) {
      case 'Pendiente':
        return 'warning';
      case 'En Preparación':
        return 'info';
      case 'Entregado':
        return 'success';
      default:
        return 'default';
    }
  };

  const getIconForEstado = (estadoNombre: string) => {
    switch (estadoNombre) {
      case 'Pendiente':
        return <PendingIcon />;
      case 'En Preparación':
        return <CookingIcon />;
      case 'Entregado':
        return <CheckCircleIcon />;
      default:
        return <RestaurantIcon />;
    }
  };

  // Obtener el siguiente estado para un pedido según sus órdenes actuales
  const getSiguienteEstadoPedido = (pedido: PedidoConOrdenes) => {
    // Si tiene órdenes pendientes, el siguiente estado es "En Preparación"
    const tieneOrdenesPendientes = pedido.ordenes.some(orden => {
      const estadoId = typeof orden.estado === 'object' ? 
        parseInt(orden.estado.id) : 
        (typeof orden.estado === 'string' ? parseInt(orden.estado) : orden.estado);
      return estadoId === ESTADO_PENDIENTE_ID;
    });

    if (tieneOrdenesPendientes) {
      return 'En Preparación';
    }

    // Si tiene órdenes en preparación, el siguiente estado es "Entregado"
    const tieneOrdenesEnPreparacion = pedido.ordenes.some(orden => {
      const estadoId = typeof orden.estado === 'object' ? 
        parseInt(orden.estado.id) : 
        (typeof orden.estado === 'string' ? parseInt(orden.estado) : orden.estado);
      return estadoId === ESTADO_PREPARACION_ID;
    });

    if (tieneOrdenesEnPreparacion) {
      return 'Entregado';
    }

    return null; // No hay siguiente estado
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>Cargando pedidos...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header con título y acciones */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <RestaurantIcon color="primary" />
            <Typography variant="h5" component="h1" fontWeight="bold">Panel de Cocina</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              icon={isConnected ? <CheckCircleIcon /> : <PendingIcon />}
              label={isConnected ? 'Conectado' : 'Desconectado'} 
              color={isConnected ? 'success' : 'error'} 
              size="small" 
              variant="outlined"
            />
            <IconButton 
              color="primary" 
              onClick={actualizarPedidos}
              title="Actualizar pedidos"
            >
              <RefreshIcon />
            </IconButton>
            <Button 
              variant="outlined" 
              color="secondary"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              size="small"
            >
              Cerrar Sesión
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Contenido principal */}
      {pedidos.length === 0 ? (
        <Alert severity="info" icon={<CheckCircleIcon />} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6">No hay pedidos pendientes</Typography>
          <Typography variant="body2" color="text.secondary">
            Todos los pedidos han sido preparados y entregados.
          </Typography>
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {pedidos.map((pedido) => {
            // Filtrar órdenes pendientes o en preparación para este pedido
            const ordenesPendientesPreparacion = pedido.ordenes?.filter(orden => {
              const estadoId = typeof orden.estado === 'object' ? 
                parseInt(orden.estado.id) : 
                (typeof orden.estado === 'string' ? parseInt(orden.estado) : orden.estado);
              
              return estadoId === ESTADO_PENDIENTE_ID || estadoId === ESTADO_PREPARACION_ID;
            }) || [];

            // Si no hay órdenes pendientes o en preparación, no mostrar el pedido
            if (ordenesPendientesPreparacion.length === 0) {
              return null;
            }
            
            // Contar órdenes por estado
            const ordenesCount = {
              pendientes: ordenesPendientesPreparacion.filter(o => {
                const estadoId = typeof o.estado === 'object' ? 
                  parseInt(o.estado.id) : 
                  (typeof o.estado === 'string' ? parseInt(o.estado) : o.estado);
                return estadoId === ESTADO_PENDIENTE_ID;
              }).length,
              enPreparacion: ordenesPendientesPreparacion.filter(o => {
                const estadoId = typeof o.estado === 'object' ? 
                  parseInt(o.estado.id) : 
                  (typeof o.estado === 'string' ? parseInt(o.estado) : o.estado);
                return estadoId === ESTADO_PREPARACION_ID;
              }).length
            };

            // Determinar el siguiente estado para todo el pedido
            const siguienteEstado = getSiguienteEstadoPedido(pedido);
            
            return (
              <Grid container size={{xs:12}} key={pedido.id}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2,
                    borderLeft: '5px solid',
                    borderColor: ordenesCount.pendientes > 0 ? 'warning.main' : 'info.main',
                  }}
                >
                  {/* Cabecera del pedido */}
                  <Box 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center" 
                    mb={2}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <FastfoodIcon color="primary" fontSize="large" />
                      <Box>
                        <Typography variant="h6">
                          Pedido #{pedido.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Mesa {typeof pedido.mesa === 'object' ? pedido.mesa.numero : 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      {ordenesCount.pendientes > 0 && (
                        <Chip 
                          icon={<PendingIcon />}
                          label={`${ordenesCount.pendientes} Pendientes`}
                          color="warning"
                          variant="outlined"
                        />
                      )}
                      {ordenesCount.enPreparacion > 0 && (
                        <Chip 
                          icon={<CookingIcon />}
                          label={`${ordenesCount.enPreparacion} En Preparación`}
                          color="info"
                          variant="outlined"
                        />
                      )}
                      {siguienteEstado && (
                        <Button
                          variant="contained"
                          color={siguienteEstado === 'En Preparación' ? 'primary' : 'success'}
                          startIcon={siguienteEstado === 'En Preparación' ? <CookingIcon /> : <CheckCircleIcon />}
                          onClick={() => cambiarEstadoTodasOrdenes(pedido.id, siguienteEstado)}
                        >
                          {siguienteEstado === 'En Preparación' 
                            ? 'Preparar Todas' 
                            : 'Entregar Todas'}
                        </Button>
                      )}
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  {/* Lista de órdenes */}
                  <Grid container spacing={2}>
                    {ordenesPendientesPreparacion.map((orden) => {
                      // Obtener el nombre del estado
                      const estadoId = typeof orden.estado === 'object' ? 
                        parseInt(orden.estado.id) : 
                        (typeof orden.estado === 'string' ? parseInt(orden.estado) : orden.estado);
                      
                      const estadoNombre = getNombreEstado(estadoId);
                      
                      return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={orden.id}>
                          <Paper
                            elevation={1}
                            sx={{
                              p: 2,
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              borderLeft: '3px solid',
                              borderColor: getChipColor(estadoNombre) + '.main',
                              backgroundColor: (estadoNombre === 'Pendiente') 
                                ? 'rgba(255, 244, 229, 0.5)' 
                                : (estadoNombre === 'En Preparación' 
                                  ? 'rgba(232, 244, 253, 0.5)' 
                                  : 'white')
                            }}
                          >
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {orden.menu_item.nombre}
                              </Typography>
                              {orden.anotacion && (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    mt: 1, 
                                    p: 1, 
                                    backgroundColor: 'rgba(0,0,0,0.04)', 
                                    borderRadius: 1,
                                    fontStyle: 'italic'
                                  }}
                                >
                                  {orden.anotacion}
                                </Typography>
                              )}
                            </Box>
                            
                            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                              <Chip 
                                icon={getIconForEstado(estadoNombre)}
                                label={estadoNombre} 
                                color={getChipColor(estadoNombre)} 
                                size="small"
                              />
                              
                              {/* Acciones individuales */}
                              {estadoId === ESTADO_PENDIENTE_ID && (
                                <Button
                                  variant="outlined"
                                  color="primary"
                                  size="small"
                                  onClick={() => cambiarEstadoOrden(orden.id, 'En Preparación')}
                                >
                                  Preparar
                                </Button>
                              )}
                              {estadoId === ESTADO_PREPARACION_ID && (
                                <Button
                                  variant="outlined"
                                  color="success"
                                  size="small"
                                  onClick={() => cambiarEstadoOrden(orden.id, 'Entregado')}
                                >
                                  Entregar
                                </Button>
                              )}
                            </Box>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}