'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isInGroup } from '@/lib/auth';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    if (!isInGroup('Administrador')) {
      router.push('/unauthorized');
    }
  }, [router]);

  return (
    <ProtectedRoute allowedGroups={['Administrador']}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-700">Panel de Administración</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Bienvenido, Administrador</h2>
          <p className="text-gray-600">
            Desde aquí puedes gestionar todos los aspectos del sistema.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-700">Gestión de Usuarios</h3>
            <p className="text-gray-600 mb-4">Administrar usuarios y roles del sistema</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Acceder
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-700">Reportes</h3>
            <p className="text-gray-600 mb-4">Ver estadísticas y generar reportes</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Acceder
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-700">Configuración</h3>
            <p className="text-gray-600 mb-4">Personalizar la configuración del sistema</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Acceder
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}