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
  const showAdminLinks = userInfo && (isInGroup('Administrador'));
  const showGerenteLinks = userInfo && isInGroup('Gerente');

  const mainRoute = userInfo
    ? isInGroup('Administrador')
      ? '/admin/dashboard'
      : isInGroup('Gerente')
        ? '/gerente/dashboard'
            : '/dashboard'
    : '/dashboard';


  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href={mainRoute} className="text-xl font-bold">
              Restaurante App
            </Link>

            <div className="ml-10 flex items-center space-x-4">
              {showAdminLinks && (
                <Link href="/admin/pedidos" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Pedidos
                </Link>
              )}

              {showAdminLinks && (
                <Link href="/admin/usuarios" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Usuarios
                </Link>
              )}

              {showAdminLinks && (
                <Link href="/admin/mesasestados" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Mesas/Estados
                </Link>
              )}

              {showAdminLinks && (
                <Link href="/admin/menu" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Menú
                </Link>
              )}

              {showAdminLinks && (
                <Link href="/admin/componentes" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Componentes
                </Link>
              )}

              {showGerenteLinks && (
                <Link href="/gerente/componentes" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Dahsboard
                </Link>
              )}

              {showGerenteLinks && (
                <Link href="/gerente/menu" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Menu
                </Link>
              )}

              {showGerenteLinks && (
                <Link href="/gerente/pedidos" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Pedidos
                </Link>
              )}

              {showGerenteLinks && (
                <Link href="/gerente/componentes" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                  Componentes
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