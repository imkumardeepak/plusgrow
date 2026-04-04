import apiClient from '../client';
import type {
  Manufacturer,
  CreateManufacturerDto,
  UpdateManufacturerDto,
  ApiResponse,
  QueryParams
} from '@/types/api';

export const manufacturerService = {
  getAll: async (params?: QueryParams) => {
    const response = await apiClient.get<ApiResponse<Manufacturer[]>>('/manufacturers', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Manufacturer>>(`/manufacturers/${id}`);
    return response.data;
  },

  create: async (data: CreateManufacturerDto) => {
    const response = await apiClient.post<ApiResponse<Manufacturer>>('/manufacturers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateManufacturerDto) => {
    const response = await apiClient.put<ApiResponse<Manufacturer>>(`/manufacturers/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/manufacturers/${id}`);
    return response.data;
  },
};
