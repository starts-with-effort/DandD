'use client';

import ProtectedRoute from '@/app/components/auth/ProtectedRoute';

export default function GerenteDashboard() {
  return (
    <ProtectedRoute allowedGroups={['Gerente', 'Administrador']}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Panel de Gerencia</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Bienvenido, Gerente</h2>
          <p className="text-gray-600">
            Desde aquí puedes supervisar las operaciones del restaurante.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Ventas del día</h3>
            <p className="text-3xl font-bold text-green-600">$1,234.56</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Pedidos activos</h3>
            <p className="text-3xl font-bold text-blue-600">12</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Personal activo</h3>
            <p className="text-3xl font-bold text-purple-600">8</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}