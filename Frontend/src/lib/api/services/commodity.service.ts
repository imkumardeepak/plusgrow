import apiClient from '../client';
import type {
  Commodity,
  CreateCommodityDto,
  UpdateCommodityDto,
  ApiResponse,
  QueryParams
} from '@/types/api';

export const commodityService = {
  getAll: async (params?: QueryParams) => {
    const response = await apiClient.get<ApiResponse<Commodity[]>>('/commodities', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Commodity>>(`/commodities/${id}`);
    return response.data;
  },

  create: async (data: CreateCommodityDto) => {
    const response = await apiClient.post<ApiResponse<Commodity>>('/commodities', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCommodityDto) => {
    const response = await apiClient.put<ApiResponse<Commodity>>(`/commodities/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/commodities/${id}`);
    return response.data;
  },
};
