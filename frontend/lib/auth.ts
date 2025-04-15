import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthTokens {
  access: string;
  refresh: string;
}

interface UserData {
  user_id: number;
  username: string;
  exp: number;
}

interface UserInfo {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  grupos: string[];
  permisos: string[];
}

export const login = async (credentials: LoginCredentials): Promise<boolean> => {
  try {
    // Obtener tokens JWT
    const response = await axios.post(`${API_URL}api/token/`, credentials);
    const tokens: AuthTokens = response.data;
    
    // Almacenar tokens en localStorage
    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
    
    // Obtener información del usuario incluyendo grupos
    const userInfoResponse = await axios.get(`${API_URL}core/users/me/`, {
      headers: {
        Authorization: `Bearer ${tokens.access}`
      }
    });
    
    // Guardar la información completa del usuario
    localStorage.setItem('userInfo', JSON.stringify(userInfoResponse.data));
    
    return true;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
};

export const logout = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userInfo');
};

export const refreshToken = async (): Promise<string | null> => {
  const refreshTokenValue = localStorage.getItem('refreshToken');
  
  if (!refreshTokenValue) {
    return null;
  }
  
  try {
    const response = await axios.post(`${API_URL}api/token/refresh/`, {
      refresh: refreshTokenValue
    });
    
    const newAccessToken = response.data.access;
    localStorage.setItem('accessToken', newAccessToken);
    
    return newAccessToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    logout();
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    return false;
  }
  
  try {
    const decoded: UserData = jwtDecode(accessToken);
    const currentTime = Date.now() / 1000;
    
    // Verificar si el token ha expirado
    if (decoded.exp < currentTime) {
      // Intentar renovar en segundo plano, pero devolver false por ahora
      refreshToken();
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const getUserInfo = (): UserInfo | null => {
  // Primero intentamos obtener la información completa del usuario
  const userInfoString = localStorage.getItem('userInfo');
  if (userInfoString) {
    try {
      return JSON.parse(userInfoString);
    } catch (error) {
      console.error('Error parsing user info:', error);
    }
  }
  
  // Si no hay información completa, intentamos extraer datos básicos del token
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    return null;
  }
  
  try {
    const decoded: UserData = jwtDecode(accessToken);
    return {
      id: decoded.user_id,
      username: decoded.username,
      email: '',
      first_name: '',
      last_name: '',
      grupos: [],
      permisos: []
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const getUserGroups = (): string[] => {
  const userInfo = getUserInfo();
  return userInfo?.grupos || [];
};

export const hasPermission = (permission: string): boolean => {
  const userInfo = getUserInfo();
  return userInfo?.permisos?.includes(permission) || false;
};

export const isInGroup = (group: string): boolean => {
  const groups = getUserGroups();
  return groups.includes(group);
};

export const getRedirectPath = (): string => {
  const groups = getUserGroups();
  
  if (groups.includes('Administrador')) {
    return '/admin/dashboard';
  } else if (groups.includes('Gerente')) {
    return '/gerente/dashboard';
  } else if (groups.includes('Mesero')) {
    return '/mesero/dashboard';
  } else if (groups.includes('Cocinero')) {
    return '/cocinero/dashboard';
  } else {
    return '/unauthorized'; // Ruta por defecto
  }
};