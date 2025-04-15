'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserInfo, logout, isInGroup } from '@/lib/auth';

export default function Navbar() {
  const router = useRouter();
  const userInfo = getUserInfo();
  
  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  // Determinar qué enlaces mostrar según el grupo del usuario
  const showAdminLinks = userInfo && (isInGroup('Administrador') || isInGroup('Gerente'));
  const showPedidosLinks = userInfo && (isInGroup('Administrador') || isInGroup('Gerente') || isInGroup('Mesero'));
  const showCocinaLinks = userInfo && (isInGroup('Administrador') || isInGroup('Cocinero'));
  
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold">
              Restaurante App
            </Link>
            
            <div className="ml-10 flex items-center space-x-4">
              <Link href="/dashboard" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                Dashboard
              </Link>
              
              {showPedidosLinks && (
                <Link href="/pedidos" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Pedidos
                </Link>
              )}
              
              {showAdminLinks && (
                <Link href="/menu-items" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Menú
                </Link>
              )}
              
              {showCocinaLinks && (
                <Link href="/cocina" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Cocina
                </Link>
              )}
              
              {userInfo && isInGroup('Administrador') && (
                <Link href="/admin" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Administración
                </Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            {userInfo && (
              <div className="flex items-center">
                <span className="mr-4">
                  Hola, {userInfo.first_name || userInfo.username}
                  {userInfo.grupos && userInfo.grupos.length > 0 && (
                    <span className="ml-1 text-xs bg-blue-700 px-2 py-1 rounded-full">
                      {userInfo.grupos[0]}
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded-md"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}