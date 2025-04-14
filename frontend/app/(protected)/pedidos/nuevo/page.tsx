'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { pedidosApi, mesasApi, clientesApi, Mesa, Cliente } from '@/lib/api';

interface NuevoPedidoForm {
  mesa: string;
  cliente: string;
}

export default function NuevoPedidoPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NuevoPedidoForm>();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mesasData, clientesData] = await Promise.all([
          mesasApi.getAll(),
          clientesApi.getAll()
        ]);
        
        setMesas(mesasData);
        setClientes(clientesData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar los datos. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  const onSubmit = async (data: NuevoPedidoForm) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const nuevoPedido = await pedidosApi.create({
        mesa: data.mesa,
        cliente: data.cliente || null
      });
      
      router.push(`/pedidos/${nuevoPedido.id}`);
    } catch (err) {
      console.error('Error creating pedido:', err);
      setError('Error al crear el pedido. Por favor, intenta de nuevo.');
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Nuevo Pedido</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label htmlFor="mesa" className="block text-gray-700 font-medium mb-2">
              Mesa
            </label>
            <select
              id="mesa"
              className={`w-full px-3 py-2 border ${
                errors.mesa ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              {...register('mesa', { required: 'Debes seleccionar una mesa' })}
            >
              <option value="">Selecciona una mesa</option>
              {mesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  Mesa {mesa.numero}
                </option>
              ))}
            </select>
            {errors.mesa && (
              <p className="mt-1 text-red-500 text-sm">{errors.mesa.message}</p>
            )}
          </div>
          
          <div className="mb-6">
            <label htmlFor="cliente" className="block text-gray-700 font-medium mb-2">
              Cliente (opcional)
            </label>
            <select
              id="cliente"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('cliente')}
            >
              <option value="">Sin cliente asignado</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} ({cliente.documento})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/pedidos')}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}