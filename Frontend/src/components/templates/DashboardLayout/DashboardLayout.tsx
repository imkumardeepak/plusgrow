/**
 * DashboardLayout Template
 * Main application layout with sidebar, header, and content area
 */

import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { cn } from "../../../lib/utils";
import { Sidebar } from "../../organisms/Navigation/Sidebar/Sidebar";
import { Header } from "../../organisms/Navigation/Header/Header";
import { Breadcrumbs, BreadcrumbItem } from "../../organisms/Navigation/Breadcrumbs/Breadcrumbs";
import { useWms } from "../../../context/WmsContext";
import { useAuth } from "../../../context/AuthContext";

export interface DashboardLayoutProps {
  /** Custom breadcrumbs (auto-generated if not provided) */
  breadcrumbs?: BreadcrumbItem[];
  /** Whether to show breadcrumbs */
  showBreadcrumbs?: boolean;
  /** Page title (shown if breadcrumbs not provided) */
  pageTitle?: string;
  /** Page description */
  pageDescription?: string;
  /** Additional CSS classes for main content */
  contentClassName?: string;
}

export function DashboardLayout({
  breadcrumbs,
  showBreadcrumbs = true,
  pageTitle,
  pageDescription,
  contentClassName,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { refreshData, isLoading } = useWms();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="theme-shell min-h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 flex min-w-0 flex-col transition-all duration-300 h-screen overflow-hidden",
          sidebarCollapsed ? "lg:ml-0" : "lg:ml-0"
        )}
      >
        {/* Header */}
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
          onSync={refreshData}
          isSyncing={isLoading}
          userName={user?.fullName || 'User'}
          userRole={user?.roleName || 'User'}
          userInitials={user ? getInitials(user.fullName) : 'U'}
          onLogout={handleLogout}
          onProfileClick={() => navigate('/profile')}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className={cn("p-3 lg:p-4", contentClassName)}>
            <div className="mx-auto max-w-[1680px]">
              {/* Breadcrumbs */}
              {showBreadcrumbs && (
                <div className="mb-3">
                  <Breadcrumbs items={breadcrumbs} />
                </div>
              )}

              {/* Page Header */}
              {(pageTitle || pageDescription) && (
                <div className="theme-panel mb-4 px-4 py-4">
                  {pageTitle && (
                    <h1 className="text-xl lg:text-2xl font-heading font-bold text-white">
                      {pageTitle}
                    </h1>
                  )}
                  {pageDescription && (
                    <p className="mt-1 text-xs text-neutral-300">{pageDescription}</p>
                  )}
                </div>
              )}


              {/* Page Content */}
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

DashboardLayout.displayName = "DashboardLayout";
