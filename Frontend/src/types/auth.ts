// User type for authentication
interface AuthUser {
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

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  roleId?: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
  user?: AuthUser;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
