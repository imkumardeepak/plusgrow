import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSuperadmin, SUPERADMIN_PAGES, PAGE_KEYS } from '../config/superadmin';

/**
 * Hook for role-based permission checking
 * Superadmin has access to all pages by default
 */
export function usePermission() {
  const { user } = useAuth();

  const isUserSuperadmin = useCallback((): boolean => {
    return isSuperadmin(user?.roleName);
  }, [user?.roleName]);

  /**
   * Check if current user can access a specific page
   * Superadmin always has access to all pages
   */
  const canAccessPage = useCallback((pageKey: string): boolean => {
    // Superadmin has access to everything
    if (isUserSuperadmin()) {
      return true;
    }

    // For non-superadmins, you can implement database-driven permissions
    // For now, return true for all authenticated users (adjust as needed)
    return true;
  }, [isUserSuperadmin]);

  /**
   * Check if current user can perform a specific action
   * Superadmin has all permissions
   */
  const canPerformAction = useCallback((
    _action: 'create' | 'edit' | 'delete' | 'view'
  ): boolean => {
    // Superadmin has all permissions
    if (isUserSuperadmin()) {
      return true;
    }

    // For non-superadmins, implement your permission logic here
    // Example: return userPermissions.includes(action);
    return true;
  }, [isUserSuperadmin]);

  /**
   * Get list of pages the current user can access
   */
  const accessiblePages = useMemo((): string[] => {
    if (isUserSuperadmin()) {
      return SUPERADMIN_PAGES;
    }

    // For non-superadmins, return based on their role permissions
    // This can be fetched from backend and cached
    return SUPERADMIN_PAGES; // Default to all pages for authenticated users
  }, [isUserSuperadmin]);

  /**
   * Check if user has any of the specified roles
   */
  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user?.roleName) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.some(role => 
      user.roleName?.toLowerCase() === role.toLowerCase()
    );
  }, [user?.roleName]);

  return {
    isSuperadmin: isUserSuperadmin(),
    canAccessPage,
    canPerformAction,
    accessiblePages,
    hasRole,
  };
}

/**
 * Component wrapper for page-level access control
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole?: string | string[]
) {
  return function PermissionWrapper(props: P) {
    const { hasRole } = usePermission();
    
    if (requiredRole && !hasRole(requiredRole)) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Access Denied</h2>
            <p className="text-neutral-500">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

export default usePermission;
