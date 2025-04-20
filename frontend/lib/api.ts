import axios, { AxiosRequestConfig } from 'axios';
import { refreshToken, logout } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/';
console.log('API URL:', API_URL);
// Definir el prefijo de la API para todos los endpoints
const API_PREFIX = 'core';

// Crear una instancia de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Importante para CORS con credenciales
});

let isRefreshing = false;
let failedQueue: {resolve: (value: unknown) => void; reject: (reason?: any) => void}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor para agregar el token a las solicitudes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor mejorado para manejar respuestas y tokens expirados
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 (Unauthorized) y no hemos intentado renovar el token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si ya se está refrescando, agregue esta solicitud a la cola
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      return new Promise((resolve, reject) => {
        refreshToken()
          .then(newToken => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              processQueue(null, newToken);
              resolve(api(originalRequest));
            } else {
              processQueue(new Error('Failed to refresh token'), null);
              logout();
              reject(error);
            }
          })
          .catch(refreshError => {
            processQueue(refreshError, null);
            logout();
            reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }
    
    return Promise.reject(error);
  }
);

// Interfaces para los modelos
export interface Componente {
  id: string;
  nombre: string;
}

export interface MenuItem {
  id: string;
  nombre: string;
  precio: number;
  descripcion?: string;
  componentes?: Componente[];
}

export interface Estado {
  id: string;
  nombre: string;
}

export interface Mesa {
  id: string;
  numero: number;
}

export interface Cliente {
  id: string;
  documento: string;
  nombre: string;
  celular: string;
}

export interface Orden {
  id: string;
  hora_creacion: string;
  hora_entrega: string | null;
  anotacion: string;
  pedido: string;
  menu_item: string | MenuItem;
  estado: string | Estado;
}

export interface Pedido {
  id: string;
  hora_creacion: string;
  hora_pago: string | null;
  fecha_creacion: string;
  subtotal: number;
  total: number;
  usuario: number;
  mesa: string | Mesa;
  cliente: string | Cliente | null;
  ordenes?: Orden[];
}

// Funciones genéricas CRUD actualizadas con el prefijo
const fetchAll = async <T>(endpoint: string): Promise<T[]> => {
  const url = endpoint.startsWith('/') ? `${API_PREFIX}${endpoint}` : `${API_PREFIX}/${endpoint}`;
  console.log('Fetching from:', API_URL + url);
  try {
    const response = await api.get<T[]>(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

const fetchOne = async <T>(endpoint: string, id: string): Promise<T> => {
  const url = endpoint.startsWith('/') ? `${API_PREFIX}${endpoint}` : `${API_PREFIX}/${endpoint}`;
  const response = await api.get<T>(`${url}/${id}/`);
  return response.data;
};

const create = async <T>(endpoint: string, data: any): Promise<T> => {
  const url = endpoint.startsWith('/') ? `${API_PREFIX}${endpoint}` : `${API_PREFIX}/${endpoint}`;
  // Asegurarse de que la URL termine con una barra inclinada
  const formattedUrl = url.endsWith('/') ? url : `${url}/`;
  console.log("Creating at:", formattedUrl, "with data:", data);
  const response = await api.post<T>(formattedUrl, data);
  return response.data;
};

const update = async <T>(endpoint: string, id: string, data: any): Promise<T> => {
  const url = endpoint.startsWith('/') ? `${API_PREFIX}${endpoint}` : `${API_PREFIX}/${endpoint}`;
  // Asegurarse de que la URL termine con una barra inclinada después del ID
  const response = await api.put<T>(`${url}/${id}/`, data);
  return response.data;
};

const remove = async (endpoint: string, id: string): Promise<void> => {
  const url = endpoint.startsWith('/') ? `${API_PREFIX}${endpoint}` : `${API_PREFIX}/${endpoint}`;
  // Asegurarse de que la URL termine con una barra inclinada después del ID
  await api.delete(`${url}/${id}/`);
};

// API específica para cada modelo
export const componentesApi = {
  getAll: () => fetchAll<Componente>('/componentes'),
  getOne: (id: string) => fetchOne<Componente>('/componentes', id),
  create: (data: Partial<Componente>) => create<Componente>('/componentes/', data),
  update: (id: string, data: Partial<Componente>) => update<Componente>('/componentes', id, data),
  delete: (id: string) => remove('/componentes', id)
};

export const menuItemsApi = {
  getAll: () => fetchAll<MenuItem>('/menu-items'),
  getOne: (id: string) => fetchOne<MenuItem>('/menu-items', id),
  create: (data: Partial<MenuItem>) => create<MenuItem>('/menu-items/', data),
  update: (id: string, data: Partial<MenuItem>) => update<MenuItem>('/menu-items', id, data),
  delete: (id: string) => remove('/menu-items', id),
  addComponente: (menuItemId: string, componenteId: string) => 
    api.post(`${API_PREFIX}/menu-items/${menuItemId}/add_componente/`, { componente_id: componenteId }),
  removeComponente: (menuItemId: string, componenteId: string) => 
    api.post(`${API_PREFIX}/menu-items/${menuItemId}/remove_componente/`, { componente_id: componenteId })
};

export const estadosApi = {
  getAll: () => fetchAll<Estado>('/estados'),
  getOne: (id: string) => fetchOne<Estado>('/estados', id),
  create: (data: Partial<Estado>) => create<Estado>('/estados', data),
  update: (id: string, data: Partial<Estado>) => update<Estado>('/estados', id, data),
  delete: (id: string) => remove('/estados', id)
};

export const mesasApi = {
  getAll: () => fetchAll<Mesa>('/mesas'),
  getOne: (id: string) => fetchOne<Mesa>('/mesas', id),
  create: (data: Partial<Mesa>) => create<Mesa>('/mesas', data),
  update: (id: string, data: Partial<Mesa>) => update<Mesa>('/mesas', id, data),
  delete: (id: string) => remove('/mesas', id)
};

export const clientesApi = {
  getAll: () => fetchAll<Cliente>('/clientes'),
  getOne: (id: string) => fetchOne<Cliente>('/clientes', id),
  create: (data: Partial<Cliente>) => create<Cliente>('/clientes/', data),
  update: (id: string, data: Partial<Cliente>) => update<Cliente>('/clientes', id, data),
  delete: (id: string) => remove('/clientes', id)
};

export const pedidosApi = {
  getAll: () => fetchAll<Pedido>('/pedidos'),
  getOne: (id: string) => fetchOne<Pedido>('/pedidos', id),
  create: (data: Partial<Pedido>) => create<Pedido>('/pedidos/', data),
  update: (id: string, data: Partial<Pedido>) => update<Pedido>('/pedidos', id, data),
  delete: (id: string) => remove('/pedidos', id),
  calcularTotal: (id: string) => api.post(`${API_PREFIX}/pedidos/${id}/calcular_total/`).then(res => res.data)
};

export const ordenesApi = {
  getAll: () => fetchAll<Orden>('/ordenes'),
  getOne: (id: string) => fetchOne<Orden>('/ordenes', id),
  create: (data: Partial<Orden>) => create<Orden>('/ordenes/', data),
  update: (id: string, data: Partial<Orden>) => update<Orden>('/ordenes', id, data),
  delete: (id: string) => remove('/ordenes', id),
  cambiarEstado: (id: string, estadoId: string) => 
    api.post(`${API_PREFIX}/ordenes/${id}/cambiar_estado/`, { estado_id: estadoId }).then(res => res.data)
};

// Interfaces para el dashboard
export interface VentasPorPeriodo {
  periodo: string;
  total_ventas: number;
  cantidad_pedidos: number;
}

export interface VentasResumen {
  total_ventas: number;
  cantidad_pedidos: number;
  ticket_promedio: number;
  tendencia: number;
}

export interface ProductoPopular {
  id: string;
  nombre: string;
  veces_ordenado: number;
  total_ventas: number;
}

export interface RendimientoUsuario {
  id: number;
  username: string;
  nombre: string;
  total_ventas: number;
  pedidos_atendidos: number;
}

export interface DashboardVentasResponse {
  ventas: VentasPorPeriodo[];
  resumen: VentasResumen;
}

export interface DashboardProductosResponse {
  productos_populares: ProductoPopular[];
}

export interface DashboardUsuariosResponse {
  usuarios_rendimiento: RendimientoUsuario[];
}

// API para el dashboard
export const dashboardApi = {
  getVentas: (periodo: string = 'semana') => 
    api.get<DashboardVentasResponse>(`${API_PREFIX}/dashboard/ventas/?periodo=${periodo}`)
      .then(res => res.data),
  
  getProductos: (periodo: string = 'semana') => 
    api.get<DashboardProductosResponse>(`${API_PREFIX}/dashboard/productos/?periodo=${periodo}`)
      .then(res => res.data),
  
  getUsuarios: (periodo: string = 'semana') => 
    api.get<DashboardUsuariosResponse>(`${API_PREFIX}/dashboard/usuarios/?periodo=${periodo}`)
      .then(res => res.data),
  
  // Método de conveniencia para obtener todos los datos a la vez
  getAll: async (periodo: string = 'semana') => {
    const [ventas, productos, usuarios] = await Promise.all([
      dashboardApi.getVentas(periodo),
      dashboardApi.getProductos(periodo),
      dashboardApi.getUsuarios(periodo)
    ]);
    
    return {
      ventas,
      productos,
      usuarios
    };
  }
};

export default api;