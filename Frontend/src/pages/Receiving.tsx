import React, { useState, useEffect, useRef, memo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Check, ScanLine, Box, AlertCircle, CheckCircle2, Package, ArrowRight, Info, Filter, Search, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import confetti from "canvas-confetti";

export const Receiving = memo(function Receiving() {
  const { purchaseInvoices, updatePurchaseInvoiceStatus } = useWms();
  const [scanInput, setScanInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPi, setSelectedPi] = useState('');
  const [receivedQty, setReceivedQty] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const openInvoices = purchaseInvoices.filter(pi => 
    pi.status === 'Open' && 
    (pi.piNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
     pi.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     pi.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const activeInvoice = purchaseInvoices.find(pi => pi.id === selectedPi);

  useEffect(() => {
    if (activeInvoice && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeInvoice]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) {
      toast.error('Select an invoice first');
      return;
    }

    const scannedValue = scanInput.trim().toUpperCase();
    if (!scannedValue) return;

    if (scannedValue === activeInvoice.sku.toUpperCase()) {
      const current = receivedQty[activeInvoice.id] || 0;
      if (current < activeInvoice.quantity) {
        setReceivedQty(prev => ({ ...prev, [activeInvoice.id]: current + 1 }));
        
        // Minor celebration for scan
        toast.success(`Verified: ${activeInvoice.sku}`, {
          icon: <CheckCircle2 className="w-4 h-4 text-success-500" />
        });
      } else {
        toast.error('Expected quantity already reached', {
          icon: <AlertCircle className="w-4 h-4 text-danger-500" />
        });
      }
    } else {
      toast.error('Invalid SKU scanned for this invoice', {
        description: `Expected: ${activeInvoice.sku}, Scanned: ${scannedValue}`,
        icon: <AlertCircle className="w-4 h-4 text-danger-500" />
      });
    }
    setScanInput('');
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleComplete = () => {
    if (activeInvoice) {
      const current = receivedQty[activeInvoice.id] || 0;
      if (current === activeInvoice.quantity) {
        updatePurchaseInvoiceStatus(activeInvoice.id, 'Completed');
        
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#10b981", "#4E8EA2", "#0A4174"]
        });

        toast.success(`Invoice ${activeInvoice.piNumber} fully received!`, {
          icon: <CheckCircle2 className="w-5 h-5 text-success-500" />
        });
        setSelectedPi('');
      } else {
        toast.error(`Cannot complete. Received ${current} / ${activeInvoice.quantity}`);
      }
    }
  };

  const getProgressPercentage = () => {
    if (!activeInvoice) return 0;
    const current = receivedQty[activeInvoice.id] || 0;
    return Math.min(100, (current / activeInvoice.quantity) * 100);
  };

  const isComplete = activeInvoice && (receivedQty[activeInvoice.id] || 0) === activeInvoice.quantity;

  // Calculate overall progress
  const allOpenInvoices = purchaseInvoices.filter(pi => pi.status === 'Open');
  const overallProgress = allOpenInvoices.length > 0
    ? Math.round(allOpenInvoices.reduce((acc, pi) => acc + ((receivedQty[pi.id] || 0) / pi.quantity) * 100, 0) / allOpenInvoices.length)
    : 100;

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Pro Max Edition */}
      <Card variant="glass" className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Progress */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Shift Receiving Progress
              </span>
              <Badge variant="success" size="sm" className="font-mono bg-success-50 text-success-600 border border-success-200">
                {overallProgress}%
              </Badge>
            </div>
            <div className="h-2 bg-neutral-100/80 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-success-400 to-success-500 rounded-full transition-all duration-700"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Search Toggle */}
          <div className="flex items-center gap-3 flex-shrink-0 border-l border-neutral-200/50 pl-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search invoices, suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-neutral-50/50 focus:bg-white transition-colors border-neutral-200"
              />
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content - Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* ================= LEFT PANEL: INVOICE DIRECTORY ================= */}
        <Card variant="elevated" className="lg:col-span-4 flex flex-col overflow-hidden shadow-sm h-full">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-brand-500" />
                Pending Invoices
              </CardTitle>
              <Badge variant="primary" size="sm" className="bg-brand-100 text-brand-700">
                {openInvoices.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin bg-neutral-50/30">
            {openInvoices.map((pi) => {
              const currentQty = receivedQty[pi.id] || 0;
              const progress = (currentQty / pi.quantity) * 100;
              const isSelected = selectedPi === pi.id;

              return (
                <div
                  key={pi.id}
                  onClick={() => setSelectedPi(pi.id)}
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
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isSelected ? 'bg-brand-100 text-brand-600' : 'bg-neutral-100 text-neutral-500')}>
                        <Box className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-neutral-900 text-sm">{pi.piNumber}</span>
                        <p className="text-xs text-neutral-500 truncate">{pi.supplierName}</p>
                      </div>
                      <Badge variant={progress === 100 ? 'success' : 'warning'} size="sm" className="shrink-0">
                        {progress === 100 ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-1.5 rounded-full transition-all duration-500", progress === 100 ? 'bg-success-500' : 'bg-brand-500')} 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                      <span className="text-xs font-medium text-neutral-600 w-10 text-right">{currentQty}/{pi.quantity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {openInvoices.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-success-50 rounded-full flex items-center justify-center mb-4 shadow-sm ring-1 ring-success-100">
                  <CheckCircle2 className="w-10 h-10 text-success-500" />
                </div>
                <h3 className="text-xl font-heading font-bold text-neutral-900 mb-1">
                  All Invoices Cleared!
                </h3>
                <p className="text-xs text-neutral-500 max-w-[200px]">
                  No open invoices pending for receiving.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================= RIGHT PANEL: WORKFLOW CANVAS ================= */}
        <Card variant="elevated" className="lg:col-span-8 flex flex-col overflow-hidden shadow-md z-10 border-neutral-200 ring-1 ring-black/[0.02] h-full">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-white z-10">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-neutral-400" />
                Receiving Workspace
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col relative bg-neutral-50 overflow-hidden">
            {/* Dotted Workspace Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-30 mix-blend-multiply pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full overflow-y-auto p-6 scrollbar-thin">
              
              {!activeInvoice ? (
                /* Empty State */
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-white shadow-sm ring-1 ring-neutral-200 rounded-full flex items-center justify-center mb-5 relative group">
                    <ScanLine className="w-10 h-10 text-neutral-300 group-hover:text-brand-400 transition-colors duration-300 relative z-10" />
                    <div className="absolute inset-0 border-[3px] border-neutral-100 border-dashed rounded-full group-hover:border-brand-200 animate-[spin_15s_linear_infinite]" />
                  </div>
                  <h4 className="text-xl font-heading font-bold text-neutral-800 mb-2">
                    Awaiting Selection
                  </h4>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    Select a pending invoice from the directory to begin verifying incoming stock via barcode.
                  </p>
                </div>
              ) : (
                /* Active Workspace */
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Floating Context Banner */}
                  <div className="mb-6 bg-white shadow-lg shadow-neutral-200/40 border border-neutral-200/60 rounded-xl p-4 flex items-center gap-4 sticky top-0 z-20">
                    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center ring-1 ring-brand-100 shrink-0">
                      <Box className="w-6 h-6 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-xl font-bold text-neutral-900 tracking-tight">
                        {activeInvoice.piNumber}
                      </h3>
                      <p className="text-sm text-neutral-500 truncate">
                        {activeInvoice.supplierName} • SKU: <span className="font-semibold text-neutral-700">{activeInvoice.sku}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-neutral-50 pl-4 py-2 pr-5 rounded-lg border border-neutral-100 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-0.5">
                          Received Stock
                        </p>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className={cn("text-3xl font-bold leading-none", isComplete ? "text-success-600" : "text-brand-600")}>
                            {receivedQty[activeInvoice.id] || 0}
                          </span>
                          <span className="text-lg font-medium text-neutral-400">
                            / {activeInvoice.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational UI */}
                  <div className="w-full max-w-xl mx-auto mt-4 space-y-6 flex-1 flex flex-col justify-center">
                    
                    {/* Visual Progress Center */}
                    <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm p-8 relative overflow-hidden text-center">
                      {isComplete && (
                        <div className="absolute inset-0 bg-success-50/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in duration-500">
                          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-success-500" />
                          </div>
                          <h3 className="text-xl font-bold text-success-800 mb-4">Receiving Complete</h3>
                          <Button onClick={handleComplete} size="lg" className="bg-success-600 hover:bg-success-700 outline-none ring-4 ring-success-500/20 text-white">
                            Close & Confirm Invoice
                          </Button>
                        </div>
                      )}

                      <ScanLine className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-neutral-800 mb-6">Scan Incoming Items</h4>
                      
                      <form onSubmit={handleScan} className="flex gap-3 relative z-0">
                        <div className="relative flex-1">
                          <input
                            ref={inputRef}
                            type="text"
                            placeholder="Scan Barcode / Enter SKU..."
                            className="block w-full h-14 pl-4 pr-4 rounded-xl border-2 border-brand-100 bg-neutral-50 text-lg font-mono tracking-wide shadow-inner focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all outline-none"
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            disabled={isComplete}
                            autoFocus
                          />
                        </div>
                        <Button type="submit" size="lg" disabled={isComplete || !scanInput.trim()} className="h-14 px-8 font-bold text-base shadow-md">
                          Enter
                        </Button>
                      </form>
                      
                      <div className="mt-8">
                         <div className="flex justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                           <span>Verification Progress</span>
                           <span className={isComplete ? "text-success-600" : "text-brand-600"}>{Math.round(getProgressPercentage())}%</span>
                         </div>
                         <div className="w-full bg-neutral-100 rounded-full h-4 overflow-hidden shadow-inner">
                           <div className={cn("h-full rounded-full transition-all duration-700", isComplete ? 'bg-gradient-to-r from-success-400 to-success-500' : 'bg-gradient-to-r from-brand-400 to-brand-500')} style={{ width: `${getProgressPercentage()}%` }} />
                         </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <p className="text-xs text-neutral-400 bg-white/60 px-4 py-2 rounded-full border border-neutral-200/50 flex items-center gap-2 shadow-sm backdrop-blur-sm">
                        <Info className="w-4 h-4 text-brand-500" /> Scanner should automatically append 'Enter' keystroke.
                      </p>
                    </div>

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

export default Receiving;
