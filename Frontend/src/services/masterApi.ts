import axios from 'axios';
import api from './authApi';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5179/api';

// Types
export interface Manufacturer {
  id: number;
  name: string;
  country?: string;
  address?: string;
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
  address?: string;
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
  commodityId?: number;
  manufacturerId?: number;
  countryOfOrigin?: string;
  mrpQuantity?: string;
  factor?: number;
  unitType?: string;
  ussp?: number;
  mrp?: number;
  bestBeforeMonths?: number;
  id?: number;
}

export interface ProductUploadResult {
  success: boolean;
  importedCount: number;
  errors?: string[];
}

export interface Bin {
  id: number;
  binCode: string;
  createdAt: string;
}

export interface CreateBinDto {
  id?: number;
  binCode: string;
}

export interface Location {
  id: number;
  aisle: string;
  rack: string;
  shelf: string;
  locationCode: string;
  bins: string[];
  createdAt: string;
}

export interface CreateLocationDto {
  id?: number;
  aisle: string;
  rack: string;
  shelf: string;
  locationCode: string;
  bins: string[];
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errors?: string[];
}

export interface MarkPoInvoicesPrintedResult {
  updatedCount: number;
}

export interface PoInvoice {
  id: number;
  invoiceDate: string;
  partyName: string;
  productId: number;
  skuCode: string;
  productName: string;
  mrp?: number;
  billedQty: number;
  printed: boolean;
  remainingAllocation: number;
  locationAllotted: boolean;
  createdAt: string;
}

export interface CreatePoInvoiceDto {
  id?: number;
  invoiceDate: string;
  partyName: string;
  productId: number;
  billedQty: number;
  printed: boolean;
  remainingAllocation: number;
  locationAllotted: boolean;
}

export interface ProductQuantityRecord {
  id: number;
  productId: number;
  skuCode: string;
  productName: string;
  currentQuantity: number;
  updatedAt: string;
}

export interface CreateProductQuantityDto {
  id?: number;
  productId: number;
  currentQuantity: number;
}

export interface ProductAllottedLocationRecord {
  id: number;
  productId: number;
  skuCode: string;
  productName: string;
  locationJson: Record<string, number>;
  updatedAt: string;
}

export interface CreateProductAllottedLocationDto {
  id?: number;
  productId: number;
  locationJson: Record<string, number>;
}

export interface PutAwayScanAssignmentRequestDto {
  productScanCode: string;
  locationOrBinScanCode: string;
  quantity: number;
}

export interface PutAwayScanAssignmentResult {
  productId: number;
  skuCode: string;
  productName: string;
  scannedLocationOrBinCode: string;
  resolvedLocationCode: string;
  assignedQuantity: number;
  currentQuantity: number;
  totalAllocatedQuantity: number;
  remainingUnassignedQuantity: number;
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
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  update: async (id: number, data: CreateManufacturerDto): Promise<Manufacturer> => {
    const response = await api.put<ApiResponse<Manufacturer>>(`/manufacturers/${id}`, data);
    if (!response.data.success) throw new Error(response.data.message);
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

// Bins API
export const binsApi = {
  getAll: async (): Promise<Bin[]> => {
    const response = await api.get<ApiResponse<Bin[]>>('/bins');
    return response.data.data || [];
  },

  create: async (data: CreateBinDto): Promise<Bin> => {
    const response = await api.post<ApiResponse<Bin>>('/bins', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  update: async (id: number, data: CreateBinDto): Promise<Bin> => {
    const response = await api.put<ApiResponse<Bin>>(`/bins/${id}`, data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/bins/${id}`);
  },

  uploadExcel: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<ImportResult>>('/bins/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!response.data.success) throw new Error(response.data.message || 'Error uploading file');
    return response.data.data!;
  },
};

// Locations API
export const locationsApi = {
  getAll: async (): Promise<Location[]> => {
    const response = await api.get<ApiResponse<Location[]>>('/locations');
    return response.data.data || [];
  },

  create: async (data: CreateLocationDto): Promise<Location> => {
    const response = await api.post<ApiResponse<Location>>('/locations', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  update: async (id: number, data: CreateLocationDto): Promise<Location> => {
    const response = await api.put<ApiResponse<Location>>(`/locations/${id}`, data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/locations/${id}`);
  },

  uploadExcel: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<ImportResult>>('/locations/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!response.data.success) throw new Error(response.data.message || 'Error uploading file');
    return response.data.data!;
  },
};

export const poInvoicesApi = {
  getAll: async (): Promise<PoInvoice[]> => {
    const response = await api.get<ApiResponse<PoInvoice[]>>('/poinvoices');
    return response.data.data || [];
  },

  create: async (data: CreatePoInvoiceDto): Promise<PoInvoice> => {
    const response = await api.post<ApiResponse<PoInvoice>>('/poinvoices', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  update: async (id: number, data: CreatePoInvoiceDto): Promise<PoInvoice> => {
    const response = await api.put<ApiResponse<PoInvoice>>(`/poinvoices/${id}`, { ...data, id });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/poinvoices/${id}`);
  },

  uploadExcel: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<ImportResult>>('/poinvoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (!response.data.success) throw new Error(response.data.message || 'Error uploading file');
    return response.data.data!;
  },

  markPrinted: async (invoiceIds: number[]): Promise<MarkPoInvoicesPrintedResult> => {
    const response = await api.post<ApiResponse<MarkPoInvoicesPrintedResult>>('/poinvoices/mark-printed', {
      invoiceIds,
    });
    if (!response.data.success) throw new Error(response.data.message || 'Error marking invoice rows as printed');
    return response.data.data!;
  },
};

export const productQuantitiesApi = {
  getAll: async (): Promise<ProductQuantityRecord[]> => {
    const response = await api.get<ApiResponse<ProductQuantityRecord[]>>('/productquantities');
    return response.data.data || [];
  },

  create: async (data: CreateProductQuantityDto): Promise<ProductQuantityRecord> => {
    const response = await api.post<ApiResponse<ProductQuantityRecord>>('/productquantities', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  update: async (id: number, data: CreateProductQuantityDto): Promise<ProductQuantityRecord> => {
    const response = await api.put<ApiResponse<ProductQuantityRecord>>(`/productquantities/${id}`, { ...data, id });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/productquantities/${id}`);
  },
};

export const productAllottedLocationsApi = {
  getAll: async (): Promise<ProductAllottedLocationRecord[]> => {
    const response = await api.get<ApiResponse<ProductAllottedLocationRecord[]>>('/productallottedlocations');
    return response.data.data || [];
  },

  create: async (data: CreateProductAllottedLocationDto): Promise<ProductAllottedLocationRecord> => {
    const response = await api.post<ApiResponse<ProductAllottedLocationRecord>>('/productallottedlocations', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  update: async (id: number, data: CreateProductAllottedLocationDto): Promise<ProductAllottedLocationRecord> => {
    const response = await api.put<ApiResponse<ProductAllottedLocationRecord>>(`/productallottedlocations/${id}`, { ...data, id });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/productallottedlocations/${id}`);
  },

  assignScan: async (data: PutAwayScanAssignmentRequestDto): Promise<PutAwayScanAssignmentResult> => {
    const response = await api.post<ApiResponse<PutAwayScanAssignmentResult>>('/productallottedlocations/assign-scan', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },
};
