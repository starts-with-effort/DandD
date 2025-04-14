'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserInfo, logout } from '@/lib/auth';

export default function Navbar() {
  const router = useRouter();
  const userInfo = getUserInfo();
  
  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };
  
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
              <Link href="/pedidos" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                Pedidos
              </Link>
              <Link href="/menu-items" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                Menú
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            {userInfo && (
              <div className="flex items-center">
                <span className="mr-4">Hola, {userInfo.username}</span>
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