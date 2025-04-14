'use client';

import { useState, useEffect, use } from 'react'; // Add 'use' import
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { pedidosApi, ordenesApi, menuItemsApi, estadosApi, Pedido, Orden, MenuItem, Estado } from '@/lib/api';
import { useForm } from 'react-hook-form';

interface PageProps {
  params: {
    id: string;
  };
}

interface NuevaOrdenForm {
  menu_item: string;
  anotacion: string;
}

export default function DetallePedidoPage({ params }: PageProps) {
  // Unwrap params with React.use()
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NuevaOrdenForm>();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pedidoData, menuItemsData, estadosData] = await Promise.all([
          pedidosApi.getOne(id),
          menuItemsApi.getAll(),
          estadosApi.getAll()
        ]);
        
        setPedido(pedidoData);
        setMenuItems(menuItemsData);
        setEstados(estadosData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar los datos. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);
  
  const onSubmit = async (data: NuevaOrdenForm) => {
    setSubmitting(true);
    setError(null);
    
    try {
      // Buscamos el primer estado (asumiendo que es "Pendiente" o similar)
      const estadoInicial = estados.length > 0 ? estados[0].id : '';
      
      await ordenesApi.create({
        pedido: id,
        menu_item: data.menu_item,
        anotacion: data.anotacion,
        estado: estadoInicial
      });
      
      // Refrescar datos del pedido
      const pedidoActualizado = await pedidosApi.getOne(id);
      setPedido(pedidoActualizado);
      
      // Calcular el total del pedido
      await pedidosApi.calcularTotal(id);
      
      // Resetear formulario
      reset();
    } catch (err) {
      console.error('Error creating orden:', err);
      setError('Error al crear la orden. Por favor, intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCambiarEstado = async (ordenId: string, estadoId: string) => {
    try {
      await ordenesApi.cambiarEstado(ordenId, estadoId);
      
      // Refrescar datos del pedido
      const pedidoActualizado = await pedidosApi.getOne(id);
      setPedido(pedidoActualizado);
    } catch (err) {
      console.error('Error changing estado:', err);
      setError('Error al cambiar el estado de la orden.');
    }
  };
  
  const handlePagarPedido = async () => {
    try {
      await pedidosApi.update(id, {
        hora_pago: new Date().toTimeString().split(' ')[0]
      });
      
      // Refrescar datos del pedido
      const pedidoActualizado = await pedidosApi.getOne(id);
      setPedido(pedidoActualizado);
    } catch (err) {
      console.error('Error paying pedido:', err);
      setError('Error al pagar el pedido.');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
        {error}
      </div>
    );
  }
  
  if (!pedido) {
    return (
      <div className="bg-yellow-100 text-yellow-700 p-4 rounded-md">
        No se encontró el pedido solicitado.
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pedido #{pedido.id}</h1>
        <div className="flex space-x-2">
          <Link 
            href="/pedidos"
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Volver a Pedidos
          </Link>
          {!pedido.hora_pago && (
            <button
              onClick={handlePagarPedido}
              className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Marcar como Pagado
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Información</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Fecha:</span> {pedido.fecha_creacion}</p>
            <p><span className="font-medium">Hora:</span> {pedido.hora_creacion}</p>
            <p>
              <span className="font-medium">Estado:</span> 
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                pedido.hora_pago ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {pedido.hora_pago ? 'Pagado' : 'Activo'}
              </span>
            </p>
            <p><span className="font-medium">Mesa:</span> {
              typeof pedido.mesa === 'string' 
                ? pedido.mesa
                : `Mesa ${pedido.mesa.numero}`
            }</p>
            <p><span className="font-medium">Cliente:</span> {
              pedido.cliente 
                ? (typeof pedido.cliente === 'string' 
                  ? pedido.cliente
                  : pedido.cliente.nombre)
                : 'Sin cliente asignado'
            }</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Totales</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Subtotal:</span> ${
              typeof pedido.subtotal === 'number' 
                ? pedido.subtotal.toFixed(2) 
                : Number(pedido.subtotal).toFixed(2)
            }</p>
            <p className="text-xl font-bold"><span>Total:</span> ${
              typeof pedido.total === 'number' 
                ? pedido.total.toFixed(2) 
                : Number(pedido.total).toFixed(2)
            }</p>
          </div>
        </div>
        
        {!pedido.hora_pago && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Agregar Orden</h2>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-4">
                <label htmlFor="menu_item" className="block text-gray-700 font-medium mb-2">
                  Ítem de Menú
                </label>
                <select
                  id="menu_item"
                  className={`w-full px-3 py-2 border ${
                    errors.menu_item ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  {...register('menu_item', { required: 'Selecciona un ítem del menú' })}
                >
                  <option value="">Selecciona un ítem</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} - ${typeof item.precio === 'number' 
                        ? item.precio.toFixed(2) 
                        : Number(item.precio).toFixed(2)}
                    </option>
                  ))}
                </select>
                {errors.menu_item && (
                  <p className="mt-1 text-red-500 text-sm">{errors.menu_item.message}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="anotacion" className="block text-gray-700 font-medium mb-2">
                  Anotación (opcional)
                </label>
                <textarea
                  id="anotacion"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('anotacion')}
                />
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? 'Agregando...' : 'Agregar Orden'}
              </button>
            </form>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Órdenes</h2>
        
        {!pedido.ordenes || pedido.ordenes.length === 0 ? (
          <p className="text-gray-500">No hay órdenes en este pedido.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ítem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anotación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pedido.ordenes.map((orden) => (
                  <tr key={orden.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{orden.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {typeof orden.menu_item === 'string' 
                        ? menuItems.find(item => item.id === orden.menu_item)?.nombre || orden.menu_item
                        : orden.menu_item.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${typeof orden.menu_item === 'string' 
                        ? (() => {
                            const item = menuItems.find(item => item.id === orden.menu_item);
                            if (!item) return '0.00';
                            return typeof item.precio === 'number' 
                              ? item.precio.toFixed(2) 
                              : Number(item.precio).toFixed(2);
                          })()
                        : typeof orden.menu_item.precio === 'number'
                          ? orden.menu_item.precio.toFixed(2)
                          : Number(orden.menu_item.precio).toFixed(2)
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {orden.anotacion || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!pedido.hora_pago ? (
                        <select
                          value={typeof orden.estado === 'string' ? orden.estado : orden.estado.id}
                          onChange={(e) => handleCambiarEstado(orden.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          {estados.map((estado) => (
                            <option key={estado.id} value={estado.id}>
                              {estado.nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>
                          {typeof orden.estado === 'string' 
                            ? estados.find(e => e.id === orden.estado)?.nombre || orden.estado
                            : orden.estado.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!pedido.hora_pago && (
                        <button
                          onClick={() => ordenesApi.delete(orden.id).then(() => {
                            setPedido({
                              ...pedido,
                              ordenes: (pedido.ordenes ?? []).filter(o => o.id !== orden.id)
                            });
                            pedidosApi.calcularTotal(id);
                          }).catch(err => {
                            console.error('Error deleting orden:', err);
                            setError('Error al eliminar la orden.');
                          })}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}