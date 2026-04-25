import React, { useState, memo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Package, Check, ArrowRight, MapPin, Box, CheckCircle2, Search, Filter, ClipboardList, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import confetti from "canvas-confetti";
import { useNavigate } from 'react-router-dom';

export const Packing = memo(function Packing() {
  const { salesInvoices, stock, products } = useWms();
  const [selectedSi, setSelectedSi] = useState('');
  const [pickedQty, setPickedQty] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();

  const openOrders = salesInvoices.filter(si => 
    si.status === 'Open' && 
    (si.siNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
     si.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     si.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const activeOrder = salesInvoices.find(si => si.id === selectedSi);
  
  const productDetails = activeOrder ? products.find(p => p.sku === activeOrder.sku) : null;
  const stockLocation = activeOrder ? stock.find(s => s.sku === activeOrder.sku) : null;

  const handlePick = () => {
    if (activeOrder) {
      const current = pickedQty[activeOrder.id] || 0;
      if (current < activeOrder.quantity) {
        const newQty = current + 1;
        setPickedQty(prev => ({ ...prev, [activeOrder.id]: newQty }));
        
        if (newQty === activeOrder.quantity) {
           confetti({
             particleCount: 100,
             spread: 70,
             origin: { y: 0.6 },
             colors: ["#10b981", "#4E8EA2", "#0A4174"]
           });
           toast.success(`Order ${activeOrder.siNumber} fully picked and ready!`, {
             icon: <CheckCircle2 className="w-5 h-5 text-success-500" />
           });
        } else {
           toast.success(`Picked 1 unit of ${activeOrder.sku}`, {
             icon: <Package className="w-4 h-4 text-brand-500" />
           });
        }
      } else {
        toast.error('All items picked for this order');
      }
    }
  };

  const isFullyPicked = activeOrder && (pickedQty[activeOrder.id] || 0) === activeOrder.quantity;

  // Calculate overall progress
  const allOpenOrders = salesInvoices.filter(si => si.status === 'Open');
  const overallProgress = allOpenOrders.length > 0 
    ? Math.round(allOpenOrders.reduce((acc, si) => acc + ((pickedQty[si.id] || 0) / si.quantity) * 100, 0) / allOpenOrders.length)
    : 100;

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Pro Max Edition */}
      <Card variant="glass" className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Daily Picking Progress
              </span>
              <Badge variant="success" size="sm" className="font-mono">
                {overallProgress}%
              </Badge>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success-500 to-success-400 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 border-l border-white/10 pl-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search orders, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* ================= LEFT PANEL: ORDER DIRECTORY ================= */}
        <Card variant="elevated" className="lg:col-span-4 flex flex-col overflow-hidden shadow-card h-full border-brand-500/10">
          <CardHeader className="py-2.5 px-4 border-b border-brand-500/10 bg-brand-500/5">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-brand-400 shadow-neon-cyan" />
                Pending Orders
              </CardTitle>
              <Badge variant="primary" size="sm" className="bg-brand-500/20 text-brand-400 border border-brand-500/30 font-bold">
                {openOrders.length}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {openOrders.map((si) => {
              const picked = pickedQty[si.id] || 0;
              const progress = (picked / si.quantity) * 100;
              const isSelected = selectedSi === si.id;

              return (
                <div
                  key={si.id}
                  onClick={() => setSelectedSi(si.id)}
                  className={cn(
                    "group relative cursor-pointer rounded-xl border-2 transition-all duration-200 animate-in slide-in-from-left-2",
                    "hover:-translate-y-0.5",
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10 shadow-neon-cyan/10 ring-1 ring-brand-500/20'
                      : 'border-white/5 bg-white/[0.02] hover:border-brand-500/30'
                  )}
                >
                  {isSelected && (
                    <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-500 rounded-r-full shadow-neon-cyan" />
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all", isSelected ? 'bg-brand-500/20 text-brand-400 border-brand-500/40 shadow-neon-cyan/20' : 'bg-white/5 text-neutral-500 border-white/10')}>
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-neutral-100 text-sm tracking-tight group-hover:text-brand-400 transition-colors">{si.siNumber}</span>
                        <p className="text-[10px] text-neutral-500 truncate font-bold uppercase tracking-widest">{si.customerName}</p>
                      </div>
                      <Badge variant={progress === 100 ? 'success' : 'warning'} size="sm" className="shrink-0 font-bold">
                        {progress === 100 ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={cn("h-1.5 rounded-full transition-all duration-500", progress === 100 ? 'bg-success-500 shadow-neon-green' : 'bg-brand-500 shadow-neon-cyan')} 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                      <span className="text-[10px] font-bold text-neutral-500 w-10 text-right font-mono">{picked}/{si.quantity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {openOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-success-400/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-success-400/20">
                  <CheckCircle2 className="w-10 h-10 text-success-500" />
                </div>
                <h3 className="text-xl font-heading font-bold text-white mb-1">
                  All Orders Picked!
                </h3>
                <p className="text-xs text-neutral-500 max-w-[200px]">
                  No open orders pending for fulfillment. Excellent work!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================= RIGHT PANEL: PACKING WORKSPACE ================= */}
        <Card variant="elevated" className="lg:col-span-8 flex flex-col overflow-hidden z-10 h-full border-brand-500/10">
          <CardHeader className="py-2.5 px-4 border-b border-brand-500/10 bg-brand-500/5 z-10">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Box className="w-4 h-4 text-brand-400 shadow-neon-cyan" />
                Fulfillment Canvas
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col relative overflow-hidden bg-brand-500/[0.01]">
            {/* Cybernetic Workspace Background */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(30,192,243,0.05)_1px,transparent_1px)] [background-size:24px:24px] pointer-events-none" />
 
            <div className="relative z-10 flex flex-col h-full overflow-y-auto p-6 scrollbar-thin">
              
              {!activeOrder ? (
                /* Empty State */
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-brand-500/5 ring-1 ring-brand-500/20 rounded-full flex items-center justify-center mb-5 relative group shadow-neon-cyan/5">
                    <ClipboardList className="w-10 h-10 text-brand-400 group-hover:text-brand-300 transition-colors duration-300 relative z-10 shadow-neon-cyan" />
                    <div className="absolute inset-0 border-[3px] border-brand-500/10 border-dashed rounded-full group-hover:border-brand-500/30 animate-[spin_15s_linear_infinite]" />
                  </div>
                  <h4 className="text-xl font-heading font-bold text-neutral-100 mb-2">
                    Awaiting Selection
                  </h4>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    Select a pending order from the directory to display its picking slip and stock warehouse locations.
                  </p>
                </div>
              ) : (
                /* Active Workspace */
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Floating Context Banner */}
                  <div className="mb-6 bg-brand-500/[0.03] backdrop-blur-md border border-brand-500/20 rounded-xl p-4 flex items-center gap-4 sticky top-0 z-20 glassmorphism shadow-neon-cyan/5">
                    <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center border border-brand-500/30 shrink-0">
                      <Package className="w-6 h-6 text-brand-400 shadow-neon-cyan" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-xl font-black text-neutral-100 tracking-tight shadow-neon-cyan/10">
                        {activeOrder.siNumber}
                      </h3>
                      <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest truncate">
                        Deliver to: <span className="text-brand-400">{activeOrder.customerName}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-brand-500/10 pl-4 py-2 pr-5 rounded-lg border border-brand-500/20 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-0.5">
                          Order Fulfillment
                        </p>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className={cn("text-3xl font-black leading-none shadow-neon-cyan/20", isFullyPicked ? "text-success-400" : "text-brand-400")}>
                            {pickedQty[activeOrder.id] || 0}
                          </span>
                          <span className="text-lg font-bold text-neutral-500 font-mono">
                            / {activeOrder.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational UI */}
                  <div className="w-full mt-2 space-y-6">
                    
                    {/* Digital Packing Slip */}
                    <div className="bg-brand-500/[0.03] rounded-2xl border border-brand-500/10 overflow-hidden glassmorphism shadow-neon-cyan/5">
                       <div className="px-6 py-4 border-b border-brand-500/10 flex items-center justify-between bg-brand-500/5">
                          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5 text-brand-400 shadow-neon-cyan"/> Digital Pick List
                          </span>
                          {isFullyPicked && <Badge variant="success" size="sm" className="animate-in fade-in font-bold">Verification Complete</Badge>}
                       </div>
                       
                       <div className="p-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                           <div className="bg-brand-500/10 p-4 rounded-xl border border-brand-500/20">
                             <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-1.5">Target SKU</p>
                             <Badge variant="primary" className="font-mono text-sm shadow-neon-cyan/10 bg-brand-500/20 text-brand-400 border-brand-500/30">{activeOrder.sku}</Badge>
                           </div>
                           <div className="bg-brand-500/5 p-4 rounded-xl border border-brand-500/10 lg:col-span-2">
                             <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-1.5">Product Title</p>
                             <p className="font-bold text-neutral-100 text-sm leading-tight">{productDetails?.title || 'Unknown Asset'}</p>
                           </div>
                           <div className="bg-brand-500/15 p-4 rounded-xl border border-brand-500/30 text-center relative overflow-hidden group">
                             <p className="text-[10px] text-brand-400 uppercase font-black tracking-widest mb-1.5 flex items-center justify-center gap-1 z-10 relative">
                               <MapPin className="w-3 h-3 animate-bounce" /> Location Code
                             </p>
                             <p className="font-mono text-xl font-black text-brand-400 z-10 relative shadow-neon-cyan">
                               {stockLocation ? `${stockLocation.rack}-${stockLocation.shelf}-${stockLocation.bin}` : 'Not Found'}
                             </p>
                             <div className="absolute -bottom-4 -right-4 text-brand-400 opacity-[0.03] z-0 transition-transform duration-700 group-hover:scale-125" style={{ transform: 'scale(3)' }}>
                                <MapPin className="w-full h-full" />
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-widest">
                            <span className="text-neutral-500">Pick Telemetry</span>
                            <span className={cn("shadow-neon-cyan/20", isFullyPicked ? "text-success-400" : "text-brand-400")}>
                               {Math.round(((pickedQty[activeOrder.id] || 0) / activeOrder.quantity) * 100)}%
                            </span>
                         </div>
                         <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden shadow-inner border border-white/5 p-0.5">
                           <div 
                             className={cn("h-full rounded-full transition-all duration-700", isFullyPicked ? "bg-gradient-to-r from-success-600 to-success-400 shadow-neon-green" : "bg-gradient-to-r from-brand-600 to-brand-400 shadow-neon-cyan")}
                             style={{ width: `${((pickedQty[activeOrder.id] || 0) / activeOrder.quantity) * 100}%` }}
                           />
                         </div>
                       </div>
                    </div>
                    
                    {/* Action Block */}
                    {!isFullyPicked ? (
                       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-brand-500/5 p-6 rounded-2xl border border-brand-500/20 animate-in fade-in glassmorphism shadow-neon-cyan/5">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                             <ScanLine className="w-6 h-6 text-brand-400 shadow-neon-cyan" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Manual Override</p>
                              <div className="text-sm font-bold text-neutral-300 mt-1">
                                Pending: <span className="font-black text-brand-400 mx-1 text-xl shadow-neon-cyan/20">{activeOrder.quantity - (pickedQty[activeOrder.id] || 0)}</span> units
                              </div>
                           </div>
                         </div>
                         
                         <Button onClick={handlePick} size="lg" className="h-14 px-8 text-base shadow-neon-cyan/20 animate-pulse-glow" leftIcon={<Package className="w-5 h-5" />}>
                           Log 1 Pick
                         </Button>
                       </div>
                    ) : (
                        <div className="bg-success-500/5 border border-success-500/30 p-8 rounded-2xl flex flex-col sm:flex-row items-center gap-6 animate-in zoom-in-95 duration-500 shadow-neon-green/10 glassmorphism">
                          <div className="bg-success-500/20 text-success-400 p-4 rounded-full shadow-neon-green/20 border border-success-500/30">
                            <Check className="w-8 h-8 stroke-[3] shadow-neon-green" />
                          </div>
                          <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-xl font-black text-success-400 mb-1 uppercase tracking-tighter">Fulfillment Verified!</h3>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed">All units have been safely secured from the warehouse location. This order is now ready for final packing and label generation.</p>
                          </div>
                          <Button size="lg" className="bg-success-600 hover:bg-success-500 text-white border-none shadow-neon-green/20 font-black px-8" rightIcon={<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />} onClick={() => navigate('/dispatch')}>
                            Transfer to Dispatch
                          </Button>
                        </div>
                    )}
                    
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default Packing;
