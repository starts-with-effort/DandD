import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import {
  login,
  logout,
  refreshToken,
  isAuthenticated,
  getUserInfo,
  getUserGroups,
  hasPermission,
  isInGroup,
  getRedirectPath,
} from './auth';

// Mock axios and jwt-decode
jest.mock('axios');
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (function () {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Definir la variable de entorno para todas las pruebas
beforeAll(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://127.0.0.1:8000/';
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Auth Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('login', () => {
    it('should log in successfully and store tokens and user info', async () => {
      const credentials = { nombre_de_usuario: 'testuser', contraseña: 'testpass' };
      const tokens = { access: 'access_token', refresh: 'refresh_token' };
      const userInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        grupos: ['Administrador'],
        permisos: ['view_dashboard'],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: tokens });
      mockedAxios.get.mockResolvedValueOnce({ data: userInfo });

      const result = await login(credentials);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_URL}api/token/`,
        expect.objectContaining({
          nombre_de_usuario: 'testuser',
          contraseña: 'testpass',
        })
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_URL}core/users/me/`,
        { headers: { Authorization: `Bearer ${tokens.access}` } }
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', tokens.access);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', tokens.refresh);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('userInfo', JSON.stringify(userInfo));
    });

    it('should return false on login failure', async () => {
      const credentials = { nombre_de_usuario: 'testuser', contraseña: 'testpass' };
      mockedAxios.post.mockRejectedValueOnce(new Error('Login failed'));

      const result = await login(credentials);

      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should remove all auth-related items from localStorage', () => {
      logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userInfo');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenValue = 'refresh_token';
      const newAccessToken = 'new_access_token';
      localStorageMock.getItem.mockReturnValueOnce(refreshTokenValue);
      mockedAxios.post.mockResolvedValueOnce({ data: { access: newAccessToken } });

      const result = await refreshToken();

      expect(result).toBe(newAccessToken);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_URL}api/token/refresh/`,
        { refresh: refreshTokenValue }
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', newAccessToken);
    });

    it('should return null and logout if no refresh token exists', async () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = await refreshToken();

      expect(result).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userInfo');
    });

    it('should return null and logout on refresh failure', async () => {
      localStorageMock.getItem.mockReturnValueOnce('refresh_token');
      mockedAxios.post.mockRejectedValueOnce(new Error('Refresh failed'));

      const result = await refreshToken();

      expect(result).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userInfo');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if token is valid and not expired', async () => {
      const accessToken = 'valid_token';
      const decoded = { user_id: 1, username: 'testuser', exp: Date.now() / 1000 + 3600 };
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return accessToken;
        return null;
      });
      mockedJwtDecode.mockReturnValueOnce(decoded);

      const result = await isAuthenticated();

      expect(result).toBe(true);
      expect(mockedJwtDecode).toHaveBeenCalledWith(accessToken);
    });

    it('should return false and attempt refresh if token is expired', async () => {
      const accessToken = 'expired_token';
      const refreshTokenValue = 'valid_refresh_token';
      const decoded = { user_id: 1, username: 'testuser', exp: Date.now() / 1000 - 3600 };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return accessToken;
        if (key === 'refreshToken') return refreshTokenValue;
        return null;
      });

      mockedJwtDecode.mockReturnValueOnce(decoded);
      mockedAxios.post.mockResolvedValueOnce({ data: { access: 'new_access_token' } });

      const result = await isAuthenticated();

      expect(result).toBe(false);

      await new Promise(process.nextTick);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_URL}api/token/refresh/`,
        { refresh: refreshTokenValue }
      );
    });

    it('should return false if no token exists', async () => {
      localStorageMock.getItem.mockImplementation(() => null);

      const result = await isAuthenticated();

      expect(result).toBe(false);
      expect(mockedJwtDecode).not.toHaveBeenCalled();
    });
  });

  describe('getUserInfo', () => {
    it('should return user info from localStorage if available', () => {
      const userInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        grupos: ['Administrador'],
        permisos: ['view_dashboard'],
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(userInfo));

      const result = getUserInfo();

      expect(result).toEqual(userInfo);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('userInfo');
    });

    it('should return basic user info from token if no userInfo in localStorage', () => {
      const accessToken = 'valid_token';
      const decoded = { user_id: 1, username: 'testuser', exp: Date.now() / 1000 + 3600 };
      localStorageMock.getItem.mockReturnValueOnce(null).mockReturnValueOnce(accessToken);
      mockedJwtDecode.mockReturnValueOnce(decoded);

      const result = getUserInfo();

      expect(result).toEqual({
        id: decoded.user_id,
        username: decoded.username,
        email: '',
        first_name: '',
        last_name: '',
        grupos: [],
        permisos: [],
      });
    });

    it('should return null if no userInfo or token exists', () => {
      localStorageMock.getItem.mockReturnValueOnce(null).mockReturnValueOnce(null);

      const result = getUserInfo();

      expect(result).toBe(null);
    });
  });

  describe('getUserGroups', () => {
    it('should return user groups from userInfo', () => {
      const userInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        grupos: ['Administrador', 'Gerente'],
        permisos: ['view_dashboard'],
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(userInfo));

      const result = getUserGroups();

      expect(result).toEqual(['Administrador', 'Gerente']);
    });

    it('should return empty array if no userInfo', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = getUserGroups();

      expect(result).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has the permission', () => {
      const userInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        grupos: ['Administrador'],
        permisos: ['view_dashboard'],
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(userInfo));

      const result = hasPermission('view_dashboard');

      expect(result).toBe(true);
    });

    it('should return false if user does not have the permission', () => {
      const userInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        grupos: ['Administrador'],
        permisos: ['view_dashboard'],
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(userInfo));

      const result = hasPermission('edit_dashboard');

      expect(result).toBe(false);
    });
  });

  describe('isInGroup', () => {
    it('should return true if user is in the group', () => {
      const userInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        grupos: ['Administrador'],
        permisos: ['view_dashboard'],
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(userInfo));

      const result = isInGroup('Administrador');

      expect(result).toBe(true);
    });

    it('should return false if user is not in the group', () => {
      const userInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        grupos: ['Administrador'],
        permisos: ['view_dashboard'],
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(userInfo));

      const result = isInGroup('Gerente');

      expect(result).toBe(false);
    });
  });

  describe('getRedirectPath', () => {
    it('should return admin dashboard path for Administrador group', () => {
      const userInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        grupos: ['Administrador'],
        permisos: ['view_dashboard'],
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(userInfo));

      const result = getRedirectPath();

      expect(result).toBe('/admin/dashboard');
    });

    it('should return unauthorized path for unknown group', () => {
      const userInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        grupos: ['Unknown'],
        permisos: ['view_dashboard'],
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(userInfo));

      const result = getRedirectPath();

      expect(result).toBe('/no-autorizado');
    });
  });
});