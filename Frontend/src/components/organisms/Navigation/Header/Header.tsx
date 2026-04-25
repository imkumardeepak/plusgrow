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
        "sticky top-0 z-30 mx-4 mt-4 flex h-16 items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,33,52,0.88)_0%,rgba(15,24,40,0.92)_100%)] px-4 backdrop-blur-xl shadow-card lg:mx-6 lg:mt-5 lg:h-20 lg:px-6",
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
            className="theme-input"
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
            className="flex items-center gap-3 rounded-full border border-transparent p-1.5 transition-colors hover:border-white/10 hover:bg-white/6"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div className="theme-glow flex h-9 w-9 items-center justify-center rounded-full border border-brand-300/30 bg-gradient-to-br from-brand-300 to-brand-500 text-sm font-bold text-neutral-950">
              {userInitials}
            </div>

            {/* User Info (hidden on mobile) */}
            <div className="hidden md:block text-left">
              <p className="flex items-center gap-1.5 text-sm font-semibold leading-none text-white">
                {userName}
                {userRole?.toLowerCase() === 'superadmin' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                    <Crown className="w-3 h-3" />
                    SUPER
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-neutral-300">{userRole}</p>
            </div>

            <ChevronDown
              className={cn(
                "hidden w-4 h-4 text-neutral-300 md:block transition-transform duration-200",
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
              <div className="animate-scale-in absolute right-0 top-full z-50 mt-3 w-56 rounded-3xl border border-white/10 bg-neutral-900/96 py-1 shadow-float backdrop-blur-xl">
                {/* User Header */}
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    {userName}
                  </p>
                  <p className="text-xs text-neutral-300">{userRole}</p>
                </div>

                {/* Menu Items */}
                <nav className="py-1">
                  <button 
                    onClick={() => {
                      setUserMenuOpen(false);
                      onProfileClick?.();
                    }} 
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-neutral-100 transition-colors hover:bg-white/6"
                  >
                    <User className="w-4 h-4 text-neutral-300" />
                    Profile
                  </button>
                  <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-neutral-100 transition-colors hover:bg-white/6">
                    <Settings className="w-4 h-4 text-neutral-300" />
                    Settings
                  </button>
                  <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-neutral-100 transition-colors hover:bg-white/6">
                    <HelpCircle className="w-4 h-4 text-neutral-300" />
                    Help & Support
                  </button>
                </nav>

                {/* Divider */}
                <div className="my-1 border-t border-white/10" />

                {/* Logout */}
                <button 
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout?.();
                  }} 
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-danger-300 transition-colors hover:bg-danger-500/10"
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
