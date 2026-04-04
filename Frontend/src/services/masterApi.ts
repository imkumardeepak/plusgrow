import axios from 'axios';
import api from './authApi';

// Use Vite env variable - no /api suffix needed (services add it)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5179/api';

// Types
export interface Manufacturer {
  id: number;
  name: string;
  country?: string;
  created_at: string;
}

export interface Commodity {
  id: number;
  name: string;
}

export interface Importer {
  id: number;
  name: string;
  address?: string;
  cin?: string;
  phone?: string;
  email?: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku?: string;
  hsnCode?: string;
  commodityId?: number;
  commodity?: Commodity;
  manufacturerId?: number;
  manufacturer?: Manufacturer;
  countryOfOrigin?: string;
  mrpQuantity?: string;
  factor?: number;
  unitType?: string;
  ussp?: number;
  mrp?: number;
  bestBeforeMonths: number;
  createdAt: string;
}

export interface CreateManufacturerDto {
  name: string;
  country?: string;
}

export interface CreateCommodityDto {
  name: string;
}

export interface CreateImporterDto {
  name: string;
  address?: string;
  cin?: string;
  phone?: string;
  email?: string;
}

export interface CreateProductDto {
  name: string;
  sku?: string;
  hsn_code?: string;
  commodity_id?: number;
  manufacturer_id?: number;
  country_of_origin?: string;
  mrp_quantity?: string;
  factor?: number;
  unit_type?: string;
  ussp?: number;
  mrp?: number;
  best_before_months?: number;
}

export interface ProductUploadResult {
  success: boolean;
  importedCount: number;
  errors?: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Manufacturers API - no /api prefix
export const manufacturersApi = {
  getAll: async (): Promise<Manufacturer[]> => {
    const response = await api.get<ApiResponse<Manufacturer[]>>('/manufacturers');
    return response.data.data || [];
  },

  getById: async (id: number): Promise<Manufacturer | null> => {
    const response = await api.get<ApiResponse<Manufacturer>>(`/manufacturers/${id}`);
    return response.data.data || null;
  },

  create: async (data: CreateManufacturerDto): Promise<Manufacturer> => {
    const response = await api.post<ApiResponse<Manufacturer>>('/manufacturers', data);
    return response.data.data!;
  },

  update: async (id: number, data: CreateManufacturerDto): Promise<Manufacturer> => {
    const response = await api.put<ApiResponse<Manufacturer>>(`/manufacturers/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturers/${id}`);
  },
};

// Commodities API - no /api prefix
export const commoditiesApi = {
  getAll: async (): Promise<Commodity[]> => {
    const response = await api.get<ApiResponse<Commodity[]>>('/commodities');
    return response.data.data || [];
  },

  getById: async (id: number): Promise<Commodity | null> => {
    const response = await api.get<ApiResponse<Commodity>>(`/commodities/${id}`);
    return response.data.data || null;
  },

  create: async (data: CreateCommodityDto): Promise<Commodity> => {
    const response = await api.post<ApiResponse<Commodity>>('/commodities', data);
    return response.data.data!;
  },

  update: async (id: number, data: CreateCommodityDto): Promise<Commodity> => {
    const response = await api.put<ApiResponse<Commodity>>(`/commodities/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/commodities/${id}`);
  },
};

// Importers API - no /api prefix
export const importersApi = {
  getAll: async (): Promise<Importer[]> => {
    const response = await api.get<ApiResponse<Importer[]>>('/importers');
    return response.data.data || [];
  },

  getById: async (id: number): Promise<Importer | null> => {
    const response = await api.get<ApiResponse<Importer>>(`/importers/${id}`);
    return response.data.data || null;
  },

  create: async (data: CreateImporterDto): Promise<Importer> => {
    const response = await api.post<ApiResponse<Importer>>('/importers', data);
    return response.data.data!;
  },

  update: async (id: number, data: CreateImporterDto): Promise<Importer> => {
    const response = await api.put<ApiResponse<Importer>>(`/importers/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/importers/${id}`);
  },
};

// Products API - no /api prefix
export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/products');
    return response.data.data || [];
  },

  getById: async (id: number): Promise<Product | null> => {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data || null;
  },

  search: async (query: string): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>(`/products/search?q=${encodeURIComponent(query)}`);
    return response.data.data || [];
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>('/products', data);
    return response.data.data!;
  },

  update: async (id: number, data: CreateProductDto): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
  
  uploadExcel: async (file: File): Promise<ProductUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<ProductUploadResult>>('/products/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },
  
  downloadTemplate: (): void => {
    const link = document.createElement('a');
    link.href = '/Product_Template.xlsx';
    link.download = 'Product_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
