'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/';

interface UserFormData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  groups: string[];
}

interface Group {
  id: number;
  name: string;
}

export default function CreateUserPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<UserFormData>({
    defaultValues: {
      is_active: true,
      groups: []
    }
  });
  
  const password = watch('password');
  
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(`${API_URL}core/groups/`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setGroups(response.data);
      } catch (error) {
        console.error('Error fetching groups:', error);
        setError('Error al cargar los grupos. Por favor, inténtalo de nuevo.');
      }
    };
    
    fetchGroups();
  }, []);
  
  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      
      // Crear el usuario
      const userData = {
        username: data.username,
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        is_active: data.is_active,
        groups: data.groups
      };
      
      await axios.post(`${API_URL}core/users/`, userData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setSuccess(true);
      reset();
      
      // Redireccionar después de 2 segundos
      setTimeout(() => {
        router.push('/admin/usuarios');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.response && error.response.data) {
        // Extraer mensajes de error de la API
        const apiErrors = Object.entries(error.response.data)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('; ');
        setError(`Error: ${apiErrors}`);
      } else {
        setError('Error al crear el usuario. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ProtectedRoute allowedGroups={['Administrador']}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Crear Nuevo Usuario</h1>
          <Link 
            href="/admin/usuarios" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
          >
            Volver
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
            <p>Usuario creado exitosamente. Redirigiendo...</p>
          </div>
        )}
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Usuario *
                </label>
                <input
                  id="username"
                  type="text"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  {...register('username', { 
                    required: 'El nombre de usuario es requerido',
                    minLength: { value: 3, message: 'El nombre debe tener al menos 3 caracteres' }
                  })}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>
              
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico *
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  {...register('email', { 
                    required: 'El correo electrónico es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Dirección de correo inválida'
                    }
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña *
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  {...register('password', { 
                    required: 'La contraseña es requerida',
                    minLength: { value: 8, message: 'La contraseña debe tener al menos 8 caracteres' }
                  })}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              
              {/* Confirm Password */}
              <div>
                <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Contraseña *
                </label>
                <input
                  id="password_confirm"
                  type="password"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  {...register('password_confirm', { 
                    required: 'Debe confirmar la contraseña',
                    validate: value => 
                      value === password || 'Las contraseñas no coinciden'
                  })}
                />
                {errors.password_confirm && (
                  <p className="mt-1 text-sm text-red-600">{errors.password_confirm.message}</p>
                )}
              </div>
              
              {/* First Name */}
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  id="first_name"
                  type="text"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  {...register('first_name')}
                />
              </div>
              
              {/* Last Name */}
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido
                </label>
                <input
                  id="last_name"
                  type="text"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  {...register('last_name')}
                />
              </div>
              
              {/* Is Active */}
              <div className="col-span-2">
                <div className="flex items-center">
                  <input
                    id="is_active"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    {...register('is_active')}
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Usuario activo
                  </label>
                </div>
              </div>
              
              {/* Groups */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grupos
                </label>
                <div className="space-y-2">
                  {groups.map(group => (
                    <div key={group.id} className="flex items-center">
                      <input
                        id={`group-${group.id}`}
                        type="checkbox"
                        value={group.id}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        {...register('groups')}
                      />
                      <label htmlFor={`group-${group.id}`} className="ml-2 block text-sm text-gray-700">
                        {group.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-4">
              <Link
                href="/admin/usuarios"
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Guardando...' : 'Guardar Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}