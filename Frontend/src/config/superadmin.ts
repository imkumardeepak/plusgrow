/// <reference types="vite/client" />

// Superadmin Configuration
export const SUPERADMIN_CONFIG = {
  username: (import.meta as any).env?.VITE_SUPERADMIN_USER || 'superadmin',
  password: (import.meta as any).env?.VITE_SUPERADMIN_PASS || 'Super@Admin@2024',
  roleName: 'Superadmin',
  roleId: 1,
} as const;

// Role Constants
export const ROLES = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  WAREHOUSE_OPERATOR: 'Warehouse Operator',
  VIEWER: 'Viewer',
} as const;

// Page Keys for permission system
export const PAGE_KEYS = {
  DASHBOARD: 'dashboard',
  INWARD: 'inward',
  RECEIVING: 'receiving',
  PUTAWAY: 'putaway',
  OUTWARD: 'outward',
  PACKING: 'packing',
  DISPATCH: 'dispatch',
  IMPORTERS: 'importers',
  MANUFACTURERS: 'manufacturers',
  PARTIES: 'parties',
  COMMODITIES: 'commodities',
  PRODUCTS: 'products',
  STOCK_CHECK: 'stock-check',
  STOCK_MOVEMENT: 'stock-movement',
  WAREHOUSE_MAP: 'warehouse-map',
  PROFILE: 'profile',
} as const;

// All pages that Superadmin can access
export const SUPERADMIN_PAGES = Object.values(PAGE_KEYS);

// Check if user is Superadmin
export const isSuperadmin = (roleName?: string): boolean => {
  return roleName?.toLowerCase() === SUPERADMIN_CONFIG.roleName.toLowerCase();
};

export default SUPERADMIN_CONFIG;
