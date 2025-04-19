'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import { pedidosApi, ordenesApi, mesasApi, clientesApi, menuItemsApi, estadosApi } from '@/lib/api';
import type { Mesa, Cliente, MenuItem, Estado, Orden as OrdenType, Pedido } from '@/lib/api';
import { getUserInfo } from '@/lib/auth';

interface OrdenForm {
  id?: string;
  menu_item: string;
  anotacion: string;
  estado?: string;
  temporal_id?: string;
}

interface PedidoForm {
  mesa: string;
  cliente: string | null;
  ordenes: OrdenForm[];
}

export default function PedidoFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isEditing = !!id;

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('');
  const [anotacion, setAnotacion] = useState<string>('');
  const [pedidoOriginal, setPedidoOriginal] = useState<Pedido | null>(null);

  const [formData, setFormData] = useState<PedidoForm>({
    mesa: '',
    cliente: null,
    ordenes: []
  });

  // Función para cargar datos iniciales
  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [mesasData, clientesData, menuItemsData, estadosData] = await Promise.all([
        mesasApi.getAll(),
        clientesApi.getAll(),
        menuItemsApi.getAll(),
        estadosApi.getAll()
      ]);
      
      setMesas(mesasData);
      setClientes(clientesData);
      setMenuItems(menuItemsData);
      setEstados(estadosData);

      // Si estamos editando, cargar el pedido existente
      if (isEditing) {
        const pedido = await pedidosApi.getOne(id);
        console.log('Pedido cargado:', pedido); // Añadir para debug
        setPedidoOriginal(pedido);
        
        // Preparar los datos del formulario
        const mesaId = typeof pedido.mesa === 'object' ? pedido.mesa.id : pedido.mesa;
        const clienteId = pedido.cliente ? 
          (typeof pedido.cliente === 'object' ? pedido.cliente.id : pedido.cliente) 
          : null;
        
        console.log('Mesa ID identificada:', mesaId); // Añadir para debug
        console.log('Cliente ID identificado:', clienteId); // Añadir para debug
        
        // Cargar las órdenes si están disponibles en el pedido
        let ordenes: OrdenForm[] = [];
        if (pedido.ordenes && Array.isArray(pedido.ordenes) && pedido.ordenes.length > 0) {
          console.log('Órdenes incluidas en el pedido:', pedido.ordenes); // Añadir para debug
          
          ordenes = pedido.ordenes.map(orden => ({
            id: orden.id,
            menu_item: typeof orden.menu_item === 'object' ? orden.menu_item.id : orden.menu_item,
            anotacion: orden.anotacion || '',
            estado: typeof orden.estado === 'object' ? orden.estado.id : orden.estado,
            temporal_id: orden.id
          }));
        } else {
          // Si las órdenes no están incluidas, cargarlas por separado
          console.log('Cargando órdenes separadamente para el pedido ID:', id); // Añadir para debug
          
          const ordenesResponse = await ordenesApi.getAll();
          // Filtrar correctamente solo las órdenes del pedido actual
          const pedidoOrdenes = ordenesResponse.filter(orden => {
            const ordenPedidoId = typeof orden.pedido === 'object' && orden.pedido !== null ? (orden.pedido as { id: string }).id : orden.pedido;
            return ordenPedidoId === id;
          });
          
          console.log('Órdenes encontradas para este pedido:', pedidoOrdenes); // Añadir para debug
          
          ordenes = pedidoOrdenes.map(orden => ({
            id: orden.id,
            menu_item: typeof orden.menu_item === 'object' ? orden.menu_item.id : orden.menu_item,
            anotacion: orden.anotacion || '',
            estado: typeof orden.estado === 'object' ? orden.estado.id : orden.estado,
            temporal_id: orden.id
          }));
        }
        
        console.log('Ordenes formateadas:', ordenes); // Añadir para debug
        
        setFormData({
          mesa: mesaId,
          cliente: clienteId,
          ordenes: ordenes
        });
      } else if (mesasData.length > 0) {
        // Si hay mesas disponibles y estamos creando, seleccionamos la primera por defecto
        setFormData(prev => ({ ...prev, mesa: mesasData[0].id }));
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      setError('Error al cargar los datos necesarios. Por favor, recarga la página.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [isEditing, id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrden = () => {
    if (!selectedMenuItem) {
      setError('Debes seleccionar un ítem del menú');
      return;
    }

    const newOrden: OrdenForm = {
      menu_item: selectedMenuItem,
      anotacion: anotacion,
      temporal_id: `temp-${Date.now()}`
    };

    setFormData(prev => ({
      ...prev,
      ordenes: [...prev.ordenes, newOrden]
    }));

    // Limpiar el formulario de órdenes
    setSelectedMenuItem('');
    setAnotacion('');
    setError(null);
  };

  const handleRemoveOrden = (id: string) => {
    setFormData(prev => ({
      ...prev,
      ordenes: prev.ordenes.filter(orden => 
        // Si es una orden existente, comparar por id, si es nueva, por temporal_id
        (orden.id && orden.id !== id) || (orden.temporal_id && orden.temporal_id !== id)
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.mesa) {
      setError('Debes seleccionar una mesa');
      return;
    }

    if (formData.ordenes.length === 0) {
      setError('Debes agregar al menos una orden');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      // Obtener información del usuario actual
      const userInfo = getUserInfo();
      
      if (!userInfo || !userInfo.id) {
        setError('No se pudo obtener la información del usuario actual. Por favor, inicia sesión nuevamente.');
        setIsSaving(false);
        return;
      }
      
      const estadoInicial = estados.find(e => e.nombre === 'Pendiente' || e.nombre === 'Nuevo')?.id || '';
      
      if (isEditing) {
        // Actualizar el pedido existente
        const pedidoData = {
          mesa: formData.mesa,
          cliente: formData.cliente || null,
        };
        
        console.log('Actualizando datos del pedido:', pedidoData);
        
        await pedidosApi.update(id, pedidoData);
        
        // Manejar las órdenes:
        // 1. Identificar órdenes nuevas para crear
        const ordenesNuevas = formData.ordenes.filter(orden => !orden.id);
        
        // 2. Crear las nuevas órdenes
        for (const orden of ordenesNuevas) {
          await ordenesApi.create({
            pedido: id,
            menu_item: orden.menu_item,
            anotacion: orden.anotacion,
            estado: estadoInicial
          });
        }
        
        // 3. Identificar órdenes eliminadas (que existían en el pedido original pero no en formData)
        if (pedidoOriginal?.ordenes) {
          const ordenesIdsActuales = formData.ordenes
            .filter(o => o.id) // Solo las órdenes existentes (con ID)
            .map(o => o.id);
            
          const ordenesEliminadas = pedidoOriginal.ordenes
            .filter(o => !ordenesIdsActuales.includes(o.id));
            
          // Eliminar las órdenes que ya no existen
          for (const orden of ordenesEliminadas) {
            await ordenesApi.delete(orden.id);
          }
        }
        
        // 4. Recalcular el total del pedido
        await pedidosApi.calcularTotal(id);
        
        setSuccessMessage('Pedido actualizado exitosamente');
      } else {
        // Crear un nuevo pedido
        const pedidoData = {
          mesa: formData.mesa,
          cliente: formData.cliente || null,
          usuario: userInfo.id
        };
        
        console.log('Enviando datos del pedido:', pedidoData);
        
        const pedidoCreado = await pedidosApi.create(pedidoData);
        
        // Crear las órdenes asociadas al pedido
        const ordenPromises = formData.ordenes.map(orden => 
          ordenesApi.create({
            pedido: pedidoCreado.id,
            menu_item: orden.menu_item,
            anotacion: orden.anotacion,
            estado: estadoInicial
          })
        );
        
        await Promise.all(ordenPromises);
        
        // Calcular el total del pedido
        await pedidosApi.calcularTotal(pedidoCreado.id);
        
        setSuccessMessage('Pedido creado exitosamente');
      }
      
      // Esperar un momento y redireccionar
      setTimeout(() => {
        router.push('/admin/pedidos');
      }, 1500);
      
    } catch (error) {
      console.error('Error al procesar el pedido:', error);
      setError(`Ocurrió un error al ${isEditing ? 'actualizar' : 'crear'} el pedido. Por favor, inténtalo de nuevo.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Función para encontrar el nombre del ítem del menú según su ID
  const getMenuItemName = (id: string): string => {
    const item = menuItems.find(item => item.id.toString() === id.toString());
    if (item) {
      return `${item.nombre} - $${typeof item.precio === 'number' ? item.precio.toFixed(2) : item.precio}`;
    }
    return 'Ítem no encontrado';
  };

  return (
    <ProtectedRoute allowedGroups={['Administrador', 'Gerente', 'Mesero']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-700">
            {isEditing ? 'Editar Pedido' : 'Crear Nuevo Pedido'}
          </h1>
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
            <p>{successMessage}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mesa*
                  </label>
                  <select
                    name="mesa"
                    value={formData.mesa}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    required
                  >
                    <option value="">Selecciona una mesa</option>
                    {mesas.map(mesa => (
                      <option key={mesa.id} value={mesa.id}>
                        Mesa {mesa.numero}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente (opcional)
                  </label>
                  <select
                    name="cliente"
                    value={formData.cliente || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                  >
                    <option value="">Sin cliente asociado</option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre} - {cliente.documento}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Órdenes</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ítem del Menú*
                    </label>
                    <select
                      value={selectedMenuItem}
                      onChange={(e) => setSelectedMenuItem(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    >
                      <option value="">Seleccionar ítem</option>
                      {menuItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {getMenuItemName(item.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddOrden}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center w-full justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Agregar
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anotación (opcional)
                  </label>
                  <textarea
                    value={anotacion}
                    onChange={(e) => setAnotacion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    rows={2}
                    placeholder="Especificaciones adicionales para esta orden"
                  ></textarea>
                </div>
                
                {/* Lista de órdenes añadidas */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Órdenes agregadas:</h3>
                  {formData.ordenes.length === 0 ? (
                    <div className="text-gray-500 italic">No se han agregado órdenes todavía</div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {formData.ordenes.map((orden) => (
                        <div 
                          key={orden.id || orden.temporal_id} 
                          className="flex justify-between items-center bg-white p-3 rounded-md border border-gray-200"
                        >
                          <div>
                            <div className="font-medium text-gray-800">{getMenuItemName(orden.menu_item)}</div>
                            {orden.anotacion && (
                              <div className="text-sm text-gray-600">{orden.anotacion}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOrden(orden.id || orden.temporal_id!)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push('/admin/pedidos')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md flex items-center"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    isEditing ? 'Actualizar Pedido' : 'Crear Pedido'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}