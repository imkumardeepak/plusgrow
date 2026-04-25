import React, { useState, memo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { Download, FileText, Search, Filter, RefreshCw, ArrowDownToLine, Package, Hash, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PurchaseInvoice } from '../types';
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
        status: 'Open',
      };
      addPurchaseInvoice(newPi);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#10b981', '#1ec0f3'] });
      toast.success(`Successfully sync'd new inward from ERP: ${newPiNumber}`, {
        icon: <Download className="w-5 h-5 text-success-400" />,
      });
    } catch {
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

  const columns = createTableColumns<PurchaseInvoice>([
    {
      accessorKey: 'piNumber',
      header: 'Document No.',
      cell: (row) => (
        <span className="font-mono text-sm font-bold text-brand-300 bg-brand-400/10 px-2 py-1 rounded-md border border-brand-400/20">
          {row.piNumber}
        </span>
      ),
    },
    {
      accessorKey: 'piDate',
      header: 'Date Logged',
      cell: (row) => (
        <span className="text-sm font-medium text-neutral-300 whitespace-nowrap">{row.piDate}</span>
      ),
    },
    {
      accessorKey: 'supplierName',
      header: 'Origin Supplier',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-neutral-500" />
          <span className="font-semibold text-neutral-100 text-sm whitespace-nowrap">{row.supplierName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'sku',
      header: 'Target SKU',
      cell: (row) => (
        <Badge variant="default" size="sm" className="font-mono bg-white/[0.04] text-neutral-100 border-white/10 tracking-wider">
          {row.sku}
        </Badge>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Yield Qty',
      cell: (row) => (
        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md font-bold text-sm bg-white/[0.04] border border-white/10 text-white">
          {row.quantity}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (row) => (
        row.status === 'Completed' ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-success-400/10 border border-success-400/25 text-success-300 rounded-full font-bold text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-success-400" /> Put Away Complete
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-warning-400/10 border border-warning-400/25 text-warning-300 rounded-full font-bold text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-warning-400 animate-pulse" /> Open / Pending
          </div>
        )
      ),
    },
  ]);

  const totalInvoices = purchaseInvoices.length;
  const pendingCount = purchaseInvoices.filter(pi => pi.status === 'Open').length;
  const completedCount = purchaseInvoices.filter(pi => pi.status === 'Completed').length;
  const overallProgress = totalInvoices > 0 ? Math.round((completedCount / totalInvoices) * 100) : 100;
  const itemsReceived = purchaseInvoices.reduce((acc, pi) => acc + pi.quantity, 0);

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar */}
      <Card variant="glass" className="p-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="page-icon-chip shrink-0">
              <Download className="ml-0.5 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight tracking-tight">Inward Processing Center</h1>
              <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase mt-0.5">ERP Document Synchronization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4 font-bold" leftIcon={<Filter className="w-4 h-4" />}>
              Filters
            </Button>
            <Button
              onClick={handlePullInwards}
              disabled={isPulling}
              size="sm"
              className="h-9 px-5 font-bold shadow-brand-500/20 w-40 relative truncate"
              leftIcon={!isPulling ? <ArrowDownToLine className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" />}
            >
              {isPulling ? 'SYNCING ERP...' : 'PULL FROM ERP'}
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <Card variant="elevated" className="p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5 text-neutral-500 group-hover:text-brand-300 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Total Invoices</p>
            <p className="text-2xl font-black text-white leading-none">{totalInvoices}</p>
          </div>
        </Card>
        <Card variant="elevated" className="p-5 flex items-center gap-4 group" style={{ background: 'rgba(251,191,36,0.04)', borderColor: 'rgba(251,191,36,0.15)' }}>
          <div className="w-12 h-12 rounded-xl bg-warning-400/10 border border-warning-400/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5 text-warning-400 group-hover:text-warning-300 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-warning-400/80 mb-1">Pending Put Away</p>
            <p className="text-2xl font-black text-white leading-none">{pendingCount}</p>
          </div>
        </Card>
        <Card variant="elevated" className="p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Hash className="w-5 h-5 text-neutral-500 group-hover:text-brand-300 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Units Received</p>
            <p className="text-2xl font-black text-white leading-none font-mono">{itemsReceived.toLocaleString()}</p>
          </div>
        </Card>
        <Card variant="elevated" className="p-5 flex flex-col justify-center" style={{ background: 'rgba(52,211,153,0.04)', borderColor: 'rgba(52,211,153,0.15)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-success-400/80">Completion</p>
            <span className="text-sm font-black text-success-300">{overallProgress}%</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success-400 to-success-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card variant="elevated" className="flex-1 flex flex-col overflow-hidden min-h-0">
        <CardHeader className="py-2.5 px-4 border-b border-white/8 bg-white/[0.04] z-10 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle size="sm" className="flex items-center gap-2">
              <Download className="w-4 h-4 text-brand-400" />
              Incoming Documents Ledger
            </CardTitle>
            <div className="relative w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search PIN/Supplier/SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
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
