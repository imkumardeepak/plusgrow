import React, { useState, useEffect, useRef, memo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Check, ScanLine, Box, AlertCircle, CheckCircle2, Filter, Search, ArrowDownToLine, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

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
    if (activeInvoice && inputRef.current) inputRef.current.focus();
  }, [activeInvoice]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) { toast.error('Select an invoice first'); return; }
    const scannedValue = scanInput.trim().toUpperCase();
    if (!scannedValue) return;
    if (scannedValue === activeInvoice.sku.toUpperCase()) {
      const current = receivedQty[activeInvoice.id] || 0;
      if (current < activeInvoice.quantity) {
        setReceivedQty(prev => ({ ...prev, [activeInvoice.id]: current + 1 }));
        toast.success(`Verified: ${activeInvoice.sku}`, { icon: <CheckCircle2 className="w-4 h-4 text-success-400" /> });
      } else {
        toast.error('Expected quantity already reached', { icon: <AlertCircle className="w-4 h-4 text-danger-400" /> });
      }
    } else {
      toast.error('Invalid SKU scanned for this invoice', {
        description: `Expected: ${activeInvoice.sku}, Scanned: ${scannedValue}`,
        icon: <AlertCircle className="w-4 h-4 text-danger-400" />,
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
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#10b981', '#1ec0f3'] });
        toast.success(`Invoice ${activeInvoice.piNumber} fully received!`, { icon: <CheckCircle2 className="w-5 h-5 text-success-400" /> });
        setSelectedPi('');
      } else {
        toast.error(`Cannot complete. Received ${current} / ${activeInvoice.quantity}`);
      }
    }
  };

  const getProgressPercentage = () => {
    if (!activeInvoice) return 0;
    return Math.min(100, ((receivedQty[activeInvoice.id] || 0) / activeInvoice.quantity) * 100);
  };

  const isComplete = activeInvoice && (receivedQty[activeInvoice.id] || 0) === activeInvoice.quantity;

  const allOpenInvoices = purchaseInvoices.filter(pi => pi.status === 'Open');
  const overallProgress = allOpenInvoices.length > 0
    ? Math.round(allOpenInvoices.reduce((acc, pi) => acc + ((receivedQty[pi.id] || 0) / pi.quantity) * 100, 0) / allOpenInvoices.length)
    : 100;

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar */}
      <Card variant="glass" className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Shift Receiving Progress</span>
              <Badge variant="success" size="sm" className="font-mono">{overallProgress}%</Badge>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-success-400 to-success-500 rounded-full transition-all duration-700" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 border-l border-white/10 pl-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input placeholder="Search invoices, suppliers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* LEFT PANEL */}
        <Card variant="elevated" className="lg:col-span-4 flex flex-col overflow-hidden h-full">
          <CardHeader className="py-2.5 px-4 border-b border-white/8 bg-white/[0.04]">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-brand-400" />
                Pending Invoices
              </CardTitle>
              <Badge variant="primary" size="sm" className="bg-brand-400/15 text-brand-300 border-brand-400/25">
                {openInvoices.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {openInvoices.map((pi) => {
              const currentQty = receivedQty[pi.id] || 0;
              const progress = (currentQty / pi.quantity) * 100;
              const isSelected = selectedPi === pi.id;
              return (
                <div
                  key={pi.id}
                  onClick={() => setSelectedPi(pi.id)}
                  className={cn(
                    'group relative cursor-pointer rounded-xl border-2 transition-all duration-200 animate-in slide-in-from-left-2 hover:-translate-y-0.5',
                    isSelected
                      ? 'border-brand-400 bg-brand-400/8 shadow-brand ring-1 ring-brand-400/20'
                      : 'border-white/8 bg-white/[0.04] hover:border-brand-400/40 hover:bg-white/[0.04]'
                  )}
                >
                  {isSelected && <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-400 rounded-r-full" />}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', isSelected ? 'bg-brand-400/15 text-brand-300' : 'bg-white/[0.04] text-neutral-500')}>
                        <Box className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-white text-sm">{pi.piNumber}</span>
                        <p className="text-xs text-neutral-500 truncate">{pi.supplierName}</p>
                      </div>
                      <Badge variant={progress === 100 ? 'success' : 'warning'} size="sm" className="shrink-0">
                        {progress === 100 ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={cn('h-1.5 rounded-full transition-all duration-500', progress === 100 ? 'bg-success-400' : 'bg-brand-400')} style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-neutral-500 w-10 text-right">{currentQty}/{pi.quantity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {openInvoices.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-success-400/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-success-400/25">
                  <CheckCircle2 className="w-10 h-10 text-success-400" />
                </div>
                <h3 className="text-xl font-heading font-bold text-white mb-1">All Invoices Cleared!</h3>
                <p className="text-xs text-neutral-500 max-w-[200px]">No open invoices pending for receiving.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT PANEL */}
        <Card variant="elevated" className="lg:col-span-8 flex flex-col overflow-hidden z-10 h-full">
          <CardHeader className="py-2.5 px-4 border-b border-white/8 bg-white/[0.04] z-10">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-brand-400" />
                Receiving Workspace
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(rgba(30,192,243,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
            <div className="relative z-10 flex flex-col h-full overflow-y-auto p-6 scrollbar-thin">
              {!activeInvoice ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-white/[0.04] ring-1 ring-white/10 rounded-full flex items-center justify-center mb-5 relative group">
                    <ScanLine className="w-10 h-10 text-neutral-300 group-hover:text-brand-400 transition-colors duration-300 relative z-10" />
                    <div className="absolute inset-0 border-[2px] border-white/10 border-dashed rounded-full group-hover:border-brand-400/30 animate-[spin_15s_linear_infinite]" />
                  </div>
                  <h4 className="text-xl font-heading font-bold text-white mb-2">Awaiting Selection</h4>
                  <p className="text-sm text-neutral-500 max-w-sm">Select a pending invoice from the directory to begin verifying incoming stock via barcode.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-500">
                  {/* Context Banner */}
                  <div className="mb-6 rounded-xl p-4 flex items-center gap-4 sticky top-0 z-20" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <div className="w-12 h-12 bg-brand-400/10 rounded-xl flex items-center justify-center ring-1 ring-brand-400/20 shrink-0">
                      <Box className="w-6 h-6 text-brand-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-xl font-bold text-white tracking-tight">{activeInvoice.piNumber}</h3>
                      <p className="text-sm text-neutral-500 truncate">{activeInvoice.supplierName} • SKU: <span className="font-semibold text-neutral-200">{activeInvoice.sku}</span></p>
                    </div>
                    <div className="flex items-center gap-4 pl-4 py-2 pr-5 rounded-lg shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">Received Stock</p>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className={cn('text-3xl font-bold leading-none', isComplete ? 'text-success-300' : 'text-brand-300')}>{receivedQty[activeInvoice.id] || 0}</span>
                          <span className="text-lg font-medium text-neutral-500">/ {activeInvoice.quantity}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scan UI */}
                  <div className="w-full max-w-xl mx-auto mt-4 space-y-6 flex-1 flex flex-col justify-center">
                    <div className="rounded-2xl p-8 relative overflow-hidden text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {isComplete && (
                        <div className="absolute inset-0 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in duration-500" style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)' }}>
                          <div className="w-16 h-16 bg-success-400/10 rounded-full ring-1 ring-success-400/30 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-success-400" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-4">Receiving Complete</h3>
                          <Button onClick={handleComplete} size="lg" className="bg-success-400/100 hover:bg-success-400 outline-none ring-4 ring-success-500/20 text-slate-950 font-bold">
                            Close & Confirm Invoice
                          </Button>
                        </div>
                      )}
                      <ScanLine className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-white mb-6">Scan Incoming Items</h4>
                      <form onSubmit={handleScan} className="flex gap-3 relative z-0">
                        <div className="relative flex-1">
                          <input
                            ref={inputRef}
                            type="text"
                            placeholder="Scan Barcode / Enter SKU..."
                            className="block w-full h-14 pl-4 pr-4 rounded-xl border-2 border-brand-400/30 bg-white/[0.04] text-lg font-mono tracking-wide text-white placeholder:text-neutral-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-400/20 focus:bg-white/[0.04] transition-all outline-none"
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            disabled={isComplete}
                            autoFocus
                          />
                        </div>
                        <Button type="submit" size="lg" disabled={isComplete || !scanInput.trim()} className="h-14 px-8 font-bold text-base">
                          Enter
                        </Button>
                      </form>
                      <div className="mt-8">
                        <div className="flex justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                          <span>Verification Progress</span>
                          <span className={isComplete ? 'text-success-300' : 'text-brand-300'}>{Math.round(getProgressPercentage())}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-700', isComplete ? 'bg-gradient-to-r from-success-400 to-success-500' : 'bg-gradient-to-r from-brand-400 to-brand-500')} style={{ width: `${getProgressPercentage()}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <p className="text-xs text-neutral-500 bg-white/[0.04] px-4 py-2 rounded-full border border-white/8 flex items-center gap-2 backdrop-blur-sm">
                        <Info className="w-4 h-4 text-brand-400" /> Scanner should automatically append 'Enter' keystroke.
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
