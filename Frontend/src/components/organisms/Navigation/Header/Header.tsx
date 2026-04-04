/**
 * Header Component
 * Top navigation bar with search, actions, and user menu
 */

import React, { useState } from "react";
import { cn } from "../../../../lib/utils";
import { Button } from "../../../atoms/Button";
import { Input } from "../../../atoms/Input";
import {
  Menu,
  Search,
  Bell,
  RefreshCw,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Crown,
} from "lucide-react";

export interface HeaderProps {
  /** Callback when mobile menu button is clicked */
  onMenuClick?: () => void;
  /** Callback when sidebar toggle is clicked */
  onSidebarToggle?: () => void;
  /** Current sidebar collapsed state */
  sidebarCollapsed?: boolean;
  /** Loading state for sync action */
  isSyncing?: boolean;
  /** Callback for sync action */
  onSync?: () => void;
  /** User name display */
  userName?: string;
  /** User role display */
  userRole?: string;
  /** User avatar initials */
  userInitials?: string;
  /** Notification count */
  notificationCount?: number;
  /** Callback for logout */
  onLogout?: () => void;
  /** Callback for profile click */
  onProfileClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function Header({
  onMenuClick,
  onSidebarToggle,
  sidebarCollapsed,
  isSyncing = false,
  onSync,
  userName = "John Doe",
  userRole = "Warehouse Manager",
  userInitials = "JD",
  notificationCount = 3,
  onLogout,
  onProfileClick,
  className,
}: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header
      className={cn(
        "h-16 lg:h-20 bg-white/80 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between gap-4",
        className
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          className="lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search */}
        <div className="hidden sm:flex flex-1 max-w-md">
          <Input
            placeholder="Search anything..."
            leftElement={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-neutral-50 border-neutral-200"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Sync Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          loading={isSyncing}
          leftIcon={<RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />}
          className="hidden sm:flex"
        >
          Sync
        </Button>

        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Notifications"
            className="relative"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white" />
            )}
          </Button>
        </div>

        {/* User Menu */}
        <div className="relative">
            <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-neutral-100 transition-colors"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-sm">
              {userInitials}
            </div>

            {/* User Info (hidden on mobile) */}
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-neutral-900 leading-none flex items-center gap-1.5">
                {userName}
                {userRole?.toLowerCase() === 'superadmin' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                    <Crown className="w-3 h-3" />
                    SUPER
                  </span>
                )}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">{userRole}</p>
            </div>

            <ChevronDown
              className={cn(
                "w-4 h-4 text-neutral-400 hidden md:block transition-transform duration-200",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-neutral-200 shadow-lg z-50 py-1 animate-scale-in">
                {/* User Header */}
                <div className="px-4 py-3 border-b border-neutral-100">
                  <p className="text-sm font-semibold text-neutral-900">
                    {userName}
                  </p>
                  <p className="text-xs text-neutral-500">{userRole}</p>
                </div>

                {/* Menu Items */}
                <nav className="py-1">
                  <button 
                    onClick={() => {
                      setUserMenuOpen(false);
                      onProfileClick?.();
                    }} 
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-neutral-400" />
                    Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                    <Settings className="w-4 h-4 text-neutral-400" />
                    Settings
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                    <HelpCircle className="w-4 h-4 text-neutral-400" />
                    Help & Support
                  </button>
                </nav>

                {/* Divider */}
                <div className="border-t border-neutral-100 my-1" />

                {/* Logout */}
                <button 
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout?.();
                  }} 
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

Header.displayName = "Header";
