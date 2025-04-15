'use client';

import Link from 'next/link';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';

export default function MeseroDashboard() {
  return (
    <ProtectedRoute allowedGroups={['Mesero', 'Administrador', 'Gerente']}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Panel de Mesero</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Bienvenido, Mesero</h2>
          <p className="text-gray-600">
            Desde aquí puedes gestionar los pedidos de tus mesas.
          </p>
        </div>
        
        <div className="flex justify-end mb-6">
          <Link 
            href="/pedidos/nuevo" 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Nuevo Pedido
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Mis Pedidos Activos</h3>
          <p className="text-gray-600">
            Aquí aparecerán los pedidos que estás atendiendo actualmente.
          </p>
          <div className="p-8 text-center text-gray-500">
            <p>No hay pedidos activos para mostrar</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}