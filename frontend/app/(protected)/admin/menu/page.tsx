'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import { menuItemsApi, MenuItem } from '@/lib/api';
import Link from 'next/link';

export default function MenuItemsPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchMenuItems = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await menuItemsApi.getAll();
      setMenuItems(data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setError('Error al cargar los ítems del menú. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const handleCreateMenuItem = () => {
    router.push('/admin/menu/nuevo');
  };

  const handleEditMenuItem = (id: string) => {
    router.push(`/admin/menu/editar/${id}`);
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este ítem del menú?')) {
      return;
    }
    
    try {
      await menuItemsApi.delete(id);
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      setError('Error al eliminar el ítem del menú. Por favor, inténtalo de nuevo.');
    }
  };

  // Función auxiliar para formatear el precio de forma segura
  const formatPrice = (price: any): string => {
    if (price === null || price === undefined) {
      return '$0.00';
    }
    
    // Convertir a número si es string
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Verificar si es un número válido
    if (isNaN(numPrice)) {
      return '$0.00';
    }
    
    // Formatear con 2 decimales
    return `$${numPrice.toFixed(2)}`;
  };

  return (
    <ProtectedRoute allowedGroups={['Administrador', 'Gerente']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-700">Gestión del Menú</h1>
          <button
            onClick={handleCreateMenuItem}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Nuevo Ítem
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.length === 0 ? (
              <div className="col-span-full bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
                No hay ítems en el menú para mostrar
              </div>
            ) : (
              menuItems.map((item) => (
                <div key={`menu-item-${item.id}`} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">{item.nombre || 'Sin nombre'}</h2>
                        <p className="text-gray-600 mb-4">{item.descripcion || 'Sin descripción'}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-lg font-bold px-3 py-1 rounded-full">
                        {formatPrice(item.precio)}
                      </span>
                    </div>
                    
                    {item.componentes && item.componentes.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Componentes:</h3>
                        <div className="flex flex-wrap gap-1">
                          {item.componentes.map((componente, index) => (
                            <span 
                              key={`componente-${item.id}-${index}`} 
                              className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
                            >
                              {componente.nombre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-6 flex justify-end space-x-2">
                      <Link 
                        href={`/admin/menu/editar/${item.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}