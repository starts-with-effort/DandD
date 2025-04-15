'use client';

import Link from 'next/link';
import { logout } from '@/lib/auth';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-red-600">
          Acceso no autorizado
        </h1>
        
        <p className="text-gray-700 mb-6 text-center">
          No tienes permisos para acceder a esta página. Por favor, contacta al administrador si crees que deberías tener acceso.
        </p>
        
        <div className="flex flex-col space-y-4">
          <Link 
            href="/dashboard" 
            className="bg-blue-600 text-white py-2 px-4 rounded-md text-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Volver al Dashboard
          </Link>
          
          <button
            onClick={() => logout()}
            className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md text-center hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}