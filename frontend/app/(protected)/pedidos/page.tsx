'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { pedidosApi, Pedido, mesasApi, Mesa } from '@/lib/api';

export default function Dashboard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pedidosData, mesasData] = await Promise.all([
          pedidosApi.getAll(),
          mesasApi.getAll()
        ]);
        
        setPedidos(pedidosData);
        setMesas(mesasData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Error al cargar los datos. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Filtrar pedidos activos (sin hora de pago)
  const pedidosActivos = pedidos.filter(pedido => !pedido.hora_pago);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Pedidos Activos</h2>
          <p className="text-4xl font-bold text-blue-600">{pedidosActivos.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Total Mesas</h2>
          <p className="text-4xl font-bold text-green-600">{mesas.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Total Ventas Hoy</h2>
          <p className="text-4xl font-bold text-purple-600">
            ${pedidos
              .filter(p => p.fecha_creacion === new Date().toISOString().split('T')[0] && p.hora_pago)
              .reduce((acc, p) => acc + p.total, 0)
              .toFixed(2)}
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Pedidos Activos</h2>
          <Link 
            href="/pedidos/nuevo" 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Nuevo Pedido
          </Link>
        </div>
        
        {pedidosActivos.length === 0 ? (
          <p className="text-gray-500">No hay pedidos activos en este momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mesa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pedidosActivos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{pedido.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {typeof pedido.mesa === 'string' 
                        ? mesas.find(m => m.id === pedido.mesa)?.numero || pedido.mesa
                        : pedido.mesa.numero}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{pedido.fecha_creacion}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${typeof pedido.total === 'number' 
                      ? pedido.total.toFixed(2) 
                      : Number(pedido.total).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/pedidos/${pedido.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver detalles
                      </Link>
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