'use client';

import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import DashboardGerente from '@/app/components/ui/DashboardGerente';

export default function GerenteDashboard() {
  return (
    <ProtectedRoute allowedGroups={['Gerente', 'Administrador']}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6  text-gray-900">Panel de Gerencia</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Bienvenido, Gerente</h2>
          <p className="text-gray-600">
            Desde aquí puedes supervisar las operaciones del restaurante.
          </p>
        </div>
        <DashboardGerente/>
      </div>
    </ProtectedRoute>
  );
}