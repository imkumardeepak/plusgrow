import React, { useState, memo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Move, Search, AlertCircle, ArrowUpRight, ArrowDownRight, Package, CheckCircle2, History, Database, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import confetti from "canvas-confetti";

export const StockMovement = memo(function StockMovement() {
  const { stock, updateStock, products } = useWms();
  const [sku, setSku] = useState('');
  const [qtyChange, setQtyChange] = useState<number | ''>('');
  const [reason, setReason] = useState('Manual');
  const [searchTerm, setSearchTerm] = useState('');

  const handleMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !qtyChange || !reason) {
      toast.error('Please fill all required fields');
      return;
    }

    const currentStock = stock.filter(s => s.sku.toUpperCase() === sku.toUpperCase()).reduce((acc, s) => acc + s.quantity, 0);
    const change = Number(qtyChange);

    if (currentStock + change < 0) {
      toast.error(`Cannot reduce stock below 0. Current stock is only ${currentStock} units.`);
      return;
    }

    updateStock(sku.toUpperCase(), change, `Manual Adjustment: ${reason}`);
    
    // Quick success celebration
    confetti({
      particleCount: 80,
      spread: 40,
      origin: { y: 0.7, x: 0.25 },
      colors: change > 0 ? ["#10b981", "#4E8EA2"] : ["#ef4444", "#f59e0b"]
    });

    toast.success(`Inventory adjusted successfully for ${sku.toUpperCase()}`);
    
    setSku('');
    setQtyChange('');
    setReason('Manual');
  };

  const filteredStock = stock.filter(s => 
    s.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (products.find(p => p.sku === s.sku)?.title.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Create table columns
  const columns = createTableColumns<typeof stock[0]>(
    [
      { 
        accessorKey: 'sku', 
        header: 'SKU Code',
        cell: (row) => (
          <span className="text-sm font-bold font-mono text-neutral-100">{row.sku}</span>
        )
      },
      { 
        accessorKey: 'sku', 
        header: 'Product Identity',
        cell: (row) => {
          const product = products.find(p => p.sku === row.sku);
          return (
            <span className="max-w-[250px] truncate text-sm text-neutral-300 font-medium" title={product?.title}>
              {product?.title || 'Unregistered SKU'}
            </span>
          );
        }
      },
      { 
        accessorKey: 'rack', 
        header: 'Warehouse Loc.',
        cell: (row) => (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded border border-white/10 bg-white/[0.02] text-[11px] font-mono text-neutral-300 tracking-wider">
            {row.rack}-{row.shelf}-{row.bin}
          </span>
        )
      },
      { 
        accessorKey: 'quantity', 
        header: 'Qty',
        cell: (row) => (
          <span className={cn(
            "inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-lg font-bold text-sm",
            row.quantity > 50 ? "bg-success-500/10 text-success-400 border border-success-500/20" :
            row.quantity > 10 ? "bg-brand-500/10 text-brand-400 border border-brand-500/20" :
            "bg-warning-500/10 text-warning-400 border border-warning-500/20"
          )}>
            {row.quantity}
          </span>
        )
      },
    ]
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header Bar - Compact Pro Max */}
      <Card variant="glass" className="py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.1)]">
              <ArrowRightLeft className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none tracking-tight">Stock Movements</h1>
              <p className="text-[10px] text-neutral-500 font-medium mt-0.5">Inventory adjustments & historical logs</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <Button variant="outline" size="xs" leftIcon={<History className="w-3 h-3" />}>
                Audit Log
             </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        
        {/* ================= LEFT PANEL: ADJUSTMENT FORM ================= */}
        <Card variant="elevated" className="lg:col-span-4 flex flex-col overflow-hidden shadow-card h-full border-white/5 bg-white/[0.02]">
          <CardHeader className="py-2 px-3 border-b border-white/10 bg-brand-500/5">
            <CardTitle size="xs" className="flex items-center gap-2">
              <Move className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-brand-300 font-bold text-[11px] uppercase tracking-wider">Execute Adjustment</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            <form onSubmit={handleMovement} className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Target SKU</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Package className="h-3.5 w-3.5 text-brand-500 group-focus-within:text-brand-400 transition-colors" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Scan or enter SKU..."
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                    className="block w-full h-8 pl-8 pr-3 text-[11px] rounded-lg border-white/10 bg-white/[0.03] focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-all font-mono uppercase text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Qty Delta</label>
                   <span className="text-[9px] text-neutral-500 font-medium">(- for deductions)</span>
                </div>
                <div className="relative group">
                  {qtyChange !== '' && (
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                      {Number(qtyChange) > 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-success-500 animate-in zoom-in" />
                      ) : Number(qtyChange) < 0 ? (
                        <ArrowDownRight className="w-4 h-4 text-danger-500 animate-in zoom-in" />
                      ) : null}
                    </div>
                  )}
                  <Input
                    type="number"
                    placeholder="0"
                    value={qtyChange}
                    onChange={(e) => setQtyChange(e.target.value ? Number(e.target.value) : '')}
                    required
                    className={cn(
                       "block w-full h-10 pr-3 rounded-lg border-white/10 text-lg font-bold font-mono transition-all",
                       qtyChange !== '' ? 'pl-9' : 'pl-3',
                       Number(qtyChange) > 0 
                         ? 'border-success-500/30 text-success-400 bg-success-500/5 focus:border-success-500 focus:ring-success-500/20' 
                         : Number(qtyChange) < 0 
                           ? 'border-danger-500/30 text-danger-400 bg-danger-500/5 focus:border-danger-500 focus:ring-danger-500/20'
                           : 'bg-white/[0.03] focus:border-brand-500/50 focus:ring-brand-500/10 text-white'
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Reason</label>
                <div className="relative group">
                   <select 
                     className="block w-full h-8 px-3 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-all outline-none appearance-none font-medium text-neutral-200"
                     value={reason}
                     onChange={(e) => setReason(e.target.value)}
                     required
                   >
                     <option value="Manual">Manual Reconciliation</option>
                     <option value="Damage">Damage / Spoilage</option>
                     <option value="Loss">Loss / Theft</option>
                     <option value="Found">Found Inventory</option>
                     <option value="Correction">Cycle Count Correction</option>
                     <option value="Other">Other Adjustment</option>
                   </select>
                   <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <svg className="w-3 h-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                   </div>
                </div>
              </div>

              <div className="pt-1">
                 <Button type="submit" size="sm" className="w-full h-9 text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.1)] group relative overflow-hidden">
                   <span className="relative z-10 flex items-center justify-center gap-1.5">
                     <Move className="w-3.5 h-3.5" /> Execute
                   </span>
                   <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                 </Button>
              </div>
            </form>
            
            <div className="mt-4 flex items-start gap-2 bg-warning-500/5 p-2.5 rounded-lg border border-warning-500/10 shadow-inner">
              <AlertCircle className="w-3.5 h-3.5 text-warning-400 shrink-0 mt-0.5" />
              <p className="text-[9px] text-warning-200/60 leading-relaxed font-medium">
                Adjustments directly manipulate the ledger and bypass workflows. Use exclusively for discrepancy corrections.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ================= RIGHT PANEL: LIVE DATABASE ================= */}
        <Card variant="elevated" className="lg:col-span-8 flex flex-col overflow-hidden border-white/5 bg-white/[0.01] h-full shadow-2xl">
          <CardHeader className="py-2 px-3 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <CardTitle size="xs" className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-bold">Inventory Ledger</span>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500" />
                <Input
                  type="text"
                  placeholder="Filter database..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-7 w-48 text-[10px] bg-white/[0.03] border-white/10 rounded-md"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden">
            <DataTable 
              columns={columns} 
              data={filteredStock} 
              loading={false}
              searchPlaceholder="Filter..."
              onSearch={setSearchTerm}
              searchValue={searchTerm}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default StockMovement;
