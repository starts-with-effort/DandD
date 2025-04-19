'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import { pedidosApi, Pedido, estadosApi, Estado } from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchPedidos = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await pedidosApi.getAll();
      setPedidos(data);
    } catch (error) {
      console.error('Error fetching pedidos:', error);
      setError('Error al cargar los pedidos. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const handleCreatePedido = () => {
    router.push('/admin/pedidos/nuevo');
  };

  const handleViewPedido = (id: string) => {
    router.push(`/admin/pedidos/detalles/${id}`);
  };

  const handleDeletePedido = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
      return;
    }
    
    try {
      await pedidosApi.delete(id);
      fetchPedidos();
    } catch (error) {
      console.error('Error deleting pedido:', error);
      setError('Error al eliminar el pedido. Por favor, inténtalo de nuevo.');
    }
  };

  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string): string => {
    try {
      console.log('Date string:', dateString); // Debugging line
      const date = new Date(dateString);
      return format(date, "dd MMM yyyy", { locale: es });
    } catch (error) {
      return "Fecha no disponible";
    }
  };

  // Función para contar órdenes completadas vs. total
  const getOrdenesProgress = (pedido: Pedido) => {
    if (!pedido.ordenes || pedido.ordenes.length === 0) {
      return "0/0";
    }
    
    const completadas = pedido.ordenes.filter(orden => {
      const estado = typeof orden.estado === 'string' 
        ? orden.estado 
        : orden.estado?.nombre;
      return estado === 'Entregado' || estado === 'Completado';
    }).length;
    
    return `${completadas}/${pedido.ordenes.length}`;
  };

  // Función para obtener un color según el estado de progreso
  const getProgressColor = (pedido: Pedido) => {
    if (!pedido.ordenes || pedido.ordenes.length === 0) return "bg-gray-200";
    
    const total = pedido.ordenes.length;
    const completadas = pedido.ordenes.filter(orden => {
      const estado = typeof orden.estado === 'string' 
        ? orden.estado 
        : orden.estado?.nombre;
      return estado === 'Entregado' || estado === 'Completado';
    }).length;
    
    const porcentaje = (completadas / total) * 100;
    
    if (porcentaje === 100) return "bg-green-500";
    if (porcentaje >= 70) return "bg-blue-500";
    if (porcentaje >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Función para formatear el precio
  const formatPrice = (price: any): string => {
    if (price === null || price === undefined) {
      return '$0.00';
    }
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) {
      return '$0.00';
    }
    
    return `$${numPrice.toFixed(2)}`;
  };

  return (
    <ProtectedRoute allowedGroups={['Administrador', 'Gerente', 'Mesero']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-700">Gestión de Pedidos</h1>
          <button
            onClick={handleCreatePedido}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Nuevo Pedido
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pedidos.length === 0 ? (
              <div className="col-span-full bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
                No hay pedidos para mostrar
              </div>
            ) : (
              pedidos.map((pedido) => (
                <div key={`pedido-${pedido.id}`} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                          Mesa {typeof pedido.mesa === 'string' ? 'No disponible' : pedido.mesa.numero}
                        </h2>
                        <p className="text-sm text-gray-500 mb-1">
                          {formatDateTime(pedido.fecha_creacion)}
                        </p>
                        {pedido.cliente && (
                          <p className="text-sm text-gray-600 mb-2">
                            Cliente: {typeof pedido.cliente === 'string' ? 'No disponible' : pedido.cliente.nombre}
                          </p>
                        )}
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-lg font-bold px-3 py-1 rounded-full">
                        {formatPrice(pedido.total)}
                      </span>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          Progreso de órdenes: {getOrdenesProgress(pedido)}
                        </span>
                        {pedido.hora_pago ? (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Pagado
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            Pendiente
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className={`${getProgressColor(pedido)} h-2.5 rounded-full`} style={{ 
                          width: pedido.ordenes && pedido.ordenes.length > 0 
                            ? `${(pedido.ordenes.filter(o => {
                              const estado = typeof o.estado === 'string' ? o.estado : o.estado?.nombre;
                              return estado === 'Entregado' || estado === 'Completado';
                            }).length / pedido.ordenes.length) * 100}%` 
                            : '0%' 
                        }}></div>
                      </div>
                    </div>
                    
                    {pedido.ordenes && pedido.ordenes.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Ítems:</h3>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {pedido.ordenes.slice(0, 3).map((orden, index) => (
                            <li key={`orden-${pedido.id}-${index}`} className="flex justify-between">
                              <span>
                                {typeof orden.menu_item === 'string' 
                                  ? 'Producto no disponible' 
                                  : orden.menu_item.nombre}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                typeof orden.estado === 'string' 
                                  ? 'bg-gray-100 text-gray-800' 
                                  : orden.estado.nombre === 'Completado' || orden.estado.nombre === 'Entregado'
                                    ? 'bg-green-100 text-green-800'
                                    : orden.estado.nombre === 'En preparación'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-blue-100 text-blue-800'
                              }`}>
                                {typeof orden.estado === 'string' ? 'No disponible' : orden.estado.nombre}
                              </span>
                            </li>
                          ))}
                          {pedido.ordenes.length > 3 && (
                            <li className="text-blue-500 text-xs mt-1">
                              +{pedido.ordenes.length - 3} más...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    <div className="mt-6 flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewPedido(pedido.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver Detalles
                      </button>
                      <button
                        onClick={() => handleDeletePedido(pedido.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}