import apiClient from '../client';
import type {
  Importer,
  CreateImporterDto,
  UpdateImporterDto,
  ApiResponse,
  QueryParams
} from '@/types/api';

export const importerService = {
  getAll: async (params?: QueryParams) => {
    const response = await apiClient.get<ApiResponse<Importer[]>>('/importers', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Importer>>(`/importers/${id}`);
    return response.data;
  },

  create: async (data: CreateImporterDto) => {
    const response = await apiClient.post<ApiResponse<Importer>>('/importers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateImporterDto) => {
    const response = await apiClient.put<ApiResponse<Importer>>(`/importers/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/importers/${id}`);
    return response.data;
  },
};
