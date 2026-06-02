import axios from 'axios';
import * as XLSX from 'xlsx';
import api from './authApi';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:81/api';

// Types
export interface Manufacturer {
  id: number;
  name: string;
  country?: string;
  address?: string;
  created_at: string;
}

export interface Party {
  id: number;
  name: string;
  address?: string;
  country?: string;
  phone?: string;
  email: string;
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
  alias?: string;
  commodityId?: number;
  commodity?: Commodity;
  manufacturerId?: number;
  manufacturer?: Manufacturer;
  countryOfOrigin?: string;
  factor?: string;
  netQuantity?: string;
  unitType?: string;
  ussp?: number;
  weight?: number;
  ownership?: string;
  mrp?: number;
  bestBeforeMonths: number;
  note?: string | null;
  createdAt: string;
}

export function validateProductForSticker(
  product: Product,
  stickerSize?: string,
): string[] {
  const errors: string[] = [];
  if (!product.sku?.trim()) errors.push("SKU");
  if (stickerSize === "25x25") return errors;

  if (!product.name?.trim()) errors.push("Product Name");
  if (!product.commodityId && !product.commodity?.name) errors.push("Commodity");
  if (!product.manufacturerId && !product.manufacturer?.name) errors.push("Manufacturer");
  if (!product.countryOfOrigin?.trim()) errors.push("Country of Origin");
  if (!product.netQuantity?.trim()) errors.push("Net Quantity");
  if (!product.unitType?.trim()) errors.push("Unit Type");
  if (!product.mrp || product.mrp <= 0) errors.push("MRP");
  if (!product.bestBeforeMonths || product.bestBeforeMonths <= 0) errors.push("Best Before Months");
  if (!product.factor?.trim()) errors.push("Factor");
  return errors;
}

export interface ProductLookupResult {
  sku: string;
  product: Product;
  currentStock: number;
  locations: Array<{ locationCode: string; quantity: number }>;
}

export interface CreateManufacturerDto {
  id?: number;
  name: string;
  country?: string;
  address?: string;
}

export interface CreatePartyDto {
  id?: number;
  name: string;
  address?: string;
  country?: string;
  phone?: string;
  email: string;
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
  alias?: string;
  commodityId?: number;
  manufacturerId?: number;
  countryOfOrigin?: string;
  factor?: string;
  netQuantity?: string;
  unitType?: string;
  ussp?: number;
  weight?: number;
  ownership?: string;
  mrp?: number;
  bestBeforeMonths?: number;
  note?: string;
  id?: number;
}

export interface SkippedRowInfo {
  rowNumber: number;
  sku?: string | null;
  productName?: string | null;
  reason: string;
}

export interface ProductUploadResult {
  success: boolean;
  importedCount: number;
  errors?: string[];
  skippedRows?: SkippedRowInfo[];
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

export interface RolePageAccessRecord {
  id: number;
  roleId: number;
  pageKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RoleRecord {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

export interface CreateRoleDto {
  id?: number;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UserRecord {
  id: number;
  username: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  roleId?: number | null;
  roleName?: string | null;
  isActive: boolean;
  password?: string;
  createdAt: string;
  lastLoginAt?: string | null;
  pageAccesses: RolePageAccessRecord[];
}

export interface CreateUserDto {
  id?: number;
  username: string;
  password?: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  roleId?: number | null;
  isActive?: boolean;
}

export interface MarkPoInvoicesPrintedResult {
  updatedCount: number;
}

export interface PoInvoiceFilters {
  search?: string;
  status?: "all" | "pending" | "printed";
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
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

export interface PoInvoiceHeaderSummary {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  partyName: string;
  totalBilledQty: number;
  totalRemainingAllocation: number;
  productCount: number;
  printedCount: number;
  pendingCount: number;
  items: PoInvoice[];
}

export interface CreatePoInvoiceDto {
  id?: number;
  invoiceNumber: string;
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
  alias?: string;
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
  locationCode: string;
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
  alias?: string;
  locationJson: Record<string, number>;
  updatedAt: string;
}

export interface CreateProductAllottedLocationDto {
  id?: number;
  productId: number;
  locationJson: Record<string, number>;
}

export interface MoveProductStockDto {
  productId: number;
  sourceLocationCode: string;
  destinationLocationCode: string;
  quantity: number;
  reason?: string;
  notes?: string;
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

export interface OutwardOrder {
  id: number;
  orderNumber: string;
  salesOrderId: number;
  salesOrderStatus: "Open" | "Picking" | "Packed" | "Dispatched";
  salesOrderNotes?: string | null;
  salesOrderCreatedAt: string;
  salesOrderUpdatedAt: string;
  salesOrderDispatchedAt?: string | null;
  orderDate: string;
  customerName: string;
  productId: number;
  skuCode: string;
  productName: string;
  alias?: string;
  quantity: number;
  pickedQuantity: number;
  pendingQuantity: number;
  status: "Open" | "Picking" | "Packed" | "Dispatched";
  cartonId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string | null;
}

export interface SalesOrderRecord {
  id: number;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  status: "Open" | "Picking" | "Packed" | "Dispatched";
  notes?: string | null;
  itemCount: number;
  totalQuantity: number;
  totalPickedQuantity: number;
  pendingQuantity: number;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string | null;
  items: OutwardOrder[];
}

export interface CreateOutwardOrderDto {
  orderDate: string;
  customerName: string;
  productId?: number | null;
  quantity?: number | null;
  notes?: string | null;
  items?: CreateOutwardOrderItemDto[];
}

export interface CreateOutwardOrderItemDto {
  productId: number;
  quantity: number;
}

export interface OutwardOrderFilters {
  search?: string;
  status?: "all" | "open" | "picking" | "packed" | "dispatched";
  page?: number;
  pageSize?: number;
}

export interface UpdateOutwardPickingDto {
  quantity: number;
  skuCode?: string;
  locationCode?: string;
}

export interface DirectOutwardPickDto {
  productId: number;
  quantity: number;
  skuCode?: string;
  locationCode: string;
  remark: string;
  customerName?: string | null;
}

export interface DispatchOutwardOrderDto {
  cartonId?: string | null;
}

export interface DispatchSalesOrderResult {
  salesOrderId: number;
  orderNumber: string;
  dispatchedItemCount: number;
  items: OutwardOrder[];
}

export interface PackingCarton {
  id: number;
  outwardOrderId: number;
  cartonNumber: string;
  quantity: number;
  status: "Open" | "Ready" | "Dispatched";
  createdAt: string;
  updatedAt: string;
}

export interface ListQuery {
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface DashboardQuantityMix {
  name: string;
  value: number;
}

export interface DashboardStockPosition {
  id: number;
  skuCode: string;
  productName: string;
  currentQuantity: number;
}

export interface DashboardDispatchQueue {
  id: number;
  orderNumber: string;
  customerName: string;
  productName: string;
  pendingQuantity: number;
  status: string;
}

export interface DashboardMovement {
  id: number;
  skuCode: string;
  productName: string;
  quantityChange: number;
  quantityAfter: number;
  reason: string;
  createdAt: string;
}

export interface PartyDashboardLocation {
  locationCode: string;
  quantity: number;
}

export interface PartyDashboardProduct {
  productId: number;
  skuCode: string;
  productName: string;
  alias?: string | null;
  commodityName?: string | null;
  manufacturerName?: string | null;
  countryOfOrigin?: string | null;
  netQuantity?: string | null;
  unitType?: string | null;
  mrp?: number | null;
  weight?: number | null;
  factor?: string | null;
  ussp?: number | null;
  bestBeforeMonths?: number | null;
  note?: string | null;
  ownership?: string | null;
  currentQuantity: number;
  locations: PartyDashboardLocation[];
}

export interface PartyDashboardSummary {
  partyName: string;
  partyEmail: string;
  productCount: number;
  totalStockQuantity: number;
  locatedQuantity: number;
  unlocatedQuantity: number;
  products: PartyDashboardProduct[];
}

export interface DashboardSummary {
  productCount: number;
  commodityCount: number;
  manufacturerCount: number;
  importerCount: number;
  binCount: number;
  locationCount: number;
  productQuantityCount: number;
  skusWithStock: number;
  zeroStockProducts: number;
  totalStockQuantity: number;
  allocatedQuantity: number;
  pendingPutAwayQuantity: number;
  poInvoiceCount: number;
  pendingPoInvoiceCount: number;
  pendingStickerRows: number;
  outwardOrderCount: number;
  openOutwardOrderCount: number;
  pendingDispatchQuantity: number;
  totalOutboundQuantity: number;
  pickedOutboundQuantity: number;
  inventoryCoveragePercent: number;
  locationUtilizationPercent: number;
  dispatchProgressPercent: number;
  quantityMix: DashboardQuantityMix[];
  topStockPositions: DashboardStockPosition[];
  activeDispatchQueue: DashboardDispatchQueue[];
  recentStockMovements: DashboardMovement[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PagedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

const emptyPagination = (page = 1, pageSize = 25): PaginationInfo => ({
  page,
  pageSize,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
});

// Manufacturers API - no /api prefix
export const manufacturersApi = {
  getAll: async (): Promise<Manufacturer[]> => {
    const result = await manufacturersApi.getPaged({ page: 1, pageSize: 1000000 });
    return result.data;
  },

  getPaged: async (query: ListQuery = {}): Promise<PagedResult<Manufacturer>> => {
    const response = await api.get<ApiResponse<Manufacturer[]>>('/manufacturers', { params: query });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(query.page, query.pageSize),
    };
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

// Parties API - no /api prefix
export const partiesApi = {
  getAll: async (): Promise<Party[]> => {
    const result = await partiesApi.getPaged({ page: 1, pageSize: 1000000 });
    return result.data;
  },

  getPaged: async (query: ListQuery = {}): Promise<PagedResult<Party>> => {
    const response = await api.get<ApiResponse<Party[]>>('/parties', { params: query });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(query.page, query.pageSize),
    };
  },

  getById: async (id: number): Promise<Party | null> => {
    const response = await api.get<ApiResponse<Party>>(`/parties/${id}`);
    return response.data.data || null;
  },

  create: async (data: CreatePartyDto): Promise<Party> => {
    const response = await api.post<ApiResponse<Party>>('/parties', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  update: async (id: number, data: CreatePartyDto): Promise<Party> => {
    const response = await api.put<ApiResponse<Party>>(`/parties/${id}`, { ...data, id });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/parties/${id}`);
  },
};

// Commodities API - no /api prefix
export const commoditiesApi = {
  getAll: async (): Promise<Commodity[]> => {
    const result = await commoditiesApi.getPaged({ page: 1, pageSize: 1000000 });
    return result.data;
  },

  getPaged: async (query: ListQuery = {}): Promise<PagedResult<Commodity>> => {
    const response = await api.get<ApiResponse<Commodity[]>>('/commodities', { params: query });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(query.page, query.pageSize),
    };
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
    const result = await importersApi.getPaged({ page: 1, pageSize: 1000000 });
    return result.data;
  },

  getPaged: async (query: ListQuery = {}): Promise<PagedResult<Importer>> => {
    const response = await api.get<ApiResponse<Importer[]>>('/importers', { params: query });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(query.page, query.pageSize),
    };
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
    const result = await productsApi.getPaged({ page: 1, pageSize: 1000000 });
    return result.data;
  },

  getPaged: async (query: ListQuery = {}): Promise<PagedResult<Product>> => {
    const response = await api.get<ApiResponse<Product[]>>('/products', { params: query });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(query.page, query.pageSize),
    };
  },

  getById: async (id: number): Promise<Product | null> => {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data || null;
  },

  search: async (query: string = ''): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/products/search', {
      params: { q: query.trim() || undefined },
    });
    return response.data.data || [];
  },

  lookup: async (sku: string): Promise<ProductLookupResult> => {
    const response = await api.get<ApiResponse<ProductLookupResult>>('/products/lookup', {
      params: { sku: sku.trim() },
    });
    if (!response.data.success) throw new Error(response.data.message || 'Product lookup failed');
    return response.data.data!;
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

  updateFromExcel: async (file: File): Promise<ProductUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<ProductUploadResult>>('/products/update-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!response.data.success) throw new Error(response.data.message || 'Error updating from file');
    return response.data.data!;
  },

  downloadUpdateTemplate: (products: Product[], selectedFields: string[]): void => {
    const wb = XLSX.utils.book_new();
    
    // Build rows with SKU as the first column and the selected fields
    const templateData = products.map(product => {
      const row: any = { 'SKU': product.sku };
      
      selectedFields.forEach(field => {
        switch(field) {
          case 'MRP': row['MRP'] = product.mrp ?? ''; break;
          case 'Weight': row['Weight'] = product.weight ?? ''; break;
          case 'Alias': row['Alias'] = product.alias ?? ''; break;
          case 'Product Name': row['Product Name'] = product.name ?? ''; break;
          case 'Manufacturer Name': row['Manufacturer Name'] = product.manufacturer?.name ?? ''; break;
          case 'Commodity Name': row['Commodity Name'] = product.commodity?.name ?? ''; break;
          case 'Country of Origin': row['Country of Origin'] = product.countryOfOrigin ?? ''; break;
          case 'Unit Type': row['Unit Type'] = product.unitType ?? ''; break;
          case 'USSP': row['USSP'] = product.ussp ?? ''; break;
          case 'Net Qnty': row['Net Qnty'] = product.netQuantity ?? ''; break;
          case 'Factor': row['Factor'] = product.factor ?? ''; break;
          case 'Best Before (Months)': row['Best Before (Months)'] = product.bestBeforeMonths ?? ''; break;
          case 'Ownership': row['Ownership'] = product.ownership ?? ''; break;
          case 'Note': row['Note'] = product.note ?? ''; break;
        }
      });
      
      return row;
    });
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Auto-size columns based on header length or a default
    ws['!cols'] = [
      { wch: 20 }, // SKU
      ...selectedFields.map(() => ({ wch: 15 })) // Default width for others
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Update Template');
    XLSX.writeFile(wb, 'Product_Update_Template.xlsx');
  },
  
  downloadTemplate: (): void => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      {
        'Product Name': '',
        'SKU': '',
        'Alias': '',
        'Manufacturer Name': '',
        'Commodity Name': '',
        'Country of Origin': 'India',
        'Unit Type': 'UNIT',
        'MRP': '',
        'Net Qnty': '',
        'Factor': '1L or 500g',
        'Best Before (Months)': '84',
        'Weight': '',
        'Ownership': 'Self',
        'Stock Qnty': '',
        'Note': '',
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 35 },  // Product Name
      { wch: 20 },  // SKU
      { wch: 20 },  // Alias
      { wch: 25 },  // Manufacturer Name
      { wch: 20 },  // Commodity Name
      { wch: 18 },  // Country of Origin
      { wch: 12 },  // Unit Type
      { wch: 12 },  // MRP
      { wch: 12 },  // Net Qnty
      { wch: 15 },  // Factor
      { wch: 20 },  // Best Before (Months)
      { wch: 12 },  // Weight
      { wch: 15 },  // Ownership
      { wch: 12 },  // Stock Qnty
      { wch: 20 },  // Note
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
  getHeaders: async (
    filters?: PoInvoiceFilters,
  ): Promise<PagedResult<PoInvoiceHeaderSummary>> => {
    const response = await api.get<ApiResponse<PoInvoiceHeaderSummary[]>>(
      "/poinvoices/headers",
      {
        params: {
          search: filters?.search || undefined,
          status:
            filters?.status && filters.status !== "all"
              ? filters.status
              : undefined,
          fromDate: filters?.fromDate || undefined,
          toDate: filters?.toDate || undefined,
          page: filters?.page,
          pageSize: filters?.pageSize,
        },
      },
    );
    return {
      data: response.data.data || [],
      pagination:
        response.data.pagination ||
        emptyPagination(filters?.page, filters?.pageSize),
    };
  },

  getAll: async (filters?: PoInvoiceFilters): Promise<PoInvoice[]> => {
    const result = await poInvoicesApi.getPaged(filters);
    return result.data;
  },

  getPaged: async (filters?: PoInvoiceFilters): Promise<PagedResult<PoInvoice>> => {
    const response = await api.get<ApiResponse<PoInvoice[]>>('/poinvoices', {
      params: {
        search: filters?.search || undefined,
        status: filters?.status && filters.status !== 'all' ? filters.status : undefined,
        fromDate: filters?.fromDate || undefined,
        toDate: filters?.toDate || undefined,
        page: filters?.page,
        pageSize: filters?.pageSize,
      },
    });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(filters?.page, filters?.pageSize),
    };
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

  moveStock: async (data: MoveProductStockDto): Promise<ProductAllottedLocationRecord> => {
    const response = await api.post<ApiResponse<ProductAllottedLocationRecord>>('/productallottedlocations/move', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },
};

export const outwardOrdersApi = {
  getSalesOrders: async (filters: OutwardOrderFilters = {}): Promise<SalesOrderRecord[]> => {
    const result = await outwardOrdersApi.getSalesOrderPaged({
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 500,
      ...filters,
    });
    return result.data;
  },

  getSalesOrderPaged: async (filters: OutwardOrderFilters = {}): Promise<PagedResult<SalesOrderRecord>> => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const query = params.toString();
    const response = await api.get<ApiResponse<SalesOrderRecord[]>>(`/outwardorders/sales-orders${query ? `?${query}` : ''}`);
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(filters.page, filters.pageSize),
    };
  },

  getAll: async (filters: OutwardOrderFilters = {}): Promise<OutwardOrder[]> => {
    const result = await outwardOrdersApi.getPaged({
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 500,
      ...filters,
    });
    return result.data;
  },

  getPaged: async (filters: OutwardOrderFilters = {}): Promise<PagedResult<OutwardOrder>> => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const query = params.toString();
    const response = await api.get<ApiResponse<OutwardOrder[]>>(`/outwardorders${query ? `?${query}` : ''}`);
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || emptyPagination(filters.page, filters.pageSize),
    };
  },

  create: async (data: CreateOutwardOrderDto): Promise<OutwardOrder> => {
    const response = await api.post<ApiResponse<OutwardOrder>>('/outwardorders', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  pick: async (id: number, data: UpdateOutwardPickingDto): Promise<OutwardOrder> => {
    const response = await api.post<ApiResponse<OutwardOrder>>(`/outwardorders/${id}/pick`, data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  directPick: async (data: DirectOutwardPickDto): Promise<OutwardOrder> => {
    const response = await api.post<ApiResponse<OutwardOrder>>('/outwardorders/direct-pick', data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  dispatch: async (id: number, data: DispatchOutwardOrderDto): Promise<OutwardOrder> => {
    const response = await api.post<ApiResponse<OutwardOrder>>(`/outwardorders/${id}/dispatch`, data);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  dispatchSalesOrder: async (salesOrderId: number): Promise<DispatchSalesOrderResult> => {
    const response = await api.post<ApiResponse<DispatchSalesOrderResult>>(`/outwardorders/sales-orders/${salesOrderId}/dispatch`);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },
};

export const packingCartonsApi = {
  getByOrder: async (orderId: number): Promise<PackingCarton[]> => {
    const response = await api.get<ApiResponse<PackingCarton[]>>(`/packingcartons/by-order/${orderId}`);
    return response.data.data || [];
  },

  create: async (orderId: number): Promise<PackingCarton> => {
    const response = await api.post<ApiResponse<PackingCarton>>('/packingcartons', { outwardOrderId: orderId });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  packItem: async (cartonId: number, skuCode: string): Promise<PackingCarton> => {
    const response = await api.post<ApiResponse<PackingCarton>>(`/packingcartons/${cartonId}/pack`, { skuCode });
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  markReady: async (cartonId: number): Promise<PackingCarton> => {
    const response = await api.post<ApiResponse<PackingCarton>>(`/packingcartons/${cartonId}/ready`);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  markOrderPacked: async (orderId: number): Promise<PackingCarton> => {
    const response = await api.post<ApiResponse<PackingCarton>>(`/packingcartons/by-order/${orderId}/mark-packed`);
    if (!response.data.success) throw new Error(response.data.message);
    return response.data.data!;
  },

  delete: async (cartonId: number): Promise<void> => {
    await api.delete(`/packingcartons/${cartonId}`);
  },
};

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
    if (!response.data.success) throw new Error(response.data.message || 'Error loading dashboard summary');
    return response.data.data!;
  },
};

export const partyDashboardApi = {
  getSummary: async (): Promise<PartyDashboardSummary> => {
    const response = await api.get<ApiResponse<PartyDashboardSummary>>('/partydashboard');
    if (!response.data.success) throw new Error(response.data.message || 'Error loading party dashboard');
    return response.data.data!;
  },
};

export const rolesApi = {
  getAll: async (): Promise<RoleRecord[]> => {
    const response = await api.get<ApiResponse<RoleRecord[]>>('/roles');
    return response.data.data || [];
  },

  getPageAccess: async (roleId: number): Promise<RolePageAccessRecord[]> => {
    const response = await api.get<ApiResponse<RolePageAccessRecord[]>>(`/roles/${roleId}/page-access`);
    return response.data.data || [];
  },

  create: async (data: CreateRoleDto): Promise<RoleRecord> => {
    const response = await api.post<ApiResponse<RoleRecord>>('/roles', data);
    if (!response.data.success) throw new Error(response.data.message || 'Error creating role');
    return response.data.data!;
  },

  update: async (id: number, data: CreateRoleDto): Promise<RoleRecord> => {
    const response = await api.put<ApiResponse<RoleRecord>>(`/roles/${id}`, { ...data, id });
    if (!response.data.success) throw new Error(response.data.message || 'Error updating role');
    return response.data.data!;
  },

  updatePageAccess: async (
    roleId: number,
    pageAccesses: Array<Omit<RolePageAccessRecord, 'id' | 'roleId'>>,
  ): Promise<RolePageAccessRecord[]> => {
    const response = await api.put<ApiResponse<RolePageAccessRecord[]>>(`/roles/${roleId}/page-access`, {
      roleId,
      pageAccesses,
    });
    if (!response.data.success) throw new Error(response.data.message || 'Error updating permissions');
    return response.data.data || [];
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },
};

export const usersApi = {
  getAll: async (): Promise<UserRecord[]> => {
    const response = await api.get<ApiResponse<UserRecord[]>>('/users');
    return response.data.data || [];
  },

  create: async (data: CreateUserDto): Promise<UserRecord> => {
    const response = await api.post<ApiResponse<UserRecord>>('/users', data);
    if (!response.data.success) throw new Error(response.data.message || 'Error creating user');
    return response.data.data!;
  },

  update: async (id: number, data: CreateUserDto): Promise<UserRecord> => {
    const response = await api.put<ApiResponse<UserRecord>>(`/users/${id}`, { ...data, id });
    if (!response.data.success) throw new Error(response.data.message || 'Error updating user');
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
