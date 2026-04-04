export interface User {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  roleId?: number;
  roleName?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  vendor: string;
  mrpManual: number;
  mrpTally: number;
  netQty: number;
  country: string;
  bestBefore: string;
  warranty: string;
  // For stock assignment
  rack?: string;
  shelf?: string;
  bin?: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  ownership: 'Self' | '3rd Party';
}

export interface PurchaseInvoice {
  id: string;
  supplierName: string;
  piNumber: string;
  piDate: string;
  sku: string;
  quantity: number;
  manufacturer: string;
  gst: number;
  country: string;
  status: 'Open' | 'Completed';
}

export interface SalesInvoice {
  id: string;
  customerName: string;
  siNumber: string;
  siDate: string;
  sku: string;
  quantity: number;
  status: 'Open' | 'Dispatched';
}

export interface Stock {
  sku: string;
  quantity: number;
  rack: string;
  shelf: string;
  bin: string;
}

export interface Activity {
  id: string;
  type: 'Inward' | 'Outward' | 'Stock Update';
  description: string;
  date: string;
}

// Re-export auth types
export type { LoginRequest, RegisterRequest, ChangePasswordRequest, AuthResponse, ApiError } from './auth';
