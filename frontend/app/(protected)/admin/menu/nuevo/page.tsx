'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import { menuItemsApi, componentesApi, Componente } from '@/lib/api';

export default function CreateMenuItemPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    descripcion: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado para componentes
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [selectedComponentes, setSelectedComponentes] = useState<string[]>([]);
  const [newComponente, setNewComponente] = useState('');
  const [isAddingComponente, setIsAddingComponente] = useState(false);
  
  useEffect(() => {
    const fetchComponentes = async () => {
      try {
        const data = await componentesApi.getAll();
        setComponentes(data);
      } catch (error) {
        console.error('Error fetching componentes:', error);
        setError('Error al cargar los componentes. Por favor, inténtalo de nuevo.');
      }
    };
    
    fetchComponentes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validación de precio
      const precio = parseFloat(formData.precio);
      if (isNaN(precio) || precio < 0) {
        throw new Error('El precio debe ser un número válido y no negativo');
      }

      // Crear nuevo ítem del menú
      const menuItemData = {
        nombre: formData.nombre,
        precio: precio,
        descripcion: formData.descripcion,
      };

      const createdMenuItem = await menuItemsApi.create(menuItemData);
      
      // Agregar componentes seleccionados
      if (selectedComponentes.length > 0) {
        const promises = selectedComponentes.map(componenteId => 
          menuItemsApi.addComponente(createdMenuItem.id, componenteId)
        );
        await Promise.all(promises);
      }

      setSuccess('Ítem de menú creado exitosamente');
      
      // Redireccionar después de un breve retraso
      setTimeout(() => {
        router.push('/admin/menu');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating menu item:', error);
      setError(error.message || 'Error al crear el ítem del menú. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComponente = (componenteId: string) => {
    setSelectedComponentes(prev => 
      prev.includes(componenteId)
        ? prev.filter(id => id !== componenteId)
        : [...prev, componenteId]
    );
  };

  const handleCreateComponente = async () => {
    if (!newComponente.trim()) return;
    
    setIsAddingComponente(true);
    setError(null);
    
    try {
      const createdComponente = await componentesApi.create({ nombre: newComponente.trim() });
      setComponentes([...componentes, createdComponente]);
      setSelectedComponentes([...selectedComponentes, createdComponente.id]);
      setNewComponente('');
      setSuccess('Componente creado exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating componente:', error);
      setError('Error al crear el componente. Por favor, inténtalo de nuevo.');
    } finally {
      setIsAddingComponente(false);
    }
  };

  return (
    <ProtectedRoute allowedGroups={['Administrador', 'Gerente']}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-700">Nuevo Ítem de Menú</h1>
          <button
            onClick={() => router.push('/admin/menu')}
            className="text-gray-600 hover:text-gray-900"
          >
            Volver al menú
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre*
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="Nombre del ítem"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
              Precio*
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="Descripción del ítem"
            />
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Componentes</h3>
            
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                value={newComponente}
                onChange={(e) => setNewComponente(e.target.value)}
                placeholder="Nombre del nuevo componente"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
              <button
                type="button"
                onClick={handleCreateComponente}
                disabled={isAddingComponente || !newComponente.trim()}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:bg-gray-400"
              >
                {isAddingComponente ? (
                  <span className="flex items-center">
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                    Creando...
                  </span>
                ) : (
                  'Crear'
                )}
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto">
              {componentes.length === 0 ? (
                <p className="text-gray-500 text-center py-2">No hay componentes disponibles</p>
              ) : (
                <ul className="space-y-2">
                  {componentes.map((componente) => (
                    <li key={componente.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`componente-${componente.id}`}
                        checked={selectedComponentes.includes(componente.id)}
                        onChange={() => handleToggleComponente(componente.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label 
                        htmlFor={`componente-${componente.id}`}
                        className="ml-2 block text-sm text-gray-900"
                      >
                        {componente.nombre}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:bg-gray-400"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  Guardando...
                </span>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}