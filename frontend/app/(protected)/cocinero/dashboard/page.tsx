'use client';

import ProtectedRoute from '@/app/components/auth/ProtectedRoute';

export default function CocineroDashboard() {
  return (
    <ProtectedRoute allowedGroups={['Cocinero', 'Administrador']}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Panel de Cocina</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Bienvenido, Cocinero</h2>
          <p className="text-gray-600">
            Desde aquí puedes gestionar las órdenes pendientes de preparar.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Órdenes pendientes</h3>
          <p className="text-gray-600">
            Aquí aparecerán las órdenes que debes preparar.
          </p>
          <div className="p-8 text-center text-gray-500">
            <p>No hay órdenes pendientes para mostrar</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}