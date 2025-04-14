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

export const login = async (credentials: LoginCredentials): Promise<boolean> => {
  try {
    const response = await axios.post(`${API_URL}api/token/`, credentials);
    const tokens: AuthTokens = response.data;
    
    // Almacenar tokens en localStorage
    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
    
    return true;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
};

export const logout = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/auth/login';
};

export const refreshToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    return null;
  }
  
  try {
    const response = await axios.post(`${API_URL}api/token/refresh/`, {
      refresh: refreshToken
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
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const getUserInfo = (): UserData | null => {
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    return null;
  }
  
  try {
    return jwtDecode<UserData>(accessToken);
  } catch (error) {
    return null;
  }
};