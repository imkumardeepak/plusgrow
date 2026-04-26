import axios, { AxiosError } from 'axios';
import { LoginRequest, RegisterRequest, ChangePasswordRequest, AuthResponse, ApiError } from '../types';

// Keep the shared client aligned with controller routes under /api.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5179/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    } else if (error.response?.status === 400 && error.response.data?.errors) {
      // Extract FluentValidation ProblemDetails errors
      const errorObj = error.response.data.errors;
      if (typeof errorObj === 'object' && !Array.isArray(errorObj)) {
        const messages = Object.values(errorObj).flat().join(', ');
        if (messages) {
          error.message = messages;
        }
      } else if (Array.isArray(errorObj)) {
        error.message = errorObj.join(', ');
      }
    } else if (error.response?.data?.message) {
      // Extract custom error message from API if present
      error.message = error.response.data.message;
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data.success && response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      if (response.data.user) {
        localStorage.setItem('auth_user', JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>('/auth/me');
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<AuthResponse> => {
    const response = await api.put<AuthResponse>('/auth/change-password', data);
    return response.data;
  },
};

export const getStoredUser = () => {
  const userStr = localStorage.getItem('auth_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => !!localStorage.getItem('auth_token');

export default api;
