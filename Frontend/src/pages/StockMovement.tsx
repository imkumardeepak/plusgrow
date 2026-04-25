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
          <span className="text-sm font-bold font-mono text-neutral-800">{row.sku}</span>
        )
      },
      { 
        accessorKey: 'sku', 
        header: 'Product Identity',
        cell: (row) => {
          const product = products.find(p => p.sku === row.sku);
          return (
            <span className="max-w-[250px] truncate text-sm text-neutral-600 font-medium" title={product?.title}>
              {product?.title || 'Unregistered SKU'}
            </span>
          );
        }
      },
      { 
        accessorKey: 'rack', 
        header: 'Warehouse Loc.',
        cell: (row) => (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-[11px] font-mono text-neutral-600 tracking-wider">
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
            row.quantity > 50 ? "bg-success-50 text-success-700 border border-success-100" :
            row.quantity > 10 ? "bg-brand-50 text-brand-700 border border-brand-100" :
            "bg-warning-50 text-warning-700 border border-warning-200"
          )}>
            {row.quantity}
          </span>
        )
      },
    ]
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Pro Max Edition */}
      <Card variant="glass" className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="page-icon-chip">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight tracking-tight">Stock Movements & Adjustments</h1>
              <p className="text-xs text-neutral-500 font-medium">Manually correct inventory variances and track historical logs</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
             <Button variant="outline" size="sm" leftIcon={<History className="w-4 h-4" />}>
                View Audit Log
             </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* ================= LEFT PANEL: ADJUSTMENT FORM ================= */}
        <Card variant="elevated" className="lg:col-span-4 flex flex-col overflow-hidden shadow-sm h-full border-brand-200 ring-1 ring-brand-500/10">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-brand-50/50">
            <CardTitle size="sm" className="flex items-center gap-2">
              <Move className="w-4 h-4 text-brand-600" />
              <span className="text-brand-900">Execute Adjustment</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-5 scrollbar-thin bg-white">
            <form onSubmit={handleMovement} className="space-y-6 animate-in slide-in-from-left-2 duration-300">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Target SKU Reference</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Package className="h-5 w-5 text-brand-500" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter or scan SKU..."
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                    className="block w-full h-12 pl-12 pr-4 rounded-xl border-2 border-brand-100 bg-white shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all outline-none font-mono text-base uppercase placeholder:normal-case"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                   <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Adjustment Delta</label>
                   <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-bold">Use - for deductions</span>
                </div>
                <div className="relative">
                  {qtyChange !== '' && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                      {Number(qtyChange) > 0 ? (
                        <ArrowUpRight className="w-5 h-5 text-success-500 animate-in zoom-in" />
                      ) : Number(qtyChange) < 0 ? (
                        <ArrowDownRight className="w-5 h-5 text-danger-500 animate-in zoom-in" />
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
                       "block w-full h-14 pr-4 rounded-xl border-2 shadow-sm focus:ring-4 transition-all outline-none text-2xl font-bold font-mono",
                       qtyChange !== '' ? 'pl-12' : 'pl-4',
                       Number(qtyChange) > 0 
                         ? 'border-success-200 text-success-700 bg-success-50/30 focus:border-success-500 focus:ring-success-500/20' 
                         : Number(qtyChange) < 0 
                           ? 'border-danger-200 text-danger-700 bg-danger-50/30 focus:border-danger-500 focus:ring-danger-500/20'
                           : 'border-neutral-200 bg-white focus:border-brand-500 focus:ring-brand-500/20 text-neutral-900'
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Reason Category</label>
                <div className="relative">
                   <select 
                     className="block w-full h-12 px-4 rounded-xl border-2 border-neutral-200 bg-white text-sm shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all outline-none appearance-none font-medium text-neutral-700"
                     value={reason}
                     onChange={(e) => setReason(e.target.value)}
                     required
                   >
                     <option value="Manual">Manual Reconciliation</option>
                     <option value="Damage">Damage / Spoilage</option>
                     <option value="Loss">Loss / Theft</option>
                     <option value="Found">Found Inventory</option>
                     <option value="Correction">Cycle Count Correction</option>
                     <option value="Other">Other Operational Adjustment</option>
                   </select>
                   <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                   </div>
                </div>
              </div>

              <div className="pt-2">
                 <Button type="submit" size="lg" className="w-full h-14 text-base font-bold shadow-md relative overflow-hidden group">
                   <span className="relative z-10 flex items-center justify-center gap-2">
                     <Move className="w-5 h-5" /> Execute Movement
                   </span>
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                 </Button>
              </div>
            </form>
            
            <div className="mt-8 flex items-start gap-3 bg-warning-50 p-4 rounded-xl border border-warning-200 shadow-sm animate-in fade-in duration-500">
              <div className="w-8 h-8 rounded-full bg-warning-100 flex items-center justify-center shrink-0 border border-warning-300">
                <AlertCircle className="w-4 h-4 text-warning-600" />
              </div>
              <p className="text-xs text-warning-800 leading-relaxed font-medium">
                Manual adjustments directly manipulate the ledger and bypass standard inward/outward workflows. Use this exclusively for discrepancy corrections.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ================= RIGHT PANEL: LIVE DATABASE ================= */}
        <Card variant="elevated" className="lg:col-span-8 flex flex-col overflow-hidden shadow-md z-10 border-neutral-200 ring-1 ring-white/[0.03] h-full">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-white z-10">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Database className="w-4 h-4 text-neutral-400" />
                Live Inventory Ledger
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Filter database..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-4 flex flex-col relative bg-neutral-50/30 overflow-hidden">
            <DataTable 
              columns={columns} 
              data={filteredStock} 
              loading={false}
              searchPlaceholder="Filter database..."
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
