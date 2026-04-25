import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useWms } from '../../context/WmsContext';
import { 
  LayoutDashboard, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Users, 
  Package, 
  ClipboardCheck, 
  RefreshCw,
  Box,
  Tags,
  Truck,
  CheckSquare,
  Move,
  Bell,
  Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const SidebarItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group mb-1 cursor-pointer",
      isActive
        ? "bg-gradient-to-r from-brand-400 to-brand-600 text-slate-950 shadow-brand border border-transparent"
        : "text-sidebar-text hover:bg-white/8 hover:text-sidebar-text-hover border border-transparent"
    )}
  >
    {({ isActive }) => (
      <>
        <Icon className={cn(
          "w-4 h-4 transition-all duration-200 shrink-0",
          isActive
            ? "text-slate-950"
            : "group-hover:text-brand-300 text-neutral-500"
        )} />
        <span className={cn(
          "truncate",
          isActive ? "font-bold text-slate-950" : "font-medium"
        )}>
          {label}
        </span>
      </>
    )}
  </NavLink>
);

export const Layout = () => {
  const { refreshData, isLoading } = useWms();

  return (
    <div className="flex overflow-hidden" style={{ height: '100dvh', background: 'linear-gradient(180deg, #0b1322 0%, #09111f 50%, #060d19 100%)' }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col h-full z-20 relative shrink-0"
        style={{
          background: 'linear-gradient(180deg, #111b2d 0%, #0b1322 100%)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo Header */}
        <div className="p-5 flex flex-col items-center justify-center shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 w-full justify-center">
            <svg viewBox="0 0 66 68" className="w-7 h-7 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M33 0 L43 12 H23 Z" fill="#1ec0f3" />
              <rect x="28" y="16" width="10" height="10" fill="#11a7df" />
              <rect x="28" y="30" width="10" height="10" fill="#0a8bbf" />
              <rect x="28" y="44" width="10" height="10" fill="#0a6994" />
              <rect x="28" y="58" width="10" height="10" fill="#0c4e70" />
              <rect x="0" y="30" width="10" height="10" fill="#0c4e70" />
              <rect x="14" y="30" width="10" height="10" fill="#0a6994" />
              <rect x="42" y="30" width="10" height="10" fill="#0a6994" />
              <rect x="56" y="30" width="10" height="10" fill="#0c4e70" />
            </svg>
            <div className="flex flex-col">
              <div className="flex items-baseline leading-none">
                <span className="text-xl font-heading font-bold tracking-wide text-white">PLUS</span>
                <span className="text-xl font-light tracking-wide text-brand-300">GROW</span>
              </div>
              <span className="text-[0.45rem] font-medium tracking-[0.14em] text-neutral-500 mt-0.5">
                WE ADD VALUE TO YOUR GROWTH
              </span>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-5 px-3 custom-scrollbar">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />

          <div className="pt-3 pb-1.5 px-3 text-[0.62rem] font-bold text-neutral-500 uppercase tracking-[0.18em]">
            Inward
          </div>
          <SidebarItem to="/inward" icon={ArrowDownToLine} label="Pull Inwards" />
          <SidebarItem to="/sticker" icon={Tags} label="Sticker Generation" />
          <SidebarItem to="/receiving" icon={CheckSquare} label="Receiving & Scan" />
          <SidebarItem to="/putaway" icon={Box} label="Put Away" />

          <div className="pt-3 pb-1.5 px-3 text-[0.62rem] font-bold text-neutral-500 uppercase tracking-[0.18em]">
            Outward
          </div>
          <SidebarItem to="/outward" icon={ArrowUpFromLine} label="Pull Sales" />
          <SidebarItem to="/packing" icon={Package} label="Packing Slip" />
          <SidebarItem to="/dispatch" icon={Truck} label="Dispatch" />

          <div className="pt-3 pb-1.5 px-3 text-[0.62rem] font-bold text-neutral-500 uppercase tracking-[0.18em]">
            Master Data
          </div>
          <SidebarItem to="/mcd" icon={Users} label="Customers" />
          <SidebarItem to="/mpd" icon={Package} label="Products" />

          <div className="pt-3 pb-1.5 px-3 text-[0.62rem] font-bold text-neutral-500 uppercase tracking-[0.18em]">
            Inventory
          </div>
          <SidebarItem to="/stock-check" icon={ClipboardCheck} label="Stock Check" />
          <SidebarItem to="/stock-movement" icon={Move} label="Stock Movement" />
        </div>

        {/* Sidebar Bottom Glow */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(to top, rgba(17,167,223,0.06), transparent)' }} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header
          className="h-16 z-10 sticky top-0 px-5 flex items-center justify-between transition-all duration-300 shrink-0"
          style={{
            background: 'rgba(11,19,34,0.88)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Search */}
          <div
            className="flex items-center rounded-full px-3 py-1.5 w-64 md:w-80 transition-all duration-200 focus-within:ring-1 focus-within:ring-brand-400/40"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <Search className="w-3.5 h-3.5 text-neutral-500 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none w-full text-xs placeholder:text-neutral-500 font-medium text-white"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
              className="gap-1.5 rounded-full h-8 text-xs px-3 font-medium"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'rgba(202,216,229,0.9)',
              }}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading ? "animate-spin text-brand-300" : "text-neutral-500")} />
              <span>Sync</span>
            </Button>

            <div className="flex items-center gap-3 pl-4" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                className="relative p-1.5 text-neutral-500 hover:text-brand-300 transition-colors rounded-full cursor-pointer"
                style={{ ':hover': { background: 'rgba(255,255,255,0.06)' } } as any}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-danger-400/100 rounded-full" style={{ border: '1.5px solid #0b1322' }} />
              </button>

              <div className="flex items-center gap-2 cursor-pointer group">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-brand-200 font-bold text-xs transition-all duration-200"
                  style={{ background: 'rgba(17,167,223,0.15)', border: '1px solid rgba(30,192,243,0.2)' }}
                >
                  JD
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-white leading-none">John Doe</p>
                  <p className="text-[0.65rem] text-neutral-500 mt-0.5 font-medium">Warehouse Manager</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-transparent">
          <div className="w-full h-full p-4 sm:p-5 flex flex-col min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
