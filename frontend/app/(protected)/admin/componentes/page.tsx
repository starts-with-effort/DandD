'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import { componentesApi, Componente } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ComponentesPage() {
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentComponente, setCurrentComponente] = useState<Componente | null>(null);
  const [newComponente, setNewComponente] = useState<Partial<Componente>>({ nombre: '' });
  const router = useRouter();

  // Cargar datos iniciales
  useEffect(() => {
    fetchComponentes();
  }, []);

  // Función para cargar los componentes
  const fetchComponentes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await componentesApi.getAll();
      setComponentes(data);
    } catch (error) {
      console.error('Error fetching componentes:', error);
      setError('Error al cargar los componentes. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // GESTIÓN DE COMPONENTES
  const handleCreateComponente = async () => {
    try {
      await componentesApi.create(newComponente);
      setShowForm(false);
      setNewComponente({ nombre: '' });
      fetchComponentes();
    } catch (error) {
      console.error('Error creating componente:', error);
      setError('Error al crear el componente. Por favor, inténtalo de nuevo.');
    }
  };

  const handleEditComponente = async () => {
    if (!currentComponente) return;
    try {
      await componentesApi.update(currentComponente.id, newComponente);
      setShowForm(false);
      setCurrentComponente(null);
      setNewComponente({ nombre: '' });
      fetchComponentes();
    } catch (error) {
      console.error('Error updating componente:', error);
      setError('Error al actualizar el componente. Por favor, inténtalo de nuevo.');
    }
  };

  const handleDeleteComponente = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este componente?')) {
      return;
    }
    try {
      await componentesApi.delete(id);
      fetchComponentes();
    } catch (error) {
      console.error('Error deleting componente:', error);
      setError('Error al eliminar el componente. Por favor, inténtalo de nuevo.');
    }
  };

  const openEditForm = (componente: Componente) => {
    setCurrentComponente(componente);
    setNewComponente({ nombre: componente.nombre });
    setShowForm(true);
  };

  return (
    <ProtectedRoute allowedGroups={['Administrador']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-700 mb-8">Gestión de Componentes</h1>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-700">Componentes</h2>
            <button
              onClick={() => {
                setCurrentComponente(null);
                setNewComponente({ nombre: '' });
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nuevo Componente
            </button>
          </div>

          {/* Formulario de Componente */}
          {showForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h3 className="text-lg font-medium mb-4 text-gray-700">
                {currentComponente ? 'Editar Componente' : 'Nuevo Componente'}
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Nombre del Componente
                </label>
                <input
                  type="text"
                  value={newComponente.nombre}
                  onChange={(e) => setNewComponente({ ...newComponente, nombre: e.target.value })}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={currentComponente ? handleEditComponente : handleCreateComponente}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  {currentComponente ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          )}

          {/* Tabla de Componentes */}
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {componentes.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                        No hay componentes registrados
                      </td>
                    </tr>
                  ) : (
                    componentes.map((componente) => (
                      <tr key={componente.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {componente.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditForm(componente)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteComponente(componente.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}