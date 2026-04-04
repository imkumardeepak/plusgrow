import React, { useState, memo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Truck, Package, Calendar, User, CheckCircle2, AlertCircle, Box, MapPin, Search, Filter, ClipboardList, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export const Dispatch = memo(function Dispatch() {
  const { salesInvoices, updateSalesInvoiceStatus } = useWms();
  const [selectedSi, setSelectedSi] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const openOrders = salesInvoices.filter(si => 
    si.status === 'Open' &&
    (si.siNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
     si.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     si.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const activeOrder = salesInvoices.find(si => si.id === selectedSi);

  const handleDispatch = () => {
    if (activeOrder) {
      updateSalesInvoiceStatus(activeOrder.id, 'Dispatched');
      
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#4E8EA2", "#6EA2B3", "#7BBDE8"]
      });
      
      toast.success(`Order ${activeOrder.siNumber} successfully dispatched!`, {
        icon: <Truck className="w-5 h-5 text-brand-500" />
      });
      setSelectedSi('');
    }
  };

  // Calculate overall progress
  const allOpenOrders = salesInvoices.filter(si => si.status === 'Open');
  const overallProgress = salesInvoices.length > 0 
    ? Math.round(((salesInvoices.length - allOpenOrders.length) / salesInvoices.length) * 100)
    : 100;

  // Generate carton ID (Mock generation fixed to order ID for consistency during view)
  const getCartonId = (id: string) => `CTN-${id.substring(0, 6).toUpperCase()}`;

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Pro Max Edition */}
      <Card variant="glass" className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-3 pr-4">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0 border border-brand-200 shadow-sm">
              <Send className="w-5 h-5 text-brand-600 ml-0.5" />
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between mb-1.5">
                 <h1 className="text-xs font-bold text-neutral-500 uppercase tracking-wider leading-tight">Daily Dispatch Progress</h1>
                 <Badge variant="success" size="sm" className="font-mono bg-success-50 text-success-600 border border-success-200">
                   {overallProgress}%
                 </Badge>
               </div>
               <div className="h-2 bg-neutral-100/80 rounded-full overflow-hidden shadow-inner">
                 <div
                   className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full transition-all duration-700"
                   style={{ width: `${overallProgress}%` }}
                 />
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 border-l border-neutral-200/50 pl-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search orders, clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-neutral-50/50 focus:bg-white transition-colors border-neutral-200"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* ================= LEFT PANEL: ORDER DIRECTORY ================= */}
        <Card variant="elevated" className="lg:col-span-4 flex flex-col overflow-hidden shadow-sm h-full">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Box className="w-4 h-4 text-brand-500" />
                Awaiting Dispatch
              </CardTitle>
              <Badge variant="primary" size="sm" className="bg-brand-100 text-brand-700">
                {openOrders.length}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin bg-neutral-50/30">
            {openOrders.map((si) => {
              const isSelected = selectedSi === si.id;

              return (
                <div
                  key={si.id}
                  onClick={() => setSelectedSi(si.id)}
                  className={cn(
                    "group relative cursor-pointer rounded-xl border-2 transition-all duration-200 animate-in slide-in-from-left-2",
                    "hover:shadow-md hover:-translate-y-0.5",
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 shadow-md ring-1 ring-brand-500/20'
                      : 'border-neutral-200 bg-white hover:border-brand-300'
                  )}
                >
                  {isSelected && (
                    <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-500 rounded-r-full" />
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                         <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", isSelected ? 'bg-brand-100 text-brand-600' : 'bg-neutral-100 text-neutral-500')}>
                           <Package className="w-3.5 h-3.5" />
                         </div>
                         <span className="font-semibold text-neutral-900 text-sm tracking-tight">{si.siNumber}</span>
                       </div>
                       <Badge variant="warning" size="sm" className="bg-warning-50 text-warning-700 border-warning-200 shadow-sm animate-pulse">
                         Packed
                       </Badge>
                    </div>
                    
                    <div className="bg-neutral-50/50 p-2 rounded-lg border border-neutral-100">
                       <div className="flex items-center gap-2 text-xs text-neutral-600 mb-1.5 font-medium">
                         <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                         <span className="truncate">{si.customerName}</span>
                       </div>
                       <div className="flex items-center justify-between mt-2">
                         <Badge variant="default" size="sm" className="font-mono bg-white border-neutral-200 shadow-sm">{si.sku}</Badge>
                         <span className="text-xs font-bold text-neutral-700 bg-white px-2 py-0.5 rounded border border-neutral-200 shadow-sm">{si.quantity} units</span>
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {openOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-success-50 rounded-full flex items-center justify-center mb-4 shadow-sm ring-1 ring-success-100">
                  <Truck className="w-10 h-10 text-success-500" />
                </div>
                <h3 className="text-xl font-heading font-bold text-neutral-900 mb-1">
                  All Clear!
                </h3>
                <p className="text-xs text-neutral-500 max-w-[200px]">
                  No orders currently awaiting dispatch. The dock is clear.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================= RIGHT PANEL: OUTBOUND CANVAS ================= */}
        <Card variant="elevated" className="lg:col-span-8 flex flex-col overflow-hidden shadow-md z-10 border-neutral-200 ring-1 ring-black/[0.02] h-full">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-white z-10">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-neutral-400" />
                Outbound Logistics
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col relative bg-neutral-50 overflow-hidden">
            {/* Dotted Workspace Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-30 mix-blend-multiply pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full overflow-y-auto p-6 scrollbar-thin">
              
              {!activeOrder ? (
                /* Empty State */
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-white shadow-sm ring-1 ring-neutral-200 rounded-full flex items-center justify-center mb-5 relative group">
                    <Truck className="w-10 h-10 text-neutral-300 group-hover:text-brand-400 transition-colors duration-300 relative z-10" />
                    <div className="absolute inset-0 border-[3px] border-neutral-100 border-dashed rounded-full group-hover:border-brand-200 animate-[spin_15s_linear_infinite]" />
                  </div>
                  <h4 className="text-xl font-heading font-bold text-neutral-800 mb-2">
                    Awaiting Selection
                  </h4>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    Select a ready order from the dock queue to finalize dispatch operations.
                  </p>
                </div>
              ) : (
                /* Active Workspace */
                <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Digital Outbound Docket */}
                  <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-xl shadow-neutral-200/40 overflow-hidden mb-6 relative">
                     {/* Decorative Header */}
                     <div className="h-2 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600"></div>
                     <div className="absolute top-5 right-5 text-neutral-100">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                     </div>
                     
                     <div className="p-8 pb-6 border-b border-neutral-100 relative z-10">
                        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-6 shadow-sm ring-1 ring-brand-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready For Transport
                        </div>
                        
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Commercial Invoice</p>
                        <h2 className="text-4xl font-black text-neutral-900 font-mono tracking-tighter mb-8">{activeOrder.siNumber}</h2>
                        
                        <div className="grid grid-cols-2 gap-8">
                           <div>
                              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-2 flex items-center gap-1"><User className="w-3 h-3"/> Ship To</p>
                              <p className="text-base font-bold text-neutral-800 leading-tight">{activeOrder.customerName}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-2 flex items-center gap-1"><Calendar className="w-3 h-3"/> Order Date</p>
                              <p className="text-base font-bold text-neutral-800 leading-tight">{activeOrder.siDate}</p>
                           </div>
                        </div>
                     </div>
                     
                     <div className="bg-neutral-50 px-8 py-6">
                        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm flex items-center gap-6">
                           <div className="bg-brand-50 p-4 rounded-lg shrink-0">
                              <Package className="w-8 h-8 text-brand-600" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Contents</p>
                              <div className="flex items-center justify-between">
                                 <Badge variant="default" className="font-mono text-base px-3 py-1 shadow-sm">{activeOrder.sku}</Badge>
                                 <div className="text-right">
                                    <span className="text-3xl font-black text-neutral-900 leading-none">{activeOrder.quantity}</span>
                                    <span className="text-sm font-bold text-neutral-400 ml-1">UNITS</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                     
                     {/* Logistics Tracker info */}
                     <div className="px-8 py-5 border-t border-neutral-100 flex items-center justify-between bg-neutral-900 text-white">
                        <div>
                           <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-0.5">Physical Tracking ID</p>
                           <p className="font-mono text-xl font-bold tracking-widest text-brand-400">{getCartonId(activeOrder.id)}</p>
                        </div>
                        <div className="w-12 h-12 bg-neutral-800 rounded flex items-center justify-center p-2">
                           {/* Decorative barcode icon */}
                           <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2,4H4V20H2V4M6,4H10V20H6V4M12,4H14V20H12V4M16,4H22V20H16V4Z" /></svg>
                        </div>
                     </div>
                  </div>

                  {/* Action Dashboard */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-white p-6 rounded-2xl border border-neutral-200/60 shadow-sm animate-in slide-in-from-bottom-6 duration-700">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="bg-brand-50 p-2 rounded-full shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4 text-brand-600" />
                      </div>
                      <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                        Completing this dispatch will permanently deduct matching inventory levels and finalize the sales order lifecycle.
                      </p>
                    </div>
                    
                    <Button onClick={handleDispatch} size="lg" className="h-14 px-8 shrink-0 text-base shadow-lg shadow-brand-500/20 w-full sm:w-auto overflow-hidden group relative">
                       <span className="relative z-10 flex items-center justify-center gap-2">
                         <Truck className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> Confirm Dispatch
                       </span>
                       <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                    </Button>
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

export default Dispatch;
