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
            <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success-400 to-success-500 rounded-full transition-all duration-700"
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
        <Card variant="elevated" className="lg:col-span-4 flex flex-col overflow-hidden shadow-card h-full">
          <CardHeader className="py-2.5 px-4 border-b border-white/8 bg-white/[0.04]">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-brand-500" />
                Pending Orders
              </CardTitle>
              <Badge variant="primary" size="sm" className="bg-brand-400/15 text-brand-300 border-brand-400/25">
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
                    "hover:shadow-float hover:-translate-y-0.5",
                    isSelected
                      ? 'border-brand-400 bg-brand-400/10 shadow-float ring-1 ring-brand-400/20'
                      : 'border-white/10 bg-white/[0.04] hover:border-brand-400/40'
                  )}
                >
                  {isSelected && (
                    <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-400/100 rounded-r-full" />
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isSelected ? 'bg-brand-400/15 text-brand-300' : 'bg-white/[0.04] text-neutral-500')}>
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-white text-sm tracking-tight">{si.siNumber}</span>
                        <p className="text-xs text-neutral-500 truncate">{si.customerName}</p>
                      </div>
                      <Badge variant={progress === 100 ? 'success' : 'warning'} size="sm" className="shrink-0">
                        {progress === 100 ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div 
                          className={cn("h-1.5 rounded-full transition-all duration-500", progress === 100 ? 'bg-success-400/100' : 'bg-brand-400/100')} 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                      <span className="text-xs font-medium text-neutral-400 w-10 text-right">{picked}/{si.quantity}</span>
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
        <Card variant="elevated" className="lg:col-span-8 flex flex-col overflow-hidden z-10 h-full">
          <CardHeader className="py-2.5 px-4 border-b border-white/8 bg-white/[0.04] z-10">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Box className="w-4 h-4 text-neutral-400" />
                Fulfillment Canvas
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
            {/* Dotted Workspace Background */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full overflow-y-auto p-6 scrollbar-thin">
              
              {!activeOrder ? (
                /* Empty State */
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-white/[0.04] ring-1 ring-white/10 rounded-full flex items-center justify-center mb-5 relative group">
                    <ClipboardList className="w-10 h-10 text-neutral-300 group-hover:text-brand-400 transition-colors duration-300 relative z-10" />
                    <div className="absolute inset-0 border-[3px] border-white/10 border-dashed rounded-full group-hover:border-brand-400/30 animate-[spin_15s_linear_infinite]" />
                  </div>
                  <h4 className="text-xl font-heading font-bold text-white mb-2">
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
                  <div className="mb-6 bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4 sticky top-0 z-20">
                    <div className="w-12 h-12 bg-brand-400/15 rounded-xl flex items-center justify-center ring-1 ring-brand-400/20 shrink-0">
                      <Package className="w-6 h-6 text-brand-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-xl font-bold text-white tracking-tight">
                        {activeOrder.siNumber}
                      </h3>
                      <p className="text-sm text-neutral-500 truncate font-medium">
                        Deliver to: <span className="text-white">{activeOrder.customerName}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/[0.04] pl-4 py-2 pr-5 rounded-lg border border-white/10 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-0.5">
                          Order Fulfillment
                        </p>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className={cn("text-3xl font-bold leading-none", isFullyPicked ? "text-success-300" : "text-brand-300")}>
                            {pickedQty[activeOrder.id] || 0}
                          </span>
                          <span className="text-lg font-medium text-neutral-400">
                            / {activeOrder.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational UI */}
                  <div className="w-full mt-2 space-y-6">
                    
                    {/* Digital Packing Slip */}
                    <div className="bg-white/[0.04] rounded-2xl border border-white/10 overflow-hidden">
                       <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <span className="text-sm font-semibold text-neutral-300 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-neutral-500"/> Digital Pick List</span>
                          {isFullyPicked && <Badge variant="success" size="sm" className="animate-in fade-in">Verification Complete</Badge>}
                       </div>
                       
                       <div className="p-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                           <div className="bg-white/[0.04] p-4 rounded-xl border border-white/8">
                             <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5">Target SKU</p>
                             <Badge variant="primary" className="font-mono text-sm shadow-card">{activeOrder.sku}</Badge>
                           </div>
                           <div className="bg-white/[0.04] p-4 rounded-xl border border-white/8 lg:col-span-2">
                             <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5">Product Title</p>
                             <p className="font-bold text-white text-sm">{productDetails?.title || 'Unknown Asset'}</p>
                           </div>
                           <div className="bg-brand-400/10 p-4 rounded-xl border border-brand-400/20 text-center relative overflow-hidden">
                             <p className="text-[10px] text-brand-300 uppercase font-bold tracking-wider mb-1.5 flex items-center justify-center gap-1 z-10 relative">
                               <MapPin className="w-3 h-3" /> Location Code
                             </p>
                             <p className="font-mono text-xl font-black text-brand-300 z-10 relative">
                               {stockLocation ? `${stockLocation.rack}-${stockLocation.shelf}-${stockLocation.bin}` : 'Not Found'}
                             </p>
                             <div className="absolute -bottom-4 -right-4 text-brand-500 opacity-5 z-0" style={{ transform: 'scale(3)' }}>
                                <MapPin className="w-full h-full" />
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex items-center justify-between mb-3 text-sm font-bold">
                            <span className="text-neutral-500 uppercase tracking-widest text-xs">Progress Bar</span>
                            <span className={isFullyPicked ? "text-success-400" : "text-brand-400"}>
                               {Math.round(((pickedQty[activeOrder.id] || 0) / activeOrder.quantity) * 100)}%
                            </span>
                         </div>
                         <div className="w-full bg-white/[0.04] rounded-full h-4 overflow-hidden">
                           <div 
                             className={cn("h-full rounded-full transition-all duration-700", isFullyPicked ? "bg-gradient-to-r from-success-400 to-success-500" : "bg-gradient-to-r from-brand-400 to-brand-500")}
                             style={{ width: `${((pickedQty[activeOrder.id] || 0) / activeOrder.quantity) * 100}%` }}
                           />
                         </div>
                       </div>
                    </div>
                    
                    {/* Action Block */}
                    {!isFullyPicked ? (
                       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.04] p-6 rounded-2xl border border-white/10 animate-in fade-in">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                             <ScanLine className="w-6 h-6 text-neutral-500" />
                           </div>
                           <div>
                              <p className="text-sm font-bold text-white">Scan or Pick manually</p>
                              <div className="text-sm font-medium text-neutral-500 mt-0.5">
                                Pending: <span className="font-bold text-white mx-1 text-lg">{activeOrder.quantity - (pickedQty[activeOrder.id] || 0)}</span> units
                              </div>
                           </div>
                         </div>
                         
                         <Button onClick={handlePick} size="lg" className="h-14 px-8 text-base shadow-lg animate-pulse" leftIcon={<Package className="w-5 h-5" />}>
                           Log 1 Pick
                         </Button>
                       </div>
                    ) : (
                       <div className="bg-success-400/10 border-2 border-success-400/25 p-8 rounded-2xl flex flex-col sm:flex-row items-center gap-6 animate-in zoom-in-95 duration-500">
                         <div className="bg-success-400/100 text-white p-4 rounded-full shadow-lg shadow-success-500/30">
                           <Check className="w-8 h-8" />
                         </div>
                         <div className="flex-1 text-center sm:text-left">
                           <h3 className="text-xl font-bold text-success-300 mb-1">Fulfillment Verified!</h3>
                           <p className="text-sm text-success-400 font-medium pb-2">All units have been safely secured from the warehouse location. This order is now ready for final packing and label generation.</p>
                         </div>
                         <Button size="lg" className="bg-success-600 hover:bg-success-700 text-white border-none shadow-float" rightIcon={<ArrowRight className="w-5 h-5" />} onClick={() => navigate('/dispatch')}>
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
