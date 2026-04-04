import React, { useState, memo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Download, FileText, Search, Filter, RefreshCw, ArrowDownToLine, Package, CheckCircle2, ChevronRight, Hash, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { PurchaseInvoice } from '../types';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export const Inward = memo(function Inward() {
  const { purchaseInvoices, addPurchaseInvoice, products } = useWms();
  const [isPulling, setIsPulling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePullInwards = async () => {
    setIsPulling(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newPiNumber = `INW-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      const randomProduct = products[Math.floor(Math.random() * products.length)];

      const newPi: PurchaseInvoice = {
        id: Math.random().toString(36).substr(2, 9),
        supplierName: 'Simulated Supplier',
        piNumber: newPiNumber,
        piDate: new Date().toISOString().split('T')[0],
        sku: randomProduct?.sku || 'UNKNOWN',
        quantity: Math.floor(Math.random() * 100) + 10,
        manufacturer: 'Simulated Mfg',
        gst: 18,
        country: 'India',
        status: 'Open'
      };

      addPurchaseInvoice(newPi);
      confetti({
         particleCount: 50,
         spread: 60,
         origin: { y: 0.8 },
         colors: ["#10b981", "#4E8EA2"]
      });
      toast.success(`Successfully sync'd new inward from ERP: ${newPiNumber}`, {
         icon: <Download className="w-5 h-5 text-success-500" />
      });
    } catch (error) {
      toast.error('Failed to communicate with ERP');
    } finally {
      setIsPulling(false);
    }
  };

  const filteredInvoices = purchaseInvoices.filter(pi =>
    pi.piNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pi.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pi.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create table columns
  const columns = createTableColumns<PurchaseInvoice>(
    [
      { 
        accessorKey: 'piNumber', 
        header: 'Document No.',
        cell: (row) => (
          <span className="font-mono text-sm font-bold text-brand-700 bg-brand-50/50 px-2 py-1 rounded-md border border-brand-100">
            {row.piNumber}
          </span>
        )
      },
      { 
        accessorKey: 'piDate', 
        header: 'Date Logged',
        cell: (row) => (
          <span className="text-sm font-medium text-neutral-500 whitespace-nowrap">{row.piDate}</span>
        )
      },
      { 
        accessorKey: 'supplierName', 
        header: 'Origin Supplier',
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-semibold text-neutral-700 text-sm whitespace-nowrap">{row.supplierName}</span>
          </div>
        )
      },
      { 
        accessorKey: 'sku', 
        header: 'Target SKU',
        cell: (row) => (
          <Badge variant="default" size="sm" className="font-mono bg-white text-neutral-800 border-neutral-200 shadow-sm tracking-wider">
            {row.sku}
          </Badge>
        )
      },
      { 
        accessorKey: 'quantity', 
        header: 'Yield Qty',
        cell: (row) => (
          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md font-bold text-sm bg-neutral-50 border border-neutral-200 text-neutral-900 shadow-sm">
            {row.quantity}
          </span>
        )
      },
      { 
        accessorKey: 'status', 
        header: 'Status',
        cell: (row) => (
          row.status === 'Completed' ? (
            <div className="inline-flex items-center gap-1.5 px-2 bg-success-50/50 border border-success-200 text-success-700 rounded-full font-bold text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500"></span> Put Away Complete
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 bg-warning-50/50 border border-warning-200 text-warning-700 rounded-full font-bold text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-warning-500 animate-pulse"></span> Open / Pending
            </div>
          )
        )
      },
    ]
  );

  // Calculate stats
  const totalInvoices = purchaseInvoices.length;
  const pendingCount = purchaseInvoices.filter(pi => pi.status === 'Open').length;
  const completedCount = purchaseInvoices.filter(pi => pi.status === 'Completed').length;
  const overallProgress = totalInvoices > 0 ? Math.round((completedCount / totalInvoices) * 100) : 100;
  const itemsReceived = purchaseInvoices.reduce((acc, pi) => acc + pi.quantity, 0);

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Pro Max Edition */}
      <Card variant="glass" className="p-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0 border border-brand-200 shadow-sm">
              <Download className="w-5 h-5 text-brand-600 ml-0.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-neutral-900 leading-tight tracking-tight">Inward Processing Center</h1>
              <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase mt-0.5">ERP Document Synchronization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4 font-bold border-neutral-200" leftIcon={<Filter className="w-4 h-4" />}>
              Filters
            </Button>
            <Button 
               onClick={handlePullInwards} 
               disabled={isPulling} 
               size="sm"
               className="h-9 px-5 shadow-sm font-bold shadow-brand-500/20 w-40 relative truncate"
               leftIcon={!isPulling ? <ArrowDownToLine className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" />}
            >
              {isPulling ? 'SYNCING ERP...' : 'PULL FROM ERP'}
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Dashboard Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
         <Card variant="elevated" className="border-neutral-200/60 p-5 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
               <FileText className="w-5 h-5 text-neutral-400 group-hover:text-brand-500 transition-colors" />
            </div>
            <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Total Invoices</p>
               <p className="text-2xl font-black text-neutral-900 leading-none">{totalInvoices}</p>
            </div>
         </Card>
         <Card variant="elevated" className="border-warning-200/60 bg-warning-50/10 p-5 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-white border border-warning-100 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
               <Package className="w-5 h-5 text-warning-400 group-hover:text-warning-500 transition-colors" />
            </div>
            <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-warning-600 mb-1">Pending Put Away</p>
               <p className="text-2xl font-black text-warning-900 leading-none">{pendingCount}</p>
            </div>
         </Card>
         <Card variant="elevated" className="border-neutral-200/60 p-5 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
               <Hash className="w-5 h-5 text-neutral-400 group-hover:text-brand-500 transition-colors" />
            </div>
            <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Units Received</p>
               <p className="text-2xl font-black text-neutral-900 leading-none font-mono">{itemsReceived.toLocaleString()}</p>
            </div>
         </Card>
         {/* Overall Progress */}
         <Card variant="elevated" className="border-success-200/60 bg-success-50/10 p-5 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] font-bold uppercase tracking-widest text-success-600">Completion</p>
               <span className="text-sm font-black text-success-700">{overallProgress}%</span>
            </div>
            <div className="h-2 w-full bg-success-100/50 rounded-full overflow-hidden shadow-inner">
               <div 
                 className="h-full bg-gradient-to-r from-success-400 to-success-500 rounded-full transition-all duration-1000 ease-out" 
                 style={{ width: `${overallProgress}%` }}
               />
            </div>
         </Card>
      </div>

      {/* Main Content Workspace */}
      <Card variant="elevated" className="flex-1 flex flex-col overflow-hidden border-neutral-200 shadow-sm ring-1 ring-black/[0.02] min-h-0">
        <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-neutral-50/50 z-10 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle size="sm" className="flex items-center gap-2">
              <Download className="w-4 h-4 text-brand-500" />
              Incoming Documents Ledger
            </CardTitle>
            <div className="relative w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search PIN/Supplier/SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm bg-white focus:bg-white transition-colors border-neutral-200/80 shadow-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-auto scrollbar-thin p-4">
            <DataTable 
              columns={columns} 
              data={filteredInvoices} 
              loading={false}
              searchPlaceholder="Search PIN/Supplier/SKU..."
              onSearch={setSearchTerm}
              searchValue={searchTerm}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default Inward;
