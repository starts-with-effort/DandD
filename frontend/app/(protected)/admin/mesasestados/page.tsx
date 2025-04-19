'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import { mesasApi, estadosApi, Mesa, Estado } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function MesasEstadosPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [isLoadingMesas, setIsLoadingMesas] = useState(true);
  const [isLoadingEstados, setIsLoadingEstados] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMesaForm, setShowMesaForm] = useState(false);
  const [showEstadoForm, setShowEstadoForm] = useState(false);
  const [currentMesa, setCurrentMesa] = useState<Mesa | null>(null);
  const [currentEstado, setCurrentEstado] = useState<Estado | null>(null);
  const [newMesa, setNewMesa] = useState<Partial<Mesa>>({ numero: 0 });
  const [newEstado, setNewEstado] = useState<Partial<Estado>>({ nombre: '' });
  const router = useRouter();

  // Cargar datos iniciales
  useEffect(() => {
    fetchMesas();
    fetchEstados();
  }, []);

  // Función para cargar las mesas
  const fetchMesas = async () => {
    setIsLoadingMesas(true);
    setError(null);
    try {
      const data = await mesasApi.getAll();
      setMesas(data);
    } catch (error) {
      console.error('Error fetching mesas:', error);
      setError('Error al cargar las mesas. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoadingMesas(false);
    }
  };

  // Función para cargar los estados
  const fetchEstados = async () => {
    setIsLoadingEstados(true);
    setError(null);
    try {
      const data = await estadosApi.getAll();
      setEstados(data);
    } catch (error) {
      console.error('Error fetching estados:', error);
      setError('Error al cargar los estados. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoadingEstados(false);
    }
  };

  // GESTIÓN DE MESAS
  const handleCreateMesa = async () => {
    try {
      await mesasApi.create(newMesa);
      setShowMesaForm(false);
      setNewMesa({ numero: 0 });
      fetchMesas();
    } catch (error) {
      console.error('Error creating mesa:', error);
      setError('Error al crear la mesa. Por favor, inténtalo de nuevo.');
    }
  };

  const handleEditMesa = async () => {
    if (!currentMesa) return;
    try {
      await mesasApi.update(currentMesa.id, newMesa);
      setShowMesaForm(false);
      setCurrentMesa(null);
      setNewMesa({ numero: 0 });
      fetchMesas();
    } catch (error) {
      console.error('Error updating mesa:', error);
      setError('Error al actualizar la mesa. Por favor, inténtalo de nuevo.');
    }
  };

  const handleDeleteMesa = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta mesa?')) {
      return;
    }
    try {
      await mesasApi.delete(id);
      fetchMesas();
    } catch (error) {
      console.error('Error deleting mesa:', error);
      setError('Error al eliminar la mesa. Por favor, inténtalo de nuevo.');
    }
  };

  const openEditMesaForm = (mesa: Mesa) => {
    setCurrentMesa(mesa);
    setNewMesa({ numero: mesa.numero });
    setShowMesaForm(true);
  };

  // GESTIÓN DE ESTADOS
  const handleCreateEstado = async () => {
    try {
      await estadosApi.create(newEstado);
      setShowEstadoForm(false);
      setNewEstado({ nombre: '' });
      fetchEstados();
    } catch (error) {
      console.error('Error creating estado:', error);
      setError('Error al crear el estado. Por favor, inténtalo de nuevo.');
    }
  };

  const handleEditEstado = async () => {
    if (!currentEstado) return;
    try {
      await estadosApi.update(currentEstado.id, newEstado);
      setShowEstadoForm(false);
      setCurrentEstado(null);
      setNewEstado({ nombre: '' });
      fetchEstados();
    } catch (error) {
      console.error('Error updating estado:', error);
      setError('Error al actualizar el estado. Por favor, inténtalo de nuevo.');
    }
  };

  const handleDeleteEstado = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este estado?')) {
      return;
    }
    try {
      await estadosApi.delete(id);
      fetchEstados();
    } catch (error) {
      console.error('Error deleting estado:', error);
      setError('Error al eliminar el estado. Por favor, inténtalo de nuevo.');
    }
  };

  const openEditEstadoForm = (estado: Estado) => {
    setCurrentEstado(estado);
    setNewEstado({ nombre: estado.nombre });
    setShowEstadoForm(true);
  };

  return (
    <ProtectedRoute allowedGroups={['Administrador']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-700 mb-8">Gestión de Mesas y Estados</h1>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* SECCIÓN DE MESAS */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-700">Mesas</h2>
              <button
                onClick={() => {
                  setCurrentMesa(null);
                  setNewMesa({ numero: 0 });
                  setShowMesaForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Nueva Mesa
              </button>
            </div>

            {/* Formulario de Mesa */}
            {showMesaForm && (
              <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                <h3 className="text-lg font-medium mb-4 text-gray-700">
                  {currentMesa ? 'Editar Mesa' : 'Nueva Mesa'}
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Número de Mesa
                  </label>
                  <input
                    type="number"
                    value={newMesa.numero}
                    onChange={(e) => setNewMesa({ ...newMesa, numero: parseInt(e.target.value) })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowMesaForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={currentMesa ? handleEditMesa : handleCreateMesa}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    {currentMesa ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </div>
            )}

            {/* Tabla de Mesas */}
            {isLoadingMesas ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Número
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mesas.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                          No hay mesas registradas
                        </td>
                      </tr>
                    ) : (
                      mesas.map((mesa) => (
                        <tr key={mesa.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {mesa.numero}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditMesaForm(mesa)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteMesa(mesa.id)}
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

          {/* SECCIÓN DE ESTADOS */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-700">Estados</h2>
              <button
                onClick={() => {
                  setCurrentEstado(null);
                  setNewEstado({ nombre: '' });
                  setShowEstadoForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Nuevo Estado
              </button>
            </div>

            {/* Formulario de Estado */}
            {showEstadoForm && (
              <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                <h3 className="text-lg font-medium mb-4 text-gray-700">
                  {currentEstado ? 'Editar Estado' : 'Nuevo Estado'}
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Nombre del Estado
                  </label>
                  <input
                    type="text"
                    value={newEstado.nombre}
                    onChange={(e) => setNewEstado({ ...newEstado, nombre: e.target.value })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEstadoForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={currentEstado ? handleEditEstado : handleCreateEstado}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    {currentEstado ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </div>
            )}

            {/* Tabla de Estados */}
            {isLoadingEstados ? (
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
                    {estados.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                          No hay estados registrados
                        </td>
                      </tr>
                    ) : (
                      estados.map((estado) => (
                        <tr key={estado.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {estado.nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditEstadoForm(estado)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteEstado(estado.id)}
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
      </div>
    </ProtectedRoute>
  );
}