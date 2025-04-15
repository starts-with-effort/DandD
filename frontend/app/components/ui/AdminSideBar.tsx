import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  
  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-8">Panel Admin</h1>
      
      <nav className="space-y-2">
        <Link 
          href="/admin/dashboard"
          className={`block px-4 py-2 rounded-md ${
            isActive('/admin/dashboard') 
              ? 'bg-blue-600' 
              : 'hover:bg-gray-700'
          }`}
        >
          Dashboard
        </Link>
        
        <Link 
          href="/admin/usuarios"
          className={`block px-4 py-2 rounded-md ${
            isActive('/admin/usuarios') 
              ? 'bg-blue-600' 
              : 'hover:bg-gray-700'
          }`}
        >
          Gestión de Usuarios
        </Link>
        
        <Link 
          href="/admin/menu"
          className={`block px-4 py-2 rounded-md ${
            isActive('/admin/menu') 
              ? 'bg-blue-600' 
              : 'hover:bg-gray-700'
          }`}
        >
          Gestión del Menú
        </Link>
        
        <Link 
          href="/admin/reportes"
          className={`block px-4 py-2 rounded-md ${
            isActive('/admin/reportes') 
              ? 'bg-blue-600' 
              : 'hover:bg-gray-700'
          }`}
        >
          Reportes
        </Link>
        
        <Link 
          href="/admin/configuracion"
          className={`block px-4 py-2 rounded-md ${
            isActive('/admin/configuracion') 
              ? 'bg-blue-600' 
              : 'hover:bg-gray-700'
          }`}
        >
          Configuración
        </Link>
      </nav>
    </div>
  );
}