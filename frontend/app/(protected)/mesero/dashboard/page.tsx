'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  mesasApi, 
  pedidosApi, 
  menuItemsApi, 
  estadosApi,
  ordenesApi,
  clientesApi,
  Pedido, 
  MenuItem, 
  Mesa, 
  Estado,
  Orden,
  Cliente,
} from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useSocket } from '@/app/context/SocketContext';
import { FaSearch, FaPlus, FaMinus, FaTrash, FaSave, FaTimes, FaUtensils } from 'react-icons/fa';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import { getUserInfo , logout} from '@/lib/auth'; // Importar función para obtener información del usuario

export default function MeseroPedidos() {
  return (
    <ProtectedRoute allowedGroups={['Mesero']}>
      <PedidosManager />
    </ProtectedRoute>
  );
}

function PedidosManager() {
  const router = useRouter();
  const { socket } = useSocket();

  // Estados principales
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // Estados para el flujo de trabajo
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [currentPedido, setCurrentPedido] = useState<Pedido | null>(null);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el carrito de órdenes temporales
  const [tempOrdenes, setTempOrdenes] = useState<{
    menuItem: MenuItem;
    cantidad: number;
    anotacion: string;
  }[]>([]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };
  
  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        const [mesasData, pedidosData, menuItemsData, estadosData, clientesData] = await Promise.all([
          mesasApi.getAll(),
          pedidosApi.getAll(),
          menuItemsApi.getAll(),
          estadosApi.getAll(),
          clientesApi.getAll()
        ]);
        
        setMesas(mesasData);
        setPedidos(pedidosData);
        setMenuItems(menuItemsData);
        setFilteredItems(menuItemsData);
        setEstados(estadosData);
        setClientes(clientesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Error al cargar datos');
      }
    };
    
    loadData();
  }, []);
  
  // Configurar sockets para actualizaciones en tiempo real
  useEffect(() => {
    if (!socket) return;
    
    // Escuchar actualizaciones de órdenes
    socket.on('orden_actualizada', (ordenActualizada: Orden) => {
      setPedidos(prevPedidos => {
        return prevPedidos.map(pedido => {
          if (pedido.ordenes && pedido.id === ordenActualizada.pedido) {
            const updatedOrdenes = pedido.ordenes.map(orden => 
              orden.id === ordenActualizada.id ? ordenActualizada : orden
            );
            return {...pedido, ordenes: updatedOrdenes};
          }
          return pedido;
        });
      });
      
      // Actualizar también el pedido actual si está seleccionado
      if (currentPedido && currentPedido.ordenes && currentPedido.id === ordenActualizada.pedido) {
        setCurrentPedido(prev => {
          if (!prev) return prev;
          const updatedOrdenes = prev.ordenes?.map(orden => 
            orden.id === ordenActualizada.id ? ordenActualizada : orden
          );
          return {...prev, ordenes: updatedOrdenes};
        });
      }
      
      const estadoNombre = typeof ordenActualizada.estado === 'object' 
        ? ordenActualizada.estado.nombre 
        : getEstadoNombre(ordenActualizada.estado);
      
      toast.success(`Orden ${ordenActualizada.id} actualizada a estado: ${estadoNombre}`);
    });
    
    // Escuchar nuevos pedidos
    socket.on('pedido_creado', (nuevoPedido: Pedido) => {
      setPedidos(prev => [...prev, nuevoPedido]);
      toast.success(`Nuevo pedido creado: ${nuevoPedido.id}`);
    });
    
    // Limpiar listeners
    return () => {
      socket.off('orden_actualizada');
      socket.off('pedido_creado');
    };
  }, [socket, currentPedido, estados]);
  
  // Efecto para filtrar productos del menú
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredItems(menuItems);
    } else {
      const filtered = menuItems.filter(item => 
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, menuItems]);
  
  // Obtener pedido actual para una mesa seleccionada
  const getPedidoForMesa = (mesaId: string) => {
    if(mesaTienePedidoActivo(mesaId)) {
      return pedidos.find(p => 
        typeof p.mesa === 'object' 
          ? p.mesa.id === mesaId 
          : p.mesa === mesaId
      );
    } else return;
  };
  
  // Nueva función para determinar el estado predominante de un pedido
  const getPedidoEstado = (pedidoId: string) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    
    if (!pedido || !pedido.ordenes || pedido.ordenes.length === 0) {
      return null;
    }
    
    // Contar órdenes por estado
    let pendientes = 0;
    let preparando = 0;
    let entregados = 0;
    
    pedido.ordenes.forEach(orden => {
      const estadoId = typeof orden.estado === 'object' 
        ? orden.estado.id 
        : orden.estado;
      
      if (estadoId === '1') pendientes++;
      else if (estadoId === '2') preparando++;
      else if (estadoId === '3') entregados++;
    });
    
    // Determinar estado predominante según prioridad
    if (preparando > 0) return '2'; // En Preparación tiene prioridad 
    if (pendientes > 0) return '1'; // Pendiente es siguiente en prioridad
    if (entregados > 0) return '3'; // Entregado
    
    return null;
  };
  
  // Verificar si una mesa tiene un pedido activo y su estado
  const mesaTienePedidoActivo = (mesaId: string) => {
    const pedidoActivo = pedidos.find(p => {
      const mesa = typeof p.mesa === 'object' ? p.mesa.id : p.mesa;
      return mesa === mesaId && !p.hora_pago;
    });
    
    if (!pedidoActivo) return null;
    
    return {
      pedidoId: pedidoActivo.id,
      estado: getPedidoEstado(pedidoActivo.id)
    };
  };
  
  // Función auxiliar para obtener el nombre del estado a partir del ID
  const getEstadoNombre = (estadoId: string) => {
    if (estadoId === '1') return 'Pendiente';
    if (estadoId === '2') return 'En Preparación';
    if (estadoId === '3') return 'Entregado';
    return 'Desconocido';
  };
  
  // Seleccionar una mesa
  const handleSelectMesa = async (mesa: Mesa) => {
    setSelectedMesa(mesa);
    
    // Verificar si hay un pedido activo para esta mesa
    const pedidoExistente = getPedidoForMesa(mesa.id);
    
    if (pedidoExistente) {
      // Si existe, cargar los detalles completos
      try {
        const pedidoDetalle = await pedidosApi.getOne(pedidoExistente.id);
        setCurrentPedido(pedidoDetalle);
        setTempOrdenes([]); // Limpiar órdenes temporales
      } catch (error) {
        console.error('Error al cargar detalles del pedido:', error);
        toast.error('Error al cargar pedido');
      }
    } else {
      // Si no existe, preparar para crear uno nuevo
      setCurrentPedido(null);
      setTempOrdenes([]);
    }
  };
  
  // Funciones para gestionar órdenes temporales
  const addTempOrden = (menuItem: MenuItem) => {
    // Verificar si ya existe esta orden temporal
    const existingIndex = tempOrdenes.findIndex(o => o.menuItem.id === menuItem.id);
    
    if (existingIndex >= 0) {
      // Incrementar cantidad si ya existe
      const updatedOrdenes = [...tempOrdenes];
      updatedOrdenes[existingIndex].cantidad += 1;
      setTempOrdenes(updatedOrdenes);
    } else {
      // Agregar nueva orden temporal
      setTempOrdenes([...tempOrdenes, {
        menuItem,
        cantidad: 1,
        anotacion: ''
      }]);
    }
    
    toast.success(`${menuItem.nombre} añadido`);
  };
  
  const removeTempOrden = (index: number) => {
    setTempOrdenes(prev => prev.filter((_, i) => i !== index));
  };
  
  const updateTempOrdenCantidad = (index: number, cantidad: number) => {
    setTempOrdenes(prev => {
      const updated = [...prev];
      updated[index].cantidad = Math.max(1, cantidad); // Mínimo 1
      return updated;
    });
  };
  
  const updateTempOrdenAnotacion = (index: number, anotacion: string) => {
    setTempOrdenes(prev => {
      const updated = [...prev];
      updated[index].anotacion = anotacion;
      return updated;
    });
  };
  
  // Crear nuevo pedido
  const handleCrearPedido = async () => {
    if (!selectedMesa || tempOrdenes.length === 0) {
      toast.error('Selecciona una mesa y añade al menos un plato');
      return;
    }
    
    const userId = getUserInfo()?.id;
    
    if (!userId) {
      toast.error('Error: No se pudo identificar el usuario actual');
      return;
    }
    
    try {
      // 1. Crear el pedido con el ID de usuario
      const nuevoPedido = await pedidosApi.create({
        mesa: selectedMesa.id,
        subtotal: 0, // Se calculará automáticamente
        total: 0,     // Se calculará automáticamente
        usuario: userId
      });
      
      // 2. Crear las órdenes
      const estadoPendiente = estados.find(e => e.nombre === 'Pendiente');
      
      if (!estadoPendiente) {
        throw new Error('Estado Pendiente no encontrado');
      }
      
      // Crear todas las órdenes
      const ordenesPromises = [];
      
      for (const tempOrden of tempOrdenes) {
        for (let i = 0; i < tempOrden.cantidad; i++) {
          ordenesPromises.push(
            ordenesApi.create({
              pedido: nuevoPedido.id,
              menu_item: tempOrden.menuItem.id,
              estado: estadoPendiente.id,
              anotacion: tempOrden.anotacion
            })
          );
        }
      }
      
      await Promise.all(ordenesPromises);
      
      // 3. Calcular el total del pedido
      await pedidosApi.calcularTotal(nuevoPedido.id);
      
      // 4. Cargar el pedido completo
      const pedidoCompleto = await pedidosApi.getOne(nuevoPedido.id);
      
      // 5. Actualizar estados
      setCurrentPedido(pedidoCompleto);
      setPedidos(prev => [...prev, pedidoCompleto]);
      setTempOrdenes([]);
      
      toast.success('Pedido creado exitosamente');
    } catch (error) {
      console.error('Error al crear pedido:', error);
      toast.error('Error al crear pedido');
    }
  };
  
  // Añadir órdenes a un pedido existente
  const handleAddOrdenesToPedido = async () => {
    if (!currentPedido || tempOrdenes.length === 0) {
      toast.error('Selecciona órdenes para añadir');
      return;
    }
    
    try {
      // 1. Obtener estado pendiente
      const estadoPendiente = estados.find(e => e.nombre === 'Pendiente');
      
      if (!estadoPendiente) {
        throw new Error('Estado Pendiente no encontrado');
      }
      
      // 2. Crear todas las órdenes nuevas
      const ordenesPromises = [];
      
      for (const tempOrden of tempOrdenes) {
        for (let i = 0; i < tempOrden.cantidad; i++) {
          ordenesPromises.push(
            ordenesApi.create({
              pedido: currentPedido.id,
              menu_item: tempOrden.menuItem.id,
              estado: estadoPendiente.id,
              anotacion: tempOrden.anotacion
            })
          );
        }
      }
      
      await Promise.all(ordenesPromises);
      
      // 3. Recalcular el total
      await pedidosApi.calcularTotal(currentPedido.id);
      
      // 4. Recargar el pedido actualizado
      const pedidoActualizado = await pedidosApi.getOne(currentPedido.id);
      
      // 5. Actualizar estados
      setCurrentPedido(pedidoActualizado);
      setPedidos(prev => prev.map(p => p.id === pedidoActualizado.id ? pedidoActualizado : p));
      setTempOrdenes([]);
      
      toast.success('Órdenes añadidas al pedido');
    } catch (error) {
      console.error('Error al añadir órdenes:', error);
      toast.error('Error al añadir órdenes');
    }
  };
  
  // Eliminar una orden existente
  const handleDeleteOrden = async (ordenId: string) => {
    if (!currentPedido) return;
    
    try {
      // 1. Eliminar la orden
      await ordenesApi.delete(ordenId);
      
      // 2. Recalcular total
      await pedidosApi.calcularTotal(currentPedido.id);
      
      // 3. Recargar pedido
      const pedidoActualizado = await pedidosApi.getOne(currentPedido.id);
      
      // 4. Actualizar estados
      setCurrentPedido(pedidoActualizado);
      setPedidos(prev => prev.map(p => p.id === pedidoActualizado.id ? pedidoActualizado : p));
      
      toast.success('Orden eliminada');
    } catch (error) {
      console.error('Error al eliminar orden:', error);
      toast.error('Error al eliminar orden');
    }
  };
  
  // Finalizar pedido
  const handleFinalizarPedido = async () => {
    if (!currentPedido) return;
    
    try {
      // Verificar si todas las órdenes están entregadas
      if (currentPedido.ordenes && currentPedido.ordenes.length > 0) {
        const todasEntregadas = currentPedido.ordenes.every(orden => {
          const estadoNombre = typeof orden.estado === 'object' 
            ? orden.estado.nombre 
            : estados.find(e => e.id === orden.estado)?.nombre;
          return estadoNombre === 'Entregado';
        });
        
        if (!todasEntregadas) {
          toast.error('No se puede finalizar: todas las órdenes deben estar entregadas');
          return;
        }
      }
      
      // Preparar objeto para enviar solo los campos necesarios y en el formato correcto
        const Hora_Pago = new Date().toLocaleTimeString('en-US', { hour12: false })
        const pedidoToUpdate = {
        hora_pago: Hora_Pago,
        // Enviar solo el ID, no el objeto completo
        usuario: currentPedido.usuario && typeof currentPedido.usuario === 'object' && 'id' in currentPedido.usuario
          ? currentPedido.usuario.id
          : currentPedido.usuario,
        mesa: currentPedido.mesa && typeof currentPedido.mesa === 'object' && 'id' in currentPedido.mesa
          ? currentPedido.mesa.id
          : currentPedido.mesa,
        // Mantener otros campos importantes
        cliente: currentPedido.cliente && typeof currentPedido.cliente === 'object' && 'id' in currentPedido.cliente
          ? currentPedido.cliente.id
          : currentPedido.cliente,
        total: currentPedido.total,
        subtotal: currentPedido.subtotal,
      };
      
      // Actualizar el pedido
      const pedidoActualizado = await pedidosApi.update(currentPedido.id, pedidoToUpdate);
      
      // Actualizar el estado local
      setPedidos(prevPedidos => 
        prevPedidos.map(p => 
          p.id === currentPedido.id 
            ? { ...p, hora_pago: Hora_Pago } 
            : p
        )
      );
      
      // Resetear selección
      setCurrentPedido(null);
      setSelectedMesa(null);
      
      toast.success('Pedido finalizado correctamente');
    } catch (error) {
      console.error('Error al finalizar pedido:', error);
      toast.error('Error al finalizar pedido');
    }
  };
  
  // Cancelar pedido
  const handleCancelarPedido = async () => {
    if (!currentPedido) return;

    try {
      // 1. Eliminar todas las órdenes asociadas al pedido
      if (currentPedido.ordenes && currentPedido.ordenes.length > 0) {
        const deleteOrdenesPromises = currentPedido.ordenes.map(orden =>
          ordenesApi.delete(orden.id)
        );
        await Promise.all(deleteOrdenesPromises);
      }

      // 2. Eliminar el pedido
      await pedidosApi.delete(currentPedido.id);

      // 3. Actualizar el estado de la lista de pedidos
      setPedidos(prev => prev.filter(p => p.id !== currentPedido.id));

      // 4. Resetear la selección
      setCurrentPedido(null);
      setSelectedMesa(null);

      toast.success('Pedido cancelado correctamente');
    } catch (error) {
      console.error('Error al cancelar pedido:', error);
      toast.error('Error al cancelar pedido');
    }
  };
  
  // Renderizar interface según el estado
  const renderContent = () => {
    // Si no hay mesa seleccionada, mostrar cuadrícula de mesas
    if (!selectedMesa) {
      return (
        <div className="px-4 py-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Selecciona una Mesa</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {mesas.map(mesa => {
              const pedidoInfo = mesaTienePedidoActivo(mesa.id);
              const tienePedido = pedidoInfo !== null;
              
              let estadoClasses = 'bg-white hover:bg-gray-50';
              let estadoTexto = '';
              
              if (tienePedido) {
                if (pedidoInfo?.estado === '2') {
                  estadoClasses = 'bg-amber-100 border-2 border-amber-500';
                  estadoTexto = 'En preparación';
                } else if (pedidoInfo?.estado === '1') {
                  estadoClasses = 'bg-gray-100 border-2 border-gray-500';
                  estadoTexto = 'Órdenes pendientes';
                } else if (pedidoInfo?.estado === '3') {
                  estadoClasses = 'bg-green-100 border-2 border-green-500';
                  estadoTexto = 'Órdenes entregadas';
                } else {
                  estadoClasses = 'bg-amber-100 border-2 border-amber-500';
                  estadoTexto = 'Pedido activo';
                }
              }
              
              return (
                <button
                  key={mesa.id}
                  onClick={() => handleSelectMesa(mesa)}
                  className={`p-6 rounded-lg shadow-md text-center flex flex-col items-center justify-center h-28 ${estadoClasses}`}
                >
                  <span className="text-2xl font-bold mb-1 text-gray-800">Mesa {mesa.numero}</span>
                  {tienePedido && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pedidoInfo?.estado === '2' ? 'bg-amber-500 text-white' :
                      pedidoInfo?.estado === '3' ? 'bg-green-500 text-white' : 
                      'bg-gray-500 text-white'
                    }`}>
                      {estadoTexto}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Si hay mesa seleccionada pero no hay pedido, mostrar interfaz para crear pedido
    if (selectedMesa && !currentPedido) {
      return (
        <div className="px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Nuevo Pedido - Mesa {selectedMesa.numero}</h2>
            <button 
              onClick={() => setSelectedMesa(null)}
              className="text-gray-700 p-2"
            >
              <FaTimes />
            </button>
          </div>
          
          {/* Buscador de platos */}
          <div className="mb-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-600" />
            </div>
            <input
              type="text"
              placeholder="Buscar platos..."
              className="pl-10 p-2 w-full border rounded-lg bg-white text-gray-800 border-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Cuadrícula de platos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => addTempOrden(item)}
                className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 flex flex-col h-32"
              >
                <span className="font-medium text-sm line-clamp-2 text-gray-800">{item.nombre}</span>
                <span className="text-green-600 font-bold mt-1">${item.precio}</span>
                <span className="text-xs text-gray-700 line-clamp-3 mt-1">
                  {item.descripcion || 'Sin descripción'}
                </span>
              </button>
            ))}
          </div>
          
          {/* Órdenes temporales */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="font-semibold mb-2 text-gray-800">Órdenes ({tempOrdenes.reduce((sum, o) => sum + o.cantidad, 0)})</h3>
            
            {tempOrdenes.length === 0 ? (
              <p className="text-gray-700 text-sm">Agrega platos a tu pedido</p>
            ) : (
              <div>
                {tempOrdenes.map((orden, index) => (
                  <div key={index} className="border-b py-2 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{orden.menuItem.nombre}</p>
                        <p className="text-green-600 text-sm">${orden.menuItem.precio} c/u</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => updateTempOrdenCantidad(index, orden.cantidad - 1)}
                          className="p-1 bg-gray-50 rounded-full text-gray-600"
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span className="text-sm w-5 text-center text-gray-800">{orden.cantidad}</span>
                        <button 
                          onClick={() => updateTempOrdenCantidad(index, orden.cantidad + 1)}
                          className="p-1 bg-gray-50 rounded-full text-gray-600"
                        >
                          <FaPlus className="text-xs" />
                        </button>
                        <button 
                          onClick={() => removeTempOrden(index)}
                          className="p-1 bg-red-100 rounded-full"
                        >
                          <FaTrash className="text-xs text-red-500" />
                        </button>
                      </div>
                    </div>
                    
                    <textarea
                      placeholder="Anotaciones (opcional)"
                      value={orden.anotacion}
                      onChange={(e) => updateTempOrdenAnotacion(index, e.target.value)}
                      className="w-full text-sm p-2 mt-1 border rounded-md text-gray-800 border-gray-300"
                      rows={1}
                    />
                  </div>
                ))}
                
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-800">Total aproximado:</p>
                    <p className="font-bold text-green-600 text-lg">
                      ${tempOrdenes.reduce((sum, o) => sum + (o.menuItem.precio * o.cantidad), 0).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setTempOrdenes([])}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700"
                    >
                      Limpiar
                    </button>
                    <button
                      onClick={handleCrearPedido}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-md flex items-center"
                      disabled={tempOrdenes.length === 0}
                    >
                      <FaSave className="mr-1" /> Guardar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Si hay mesa y pedido, mostrar interfaz para editar pedido
    if (selectedMesa && currentPedido) {
      const todasOrdenesEntregadas = currentPedido?.ordenes && currentPedido.ordenes.length > 0
        ? currentPedido.ordenes.every(orden => {
            const estadoNombre = typeof orden.estado === 'object' 
              ? orden.estado.nombre 
              : estados.find(e => e.id === orden.estado)?.nombre;
            return estadoNombre === 'Entregado';
          })
        : false;

      return (
        <div className="px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Pedido #{currentPedido.id} - Mesa {selectedMesa.numero}
            </h2>
            <button 
              onClick={() => setSelectedMesa(null)}
              className="text-gray-700 p-2"
            >
              <FaTimes />
            </button>
          </div>
          
          {/* Resumen del pedido */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Subtotal:</span>
              <span className="text-gray-800">${currentPedido.subtotal}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span className="text-gray-800">Total:</span>
              <span className="text-gray-800">${currentPedido.total}</span>
            </div>
            
            {/* Botones de acción */}
            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={handleCancelarPedido}
                className={`px-3 py-1 text-sm rounded-md ${
                  currentPedido?.ordenes && currentPedido.ordenes.length > 0
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
                disabled={!currentPedido?.ordenes || currentPedido.ordenes.length === 0}
                title={
                  !currentPedido?.ordenes || currentPedido.ordenes.length === 0
                    ? 'No se puede cancelar: el pedido no tiene órdenes'
                    : 'Cancelar pedido'
                }
              >
                Cancelar Pedido
              </button>
              <button
                onClick={handleFinalizarPedido}
                className={`px-3 py-1 text-sm rounded-md ${
                  todasOrdenesEntregadas 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
                disabled={!todasOrdenesEntregadas}
                title={!todasOrdenesEntregadas ? 'Todas las órdenes deben estar entregadas' : 'Finalizar pedido'}
              >
                Finalizar Pedido
              </button>
            </div>
          </div>
          
          {/* Órdenes existentes */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800">Órdenes actuales</h3>
              {currentPedido.ordenes && currentPedido.ordenes.length > 0 && (
                <div className="text-sm">
                  <span className={`px-2 py-1 rounded-full ${
                    todasOrdenesEntregadas 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {todasOrdenesEntregadas 
                      ? '✓ Todas entregadas' 
                      : '⚠ Hay órdenes pendientes'}
                  </span>
                </div>
              )}
            </div>
            
            {!currentPedido.ordenes || currentPedido.ordenes.length === 0 ? (
              <p className="text-gray-700 text-sm">No hay órdenes</p>
            ) : (
              <div className="space-y-2">
                {currentPedido.ordenes.map(orden => {
                  // Obtener el MenuItem completo, ya sea directamente o buscándolo por ID
                  const menuItem = typeof orden.menu_item === 'object' 
                    ? orden.menu_item 
                    : menuItems.find(item => item.id === orden.menu_item) || { nombre: 'Plato desconocido' };
                  
                  // Obtener el Estado completo, ya sea directamente o buscándolo por ID
                  const estado = typeof orden.estado === 'object' 
                    ? orden.estado 
                    : estados.find(e => e.id === orden.estado) || { nombre: 'Estado desconocido' };
                  
                  const esPendiente = estado?.nombre === 'Pendiente';
                  
                  return (
                    <div 
                      key={orden.id} 
                      className={`border p-3 rounded-md ${
                        estado?.nombre === 'Preparando' ? 'bg-amber-50 border-amber-200' :
                        estado?.nombre === 'Listo' ? 'bg-green-50 border-green-200' :
                        estado?.nombre === 'Pendiente' ? 'bg-white' :
                        'bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">{menuItem?.nombre}</p>
                          <div className="flex items-center space-x-2 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              estado?.nombre === 'Preparando' ? 'bg-amber-500 text-white' :
                              estado?.nombre === 'Listo' ? 'bg-green-500 text-white' :
                              estado?.nombre === 'Pendiente' ? 'bg-gray-600 text-white' :
                              'bg-gray-200'
                            }`}>
                              {estado?.nombre}
                            </span>
                            {orden.anotacion && (
                              <span className="text-gray-700 italic">"{orden.anotacion}"</span>
                            )}
                          </div>
                        </div>
                        
                        {esPendiente && (
                          <button
                            onClick={() => handleDeleteOrden(orden.id)}
                            className="p-1 bg-red-100 rounded-full"
                          >
                            <FaTrash className="text-xs text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Agregar más órdenes */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="font-semibold mb-2 text-gray-800">Agregar más platos</h3>
            
            {/* Buscador de platos */}
            <div className="mb-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-600" />
              </div>
              <input
                type="text"
                placeholder="Buscar platos..."
                className="pl-10 p-2 w-full border rounded-lg bg-white text-gray-800 border-gray-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Cuadrícula de platos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addTempOrden(item)}
                  className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 flex flex-col h-28"
                >
                  <span className="font-medium text-sm line-clamp-2 text-gray-800">{item.nombre}</span>
                  <span className="text-green-600 font-bold mt-1">${item.precio}</span>
                  <span className="text-xs text-gray-700 line-clamp-2 mt-1">
                    {item.descripcion || 'Sin descripción'}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Órdenes temporales */}
            {tempOrdenes.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2 text-gray-800">Nuevas órdenes ({tempOrdenes.reduce((sum, o) => sum + o.cantidad, 0)})</h4>
                
                {tempOrdenes.map((orden, index) => (
                  <div key={index} className="border-b py-2 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{orden.menuItem.nombre}</p>
                        <p className="text-green-600 text-sm">${orden.menuItem.precio} c/u</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => updateTempOrdenCantidad(index, orden.cantidad - 1)}
                          className="p-1 bg-gray-50 rounded-full text-gray-600"
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span className="text-sm w-5 text-center text-gray-800">{orden.cantidad}</span>
                        <button 
                          onClick={() => updateTempOrdenCantidad(index, orden.cantidad + 1)}
                          className="p-1 bg-gray-50 rounded-full text-gray-600"
                        >
                          <FaPlus className="text-xs" />
                        </button>
                        <button 
                          onClick={() => removeTempOrden(index)}
                          className="p-1 bg-red-100 rounded-full"
                        >
                          <FaTrash className="text-xs text-red-500" />
                        </button>
                      </div>
                    </div>
                    
                    <textarea
                      placeholder="Anotaciones (opcional)"
                      value={orden.anotacion}
                      onChange={(e) => updateTempOrdenAnotacion(index, e.target.value)}
                      className="w-full text-sm p-2 mt-1 border rounded-md text-gray-800 border-gray-300"
                      rows={1}
                    />
                  </div>
                ))}
                
                <div className="mt-3 pt-3 border-t flex justify-end space-x-2">
                  <button
                    onClick={() => setTempOrdenes([])}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddOrdenesToPedido}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md flex items-center"
                  >
                    <FaPlus className="mr-1" /> Añadir al pedido
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  };
  
  return (
    <div className="container mx-auto max-w-4xl pb-20">
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10 border-b">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Pedidos</h1>
          <button 
            onClick={handleLogout} 
            className="text-blue-600 flex items-center"
          >
            <FaUtensils className="mr-1" /> Cerrar sesión
          </button>
        </div>
      </div>
      
      {renderContent()}
    </div>
  );
}