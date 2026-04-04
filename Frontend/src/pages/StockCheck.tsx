import React, { useState, useRef, useEffect, memo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { ScanLine, AlertTriangle, CheckCircle2, Box, Info, Navigation, Search, ClipboardCheck, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from "canvas-confetti";
import { useNavigate } from 'react-router-dom';

export const StockCheck = memo(function StockCheck() {
  const { stock, products } = useWms();
  const [scanInput, setScanInput] = useState('');
  const [physicalQty, setPhysicalQty] = useState<number | ''>('');
  const [checkResult, setCheckResult] = useState<{
    sku: string;
    title: string;
    systemQty: number;
    physicalQty: number;
    difference: number;
  } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput || physicalQty === '') return;

    const sysQty = stock.filter(s => s.sku.toUpperCase() === scanInput.toUpperCase()).reduce((acc, s) => acc + s.quantity, 0);
    const product = products.find(p => p.sku.toUpperCase() === scanInput.toUpperCase());
    const physQty = Number(physicalQty);
    const difference = physQty - sysQty;

    setCheckResult({
      sku: scanInput.toUpperCase(),
      title: product ? product.title : 'Unknown Product',
      systemQty: sysQty,
      physicalQty: physQty,
      difference: difference
    });

    if (difference === 0) {
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#4E8EA2", "#0A4174"]
      });
    }

    setScanInput('');
    setPhysicalQty('');
    
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Pro Max Edition */}
      <Card variant="glass" className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0 border border-brand-200 shadow-sm">
              <ClipboardCheck className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-neutral-900 leading-tight tracking-tight">Cycle Counting & Stock Verify</h1>
              <p className="text-xs text-neutral-500 font-medium">Instantly reconcile physical vs system stock quantities</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
             <Button variant="outline" size="sm" onClick={() => navigate('/stock-movement')} leftIcon={<Navigation className="w-4 h-4" />}>
                Go to Movement
             </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* ================= LEFT PANEL: SCAN FORM ================= */}
        <Card variant="elevated" className="lg:col-span-4 flex flex-col overflow-hidden shadow-sm h-full">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-neutral-50/50">
            <CardTitle size="sm" className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-brand-500" />
              Perform Audit
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-5 scrollbar-thin bg-neutral-50/30">
            <form onSubmit={handleCheck} className="space-y-6 animate-in slide-in-from-left-2 duration-300">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Scan or Enter SKU</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-brand-500" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="e.g. SKU-12345"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    required
                    className="block w-full h-14 pl-12 pr-4 rounded-xl border-2 border-brand-100 bg-white shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all outline-none font-mono text-lg uppercase placeholder:normal-case placeholder:text-base"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Physical Quantity Counted</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LayoutGrid className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="number"
                    placeholder="0"
                    value={physicalQty}
                    onChange={(e) => setPhysicalQty(e.target.value ? Number(e.target.value) : '')}
                    required
                    min={0}
                    className="block w-full h-14 pl-12 pr-4 rounded-xl border-2 border-neutral-200 bg-white shadow-sm focus:border-neutral-500 focus:ring-4 focus:ring-neutral-500/20 transition-all outline-none text-2xl font-bold font-mono"
                  />
                </div>
              </div>
              
              <Button type="submit" size="lg" className="w-full h-14 text-base font-bold shadow-md">
                Verify Stock Match
              </Button>
            </form>
            
            <div className="mt-8 flex items-start gap-3 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0 border border-brand-100">
                <Info className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Scan the item's barcode directly into the first field, count the exact quantity on the shelf, enter it below, and hit <kbd className="font-mono text-xs bg-neutral-100 border border-neutral-200 px-1 py-0.5 rounded text-neutral-700">Enter</kbd> to verify instantaneously.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ================= RIGHT PANEL: VERIFICATION CANVAS ================= */}
        <Card variant="elevated" className="lg:col-span-8 flex flex-col overflow-hidden shadow-md z-10 border-neutral-200 ring-1 ring-black/[0.02] h-full">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-white z-10">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Box className="w-4 h-4 text-neutral-400" />
                Audit Report Canvas
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col relative bg-neutral-50 overflow-hidden">
            {/* Dotted Workspace Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-30 mix-blend-multiply pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full overflow-y-auto p-6 scrollbar-thin">
              {!checkResult ? (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-white shadow-sm ring-1 ring-neutral-200 rounded-full flex items-center justify-center mb-5 relative group">
                    <ClipboardCheck className="w-10 h-10 text-neutral-300 group-hover:text-brand-400 transition-colors duration-300 relative z-10" />
                    <div className="absolute inset-0 border-[3px] border-neutral-100 border-dashed rounded-full group-hover:border-brand-200 animate-[spin_15s_linear_infinite]" />
                  </div>
                  <h4 className="text-xl font-heading font-bold text-neutral-800 mb-2">
                    Awaiting Audit Input
                  </h4>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    Reconciliation reports will appear here automatically once you verify incoming scans on the left.
                  </p>
                </div>
              ) : (
                /* Audit Result */
                <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-500 pt-6">
                  
                  {/* Result Header Context */}
                  <div className={cn(
                    "mb-6 shadow-lg rounded-2xl p-5 flex items-center gap-4 border transition-colors",
                    checkResult.difference === 0 
                      ? 'bg-success-50 border-success-200 shadow-success-100/50' 
                      : 'bg-danger-50 border-danger-200 shadow-danger-100/50'
                  )}>
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-white",
                      checkResult.difference === 0 ? "border-success-100" : "border-danger-100"
                    )}>
                      {checkResult.difference === 0 ? (
                        <CheckCircle2 className="w-6 h-6 text-success-500" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-danger-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                       <h2 className={cn(
                          "text-xl font-bold tracking-tight mb-1",
                          checkResult.difference === 0 ? "text-success-900" : "text-danger-900"
                        )}>
                         {checkResult.difference === 0 ? "Perfect Match Confirmed" : "Discrepancy Detected"}
                       </h2>
                       <div className="flex items-center gap-2">
                         <Badge variant="default" className="font-mono text-sm">{checkResult.sku}</Badge>
                         <p className="text-sm font-medium text-neutral-600 truncate opacity-80">{checkResult.title}</p>
                       </div>
                    </div>
                  </div>

                  {/* Quantitative Data Panel */}
                  <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
                     <div className="grid grid-cols-3 divide-x divide-neutral-100">
                        <div className="p-6 text-center hover:bg-neutral-50 transition-colors">
                           <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">System Record</p>
                           <p className="text-4xl font-mono font-bold text-neutral-900">{checkResult.systemQty}</p>
                        </div>
                        <div className="p-6 text-center hover:bg-neutral-50 transition-colors">
                           <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Physical Count</p>
                           <p className="text-4xl font-mono font-bold text-neutral-900">{checkResult.physicalQty}</p>
                        </div>
                        <div className={cn(
                           "p-6 text-center shadow-inner relative overflow-hidden",
                           checkResult.difference === 0 ? "bg-success-500/5" : "bg-danger-500/5"
                        )}>
                           <div className={cn(
                              "absolute top-0 inset-x-0 h-1", 
                              checkResult.difference === 0 ? "bg-success-500" : "bg-danger-500"
                           )}></div>
                           <p className={cn(
                              "text-[11px] font-bold uppercase tracking-widest mb-2",
                              checkResult.difference === 0 ? "text-success-600" : "text-danger-600"
                           )}>Variance</p>
                           <p className={cn(
                              "text-5xl font-mono font-black",
                              checkResult.difference === 0 ? "text-success-600" : "text-danger-600"
                           )}>
                              {checkResult.difference > 0 ? '+' : ''}{checkResult.difference}
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Remediation Panel if variance exists */}
                  {checkResult.difference !== 0 && (
                     <div className="bg-white rounded-2xl border-2 border-danger-200 p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-danger-50 rounded-full flex items-center justify-center shrink-0">
                           <AlertTriangle className="w-6 h-6 text-danger-500" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                           <h4 className="text-base font-bold text-danger-900 mb-1">Stock Adjustment Required</h4>
                           <p className="text-sm text-danger-700">
                              A deviation of <strong className="font-mono">{Math.abs(checkResult.difference)} units</strong> was detected. A stock movement transaction is required to sync physical inventory with system records.
                           </p>
                        </div>
                        <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                           <Button onClick={() => navigate('/stock-movement')} className="w-full sm:w-auto bg-danger-600 hover:bg-danger-700 text-white shadow-md">
                              Create Movement Adjustment
                           </Button>
                        </div>
                     </div>
                  )}

                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default StockCheck;
