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
        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 group mb-1",
        isActive 
          ? "bg-primary-50 text-primary-600 shadow-sm border border-primary-100" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 transparent border border-transparent"
      )}
    >
    {({ isActive }) => (
      <>
        <Icon className={cn(
          "w-4 h-4 transition-transform duration-300",
          isActive ? "scale-110 text-primary-600" : "group-hover:scale-110 text-slate-400 group-hover:text-slate-600"
        )} />
        <span className={cn(isActive ? "font-semibold" : "")}>{label}</span>
      </>
    )}
  </NavLink>
);

export const Layout = () => {
  const { refreshData, isLoading } = useWms();

  return (
    <div className="flex bg-slate-50 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar - Slimmer w-60 instead of w-64 */}
      <aside className="w-60 bg-white text-slate-900 flex flex-col h-full shadow-card z-20 relative border-r border-slate-200 shrink-0">
        {/* Adjusted padding in header to save vertical space */}
        <div className="p-5 flex flex-col items-center justify-center border-b border-slate-100">
          <div className="flex items-center gap-3 w-full justify-center">
            {/* Kept svg logo exactly the same but scaled down slightly */}
            <svg viewBox="0 0 66 68" className="w-7 h-7 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M33 0 L43 12 H23 Z" fill="#0A4174" />
              <rect x="28" y="16" width="10" height="10" fill="#4E8EA2" />
              <rect x="28" y="30" width="10" height="10" fill="#6EA2B3" />
              <rect x="28" y="44" width="10" height="10" fill="#7BBDE8" />
              <rect x="28" y="58" width="10" height="10" fill="#BDD8E9" />
              <rect x="0" y="30" width="10" height="10" fill="#BDD8E9" />
              <rect x="14" y="30" width="10" height="10" fill="#7BBDE8" />
              <rect x="42" y="30" width="10" height="10" fill="#7BBDE8" />
              <rect x="56" y="30" width="10" height="10" fill="#BDD8E9" />
            </svg>
            <div className="flex flex-col">
              <div className="flex items-baseline leading-none">
                <span className="text-xl font-heading font-bold tracking-wide text-slate-900">PLUS</span>
                <span className="text-xl font-light tracking-wide text-primary-600">GROW</span>
              </div>
              <span className="text-[0.45rem] font-medium tracking-[0.14em] text-slate-500 mt-0.5">
                WE ADD VALUE TO YOUR GROWTH
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-5 px-3 custom-scrollbar">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
          
          <div className="pt-3 pb-1.5 px-3 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
            Inward
          </div>
          <SidebarItem to="/inward" icon={ArrowDownToLine} label="Pull Inwards" />
          <SidebarItem to="/sticker" icon={Tags} label="Sticker Generation" />
          <SidebarItem to="/receiving" icon={CheckSquare} label="Receiving & Scan" />
          <SidebarItem to="/putaway" icon={Box} label="Put Away" />

          <div className="pt-3 pb-1.5 px-3 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
            Outward
          </div>
          <SidebarItem to="/outward" icon={ArrowUpFromLine} label="Pull Sales" />
          <SidebarItem to="/packing" icon={Package} label="Packing Slip" />
          <SidebarItem to="/dispatch" icon={Truck} label="Dispatch" />

          <div className="pt-3 pb-1.5 px-3 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
            Master Data
          </div>
          <SidebarItem to="/mcd" icon={Users} label="Customers" />
          <SidebarItem to="/mpd" icon={Package} label="Products" />

          <div className="pt-3 pb-1.5 px-3 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
            Inventory
          </div>
          <SidebarItem to="/stock-check" icon={ClipboardCheck} label="Stock Check" />
          <SidebarItem to="/stock-movement" icon={Move} label="Stock Movement" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header - Slimmer h-16 (from h-20) and reduced default px-8 to px-5 */}
        <header className="h-16 glassmorphism z-10 sticky top-0 px-5 flex items-center justify-between transition-all duration-300 shrink-0">
          <div className="flex items-center bg-white/60 rounded-full px-3 py-1.5 w-64 md:w-80 border border-slate-200/50 focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:bg-white transition-all duration-300">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-400 font-medium text-slate-700"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData} 
              disabled={isLoading}
              className="gap-1.5 rounded-full border-slate-200/50 bg-white/50 hover:bg-white shadow-sm text-slate-700 h-8 text-xs px-3"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading ? "animate-spin text-primary-600" : "text-slate-600")} />
              <span className="font-medium">Sync</span>
            </Button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200/60">
              <button className="relative p-1.5 text-slate-500 hover:text-primary-600 transition-colors rounded-full hover:bg-primary-50">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-danger-500 rounded-full border border-white"></span>
              </button>
              
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="w-8 h-8 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-primary-700 font-bold group-hover:shadow-sm text-xs transition-all duration-300">
                  JD
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-slate-900 leading-none">John Doe</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5 font-medium">Warehouse Manager</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Container - flexible min-h-0 so pages can scale properly */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-transparent">
          <div className="w-full h-full p-4 sm:p-5 flex flex-col min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
