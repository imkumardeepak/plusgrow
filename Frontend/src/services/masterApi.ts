import axios from 'axios';
import * as XLSX from 'xlsx';
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
  factor?: string;
  netQuantity?: string;
  unitType?: string;
  ussp?: number;
  mrp?: number;
  bestBeforeMonths: number;
  createdAt: string;
}

export interface CreateManufacturerDto {
  id?: number;
  name: string;
  country?: string;
  address?: string;
}

export interface CreateCommodityDto {
  id?: number;
  name: string;
}

export interface CreateImporterDto {
  id?: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CreateProductDto {
  name: string;
  sku?: string;
  commodityId?: number;
  manufacturerId?: number;
  countryOfOrigin?: string;
  factor?: string;
  netQuantity?: string;
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

export interface PoInvoiceFilters {
  search?: string;
  status?: "all" | "pending" | "printed";
  fromDate?: string;
  toDate?: string;
}

export interface PoInvoice {
  id: number;
  invoiceNumber: string;
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

export interface ProductStockMovementRecord {
  id: number;
  productId: number;
  skuCode: string;
  productName: string;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  movementType: string;
  notes?: string | null;
  performedByUserId?: number | null;
  performedByName?: string | null;
  createdAt: string;
}

export interface CreateStockAdjustmentDto {
  productId: number;
  quantityChange: number;
  reason: string;
  notes?: string | null;
}

export interface StockAdjustmentResult {
  quantity: ProductQuantityRecord;
  movement: ProductStockMovementRecord;
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
    const response = await api.put<ApiResponse<Manufacturer>>(`/manufacturers/${id}`, { ...data, id });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturers/${id}`);
  },

  uploadExcel: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<ImportResult>>('/manufacturers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!response.data.success) throw new Error(response.data.message || 'Error uploading file');
    return response.data.data!;
  },

  downloadTemplate: (): void => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      {
        'Manufacturer Name': '',
        'Country': '',
        'Address': '',
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 35 },  // Manufacturer Name
      { wch: 20 },  // Country
      { wch: 40 },  // Address
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Manufacturer Template');
    XLSX.writeFile(wb, 'Manufacturer_Template.xlsx');
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
    const response = await api.put<ApiResponse<Commodity>>(`/commodities/${id}`, { ...data, id });
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/commodities/${id}`);
  },

  uploadExcel: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<ImportResult>>('/commodities/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!response.data.success) throw new Error(response.data.message || 'Error uploading file');
    return response.data.data!;
  },

  downloadTemplate: (): void => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      {
        'Commodity Name': '',
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 35 },  // Commodity Name
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Commodity Template');
    XLSX.writeFile(wb, 'Commodity_Template.xlsx');
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
    const response = await api.put<ApiResponse<Importer>>(`/importers/${id}`, { ...data, id });
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
    const wb = XLSX.utils.book_new();
    const templateData = [
      {
        'Product Name': '',
        'SKU': '',
        'Manufacturer Name': '',
        'Commodity Name': '',
        'Country of Origin': 'India',
        'MRP': '',
        'MRP/Unit': '1L or 500g',
        'Unit Type': 'UNIT',
        'Best Before (Months)': '12',
        'Stock Qnty': '',
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 35 },  // Product Name
      { wch: 20 },  // SKU
      { wch: 25 },  // Manufacturer Name
      { wch: 20 },  // Commodity Name
      { wch: 18 },  // Country of Origin
      { wch: 12 },  // MRP
      { wch: 15 },  // MRP/Unit
      { wch: 12 },  // Unit Type
      { wch: 20 },  // Best Before (Months)
      { wch: 12 },  // Stock Qnty
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Product Template');
    XLSX.writeFile(wb, 'Product_Template.xlsx');
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

  downloadTemplate: (): void => {
    const wb = XLSX.utils.book_new();
    const templateData = [{ 'BinCode': '' }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Bin Template');
    XLSX.writeFile(wb, 'Bin_Template.xlsx');
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

  downloadTemplate: (): void => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      {
        'LocationCode': '',
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 20 },  // LocationCode
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Location Template');
    XLSX.writeFile(wb, 'Location_Template.xlsx');
  },

  mapBins: async (id: number, binCodes: string[]): Promise<Location> => {
    const response = await api.post<ApiResponse<Location>>(`/locations/${id}/map-bins`, { binCodes });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },
};

export const poInvoicesApi = {
  getAll: async (filters?: PoInvoiceFilters): Promise<PoInvoice[]> => {
    const response = await api.get<ApiResponse<PoInvoice[]>>('/poinvoices', {
      params: {
        search: filters?.search || undefined,
        status: filters?.status && filters.status !== 'all' ? filters.status : undefined,
        fromDate: filters?.fromDate || undefined,
        toDate: filters?.toDate || undefined,
      },
    });
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

  downloadTemplate: (): void => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      {
        'InvoiceDate': '',
        'PartyName': '',
        'SKUCode': '',
        'ProductName': '',
        'BilledQty': '',
        'MRP': '',
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
      { wch: 35 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'PO Invoice Template');
    XLSX.writeFile(wb, 'PO_Invoice_Template.xlsx');
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

  getMovements: async (search?: string): Promise<ProductStockMovementRecord[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await api.get<ApiResponse<ProductStockMovementRecord[]>>(`/productquantities/movements${query}`);
    return response.data.data || [];
  },

  create: async (data: CreateProductQuantityDto): Promise<ProductQuantityRecord> => {
    const response = await api.post<ApiResponse<ProductQuantityRecord>>('/productquantities', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  adjust: async (data: CreateStockAdjustmentDto): Promise<StockAdjustmentResult> => {
    const response = await api.post<ApiResponse<StockAdjustmentResult>>('/productquantities/adjust', data);
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
