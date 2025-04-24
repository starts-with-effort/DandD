import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface LoginCredentials {
  nombre_de_usuario: string;
  contraseña: string;
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
    const response = await axios.post(`${API_URL}api/token/`, credentials);
    const tokens: AuthTokens = response.data;

    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);

    const userInfoResponse = await axios.get(`${API_URL}core/users/me/`, {
      headers: {
        Authorization: `Bearer ${tokens.access}`,
      },
    });

    localStorage.setItem('userInfo', JSON.stringify(userInfoResponse.data));
    return true;
  } catch (error) {
    console.error('Error de inicio de sesión:', error);
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
    logout();
    return null;
  }

  try {
    const response = await axios.post(`${API_URL}api/token/refresh/`, {
      refresh: refreshTokenValue,
    });
    const newAccessToken = response.data.access;
    localStorage.setItem('accessToken', newAccessToken);
    return newAccessToken;
  } catch (error) {
    console.error('Error al refrescar token:', error);
    logout();
    return null;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    return false;
  }

  try {
    const decoded: UserData = jwtDecode(accessToken);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      await refreshToken(); // intenta refrescar en segundo plano
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const getUserInfo = (): UserInfo | null => {
  const userInfoString = localStorage.getItem('userInfo');
  if (userInfoString) {
    try {
      return JSON.parse(userInfoString);
    } catch (error) {
      console.error('Error al analizar la información del usuario:', error);
    }
  }

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
      permisos: [],
    };
  } catch (error) {
    console.error('Error al decodificar el token:', error);
    return null;
  }
};

export const getUserGroups = (): string[] => {
  const userInfo = getUserInfo();
  return userInfo?.grupos || [];
};

export const hasPermission = (permiso: string): boolean => {
  const userInfo = getUserInfo();
  return userInfo?.permisos?.includes(permiso) || false;
};

export const isInGroup = (grupo: string): boolean => {
  const grupos = getUserGroups();
  return grupos.includes(grupo);
};

export const getRedirectPath = (): string => {
  const grupos = getUserGroups();
  if (grupos.includes('Administrador')) {
    return '/admin/dashboard';
  } else if (grupos.includes('Gerente')) {
    return '/gerente/dashboard';
  } else if (grupos.includes('Mesero')) {
    return '/mesero/dashboard';
  } else if (grupos.includes('Cocinero')) {
    return '/cocinero/dashboard';
  } else {
    return '/no-autorizado';
  }
};
