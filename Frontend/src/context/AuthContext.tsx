import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/api';
import { toast } from '../lib/toast';

// Types matching the API response (snake_case)
interface ApiUser {
  id: number;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_id: number | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  role?: {
    id: number;
    name: string;
  };
}

interface LoginDto {
  username: string;
  password: string;
}

interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<{ success: boolean; message?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  changePassword: (data: any) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        const storedUser = authService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser as ApiUser);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginDto): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await authService.login(credentials);
      if (response?.success && response.data) {
        setUser(response.data.user);
        toast.success(`Welcome back, ${response.data.user.full_name}!`);
        return { success: true };
      }
      return { success: false, message: response?.message || 'Login failed' };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    }
  };

  const register = async (data: any): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await authService.register(data);
      if (response?.success) {
        toast.success('Registration successful! Please login.');
        return { success: true };
      }
      return { success: false, message: response?.message || 'Registration failed' };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    toast.info('You have been logged out');
    navigate('/login');
  };

  const changePassword = async (data: any): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await authService.changePassword(data.currentPassword, data.newPassword);
      if (response?.success) {
        toast.success('Password changed successfully');
        return { success: true };
      }
      return { success: false, message: response?.message || 'Failed to change password' };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      return { success: false, message };
    }
  };

  const refreshUser = async () => {
    // Refresh user data if needed
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

