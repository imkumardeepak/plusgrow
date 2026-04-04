import apiClient from '../client';
import type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ApiResponse,
  QueryParams
} from '@/types/api';

export const productService = {
  getAll: async (params?: QueryParams) => {
    const response = await apiClient.get<ApiResponse<Product[]>>('/products', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProductDto) => {
    const response = await apiClient.post<ApiResponse<Product>>('/products', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProductDto) => {
    const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/products/${id}`);
    return response.data;
  },

  search: async (query: string) => {
    const response = await apiClient.get<ApiResponse<Product[]>>('/products/search', {
      params: { q: query }
    });
    return response.data;
  },
};
