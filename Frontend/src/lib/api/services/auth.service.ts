import apiClient from '../client';
import type {
  User,
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  AuthResponseDto,
  ApiResponse,
  QueryParams
} from '@/types/api';

// Auth endpoints
export const authService = {
  login: async (data: LoginDto) => {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>('/auth/login', data);
    if (response.data?.success && response.data.data) {
      localStorage.setItem('auth_token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  register: async (data: CreateUserDto) => {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },

  refreshToken: async () => {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>('/auth/refresh-token');
    if (response.data?.success && response.data.data) {
      localStorage.setItem('auth_token', response.data.data.token);
    }
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.put<ApiResponse<void>>('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }
};

// User endpoints
export const userService = {
  getAll: async (params?: QueryParams) => {
    const response = await apiClient.get<ApiResponse<User[]>>('/users', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUserDto) => {
    const response = await apiClient.post<ApiResponse<User>>('/users', data);
    return response.data;
  },

  update: async (id: number, data: UpdateUserDto) => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/users/${id}`);
    return response.data;
  },
};

// Role endpoints
export const roleService = {
  getAll: async (params?: QueryParams) => {
    const response = await apiClient.get<ApiResponse<any>>('/roles', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<any>>(`/roles/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<ApiResponse<any>>('/roles', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<ApiResponse<any>>(`/roles/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/roles/${id}`);
    return response.data;
  },
};
