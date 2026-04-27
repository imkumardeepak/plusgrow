/**
 * Sidebar Component
 * Collapsible navigation sidebar with grouped menu items
 */

import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../../../lib/utils";
import { Button } from "../../../atoms/Button";
import { Logo } from "../../../atoms/Logo";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  ClipboardCheck,
  Tags,
  Truck,
  Move,
  Box,
  Warehouse,
  Map,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LucideIcon,
  User,
  Building,
  Layers,
  Factory,
  MapPin,
} from "lucide-react";

// Navigation structure
export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number | string;
  badgeVariant?: "default" | "primary" | "success" | "warning" | "danger";
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  hasSubItems?: boolean;
}

export const navigationGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    hasSubItems: true,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/" },
    ],
  },
  {
    id: "master",
    label: "Master Data",
    hasSubItems: true,
    items: [
      { id: "importers", label: "Importers", icon: Building, href: "/importers" },
      { id: "manufacturers", label: "Manufacturers", icon: Factory, href: "/manufacturers" },
      { id: "commodities", label: "Commodities", icon: Layers, href: "/commodities" },
      { id: "bins", label: "Bin Master", icon: Box, href: "/bins" },
      { id: "locations", label: "Location Master", icon: MapPin, href: "/locations" },
      { id: "mpd", label: "Products", icon: Box, href: "/mpd" },
    ],
  },
  {
    id: "inward",
    label: "Inward Operations",
    hasSubItems: true,
    items: [
      { id: "inward", label: "Purchase Invoices", icon: ArrowDownToLine, href: "/inward" },
      { id: "sticker", label: "Sticker Generation", icon: Tags, href: "/sticker" },
      { id: "putaway", label: "Put Away", icon: Warehouse, href: "/putaway" },
    ],
  },
  {
    id: "outward",
    label: "Outward Operations",
    hasSubItems: true,
    items: [
      { id: "outward", label: "Sales Orders", icon: ArrowUpFromLine, href: "/outward" },
      { id: "packing", label: "Picking & Packing", icon: Package, href: "/packing" },
      { id: "dispatch", label: "Dispatch", icon: Truck, href: "/dispatch" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    hasSubItems: true,
    items: [
      { id: "stock-check", label: "Stock Check", icon: ClipboardCheck, href: "/stock-check" },
      { id: "stock-movement", label: "Stock Movement", icon: Move, href: "/stock-movement" },
      { id: "warehouse-map", label: "Warehouse Map", icon: Map, href: "/warehouse-map" },
    ],
  },
  {
    id: "account",
    label: "Account",
    hasSubItems: false,
    items: [
      { id: "profile", label: "My Profile", icon: User, href: "/profile" },
    ],
  },
];

export interface SidebarProps {
  /** Whether sidebar is collapsed */
  collapsed?: boolean;
  /** Mobile menu open state */
  mobileOpen?: boolean;
  /** Callback when mobile menu closes */
  onMobileClose?: () => void;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onMobileClose,
  onCollapseChange,
}: SidebarProps) {
  const location = useLocation();
  
  const getInitialExpandedGroups = () => {
    const currentPath = location.pathname;
    const initial: Record<string, boolean> = {};
    
    navigationGroups.forEach(group => {
      const isCurrentGroup = group.items.some(item => item.href === currentPath);
      initial[group.id] = isCurrentGroup || group.id === 'overview';
    });
    
    return initial;
  };
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(getInitialExpandedGroups);

  useEffect(() => {
    const currentPath = location.pathname;
    
    setExpandedGroups(prev => {
      const newState: Record<string, boolean> = {};
      
      navigationGroups.forEach(group => {
        const isCurrentGroup = group.items.some(item => item.href === currentPath);
        newState[group.id] = isCurrentGroup;
      });
      
      return newState;
    });
  }, [location.pathname]);

  const handleCollapseToggle = () => {
    onCollapseChange?.(!collapsed);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r transition-all duration-300 ease-out lg:static",
          collapsed ? "w-20" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ backgroundColor: 'var(--color-sidebar-bg)', borderColor: 'var(--color-sidebar-border)' }}
        aria-label="Main navigation"
      >
        {/* Logo Section */}
        <div
          className={cn(
            "flex items-center justify-center border-b border-white/8 transition-all duration-300",
            collapsed ? "h-14" : "h-16"
          )}
        >
          <div className={cn("rounded-2xl px-3 py-2", !collapsed && "bg-white/[0.04]")}>
            <Logo width={180} height={180} className={cn("h-auto", collapsed ? "w-9" : "w-36")} />
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden absolute right-4 top-5 p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-sidebar-text)' }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden py-4">
          {navigationGroups.map((group) => (
            <div key={group.id} className={cn("mb-2", collapsed && "mb-4")}>
              {!collapsed && (
                <div className="flex items-center justify-between px-3 py-1">
                  <h3
                    className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                    style={{ color: 'var(--color-sidebar-text)' }}
                  >
                    {group.label}
                  </h3>
                  {group.hasSubItems && group.items.length > 1 && (
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="p-1 rounded transition-colors"
                      style={{ color: 'var(--color-sidebar-text)' }}
                    >
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          expandedGroups[group.id] && "rotate-180"
                        )}
                      />
                    </button>
                  )}
                </div>
              )}
              <ul className={cn(
                "space-y-0.5 px-2 transition-all duration-300",
                !collapsed && !expandedGroups[group.id] && "hidden"
              )}>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.href}
                        onClick={onMobileClose}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "theme-glow text-white"
                            : "hover:text-white",
                          collapsed && "justify-center px-2"
                        )}
                        style={
                          isActive
                            ? { background: 'linear-gradient(90deg, #17b9ec 0%, #0a8bbf 100%)' }
                            : { color: 'var(--color-sidebar-text)' }
                        }
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon
                          className={cn(
                            "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                            isActive ? "text-white" : "group-hover:text-white",
                            collapsed && "w-5.5 h-5.5"
                          )}
                          style={isActive ? { color: 'white' } : { color: 'var(--color-sidebar-text)' }}
                        />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                              className={cn(
                                  "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
                                  item.badgeVariant === "success" && "bg-success-900/50 text-success-400",
                                  item.badgeVariant === "warning" && "bg-warning-900/50 text-warning-400",
                                  item.badgeVariant === "danger" && "bg-danger-900/50 text-danger-400",
                                  (!item.badgeVariant || item.badgeVariant === "default") &&
                                    "text-neutral-400",
                                  item.badgeVariant === "primary" && "bg-brand-900/50 text-brand-400"
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                        {/* Tooltip for collapsed state */}
                        {collapsed && (
                          <span className="invisible absolute left-full z-50 ml-2 whitespace-nowrap rounded-full border border-white/10 bg-neutral-900 px-3 py-1 text-xs text-white opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                            {item.label}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle (Desktop only) */}
        <div className="hidden border-t border-white/8 p-2 lg:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseToggle}
            className={cn(
              "w-full justify-center text-neutral-200 hover:bg-white/8",
              !collapsed && "justify-between"
            )}
            leftIcon={collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          >
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>
    </>
  );
}

Sidebar.displayName = "Sidebar";
