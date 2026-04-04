import apiClient from '../client';
import type {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  ApiResponse,
  PaginatedResponse,
  QueryParams
} from '@/types/api';

export const roleService = {
  getAll: async (params?: QueryParams) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Role>>>('/roles', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Role>>(`/roles/${id}`);
    return response.data;
  },

  create: async (data: CreateRoleDto) => {
    const response = await apiClient.post<ApiResponse<Role>>('/roles', data);
    return response.data;
  },

  update: async (id: number, data: UpdateRoleDto) => {
    const response = await apiClient.put<ApiResponse<Role>>(`/roles/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/roles/${id}`);
    return response.data;
  },
};

export default roleService;
