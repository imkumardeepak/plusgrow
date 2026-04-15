// API Types - matching backend ApiResponse format

// Generic API Response (matches backend Helpers/ApiResponse.cs)
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
  timestamp: string;
  pagination?: PaginationInfo;
}

// Pagination Info
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Paginated Response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query Params
export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============= ROLES =============
export interface Role {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateRoleDto extends Partial<CreateRoleDto> {}

// ============= USERS =============
export interface User {
  id: number;
  username: string;
  password_hash?: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_id: number | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  role?: Role;
}

export interface CreateUserDto {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  phone?: string;
  role_id?: number;
}

export interface UpdateUserDto extends Partial<Omit<CreateUserDto, 'password'>> {
  password?: string;
  is_active?: boolean;
}

// ============= AUTH =============
export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponseDto {
  token: string;
  user: User;
  success: boolean;
  message?: string;
}

// ============= PRODUCTS =============
export interface Product {
  id: number;
  name: string;
  sku: string | null;
  commodity_id: number | null;
  country_of_origin: string | null;
  mrp_quantity: string | null;
  factor: number | null;
  unit_type: string | null;
  ussp: number | null;
  mrp: number | null;
  best_before_months: number;
  manufacturer_id: number | null;
  created_at: string;
  commodity?: Commodity;
  manufacturer?: Manufacturer;
}

export interface CreateProductDto {
  name: string;
  sku?: string;
  commodity_id?: number;
  country_of_origin?: string;
  mrp_quantity?: string;
  factor?: number;
  unit_type?: string;
  ussp?: number;
  mrp?: number;
  best_before_months?: number;
  manufacturer_id?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

// ============= MANUFACTURERS =============
export interface Manufacturer {
  id: number;
  name: string;
  country: string | null;
  address: string | null;
  created_at: string;
}

export interface CreateManufacturerDto {
  name: string;
  country?: string;
  address?: string;
}

export interface UpdateManufacturerDto extends Partial<CreateManufacturerDto> {}

// ============= COMMODITIES =============
export interface Commodity {
  id: number;
  name: string;
}

export interface CreateCommodityDto {
  name: string;
}

export interface UpdateCommodityDto extends Partial<CreateCommodityDto> {}

// ============= IMPORTERS =============
export interface Importer {
  id: number;
  name: string;
  address: string | null;
  cin: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface CreateImporterDto {
  name: string;
  address?: string;
  cin?: string;
  phone?: string;
  email?: string;
}

export interface UpdateImporterDto extends Partial<CreateImporterDto> {}

// ============= ROLE PAGE ACCESS =============
export interface RolePageAccess {
  id: number;
  role_id: number;
  page_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  role?: Role;
}

export interface CreateRolePageAccessDto {
  role_id: number;
  page_key: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}
