import React, { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpFromLine, Download, FileText, Package, RefreshCw, Truck, Users } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

import { Badge } from '../components/atoms/Badge';
import { Button } from '../components/atoms/Button';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { OperationsEmptyState, OperationsPage, OperationsPanel } from '../components/organisms/Operations/OperationsShell';
import { useWms } from '../context/WmsContext';
import type { SalesInvoice } from '../types';

export const Outward = memo(function Outward() {
  const { salesInvoices, addSalesInvoice, products, customers } = useWms();
  const [isPulling, setIsPulling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handlePullSales = async () => {
    setIsPulling(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const newSiNumber = `SI-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const randomCustomer = customers[Math.floor(Math.random() * customers.length)];

      const newSi: SalesInvoice = {
        id: Math.random().toString(36).substr(2, 9),
        customerName: randomCustomer?.name || 'Walk-in Customer',
        siNumber: newSiNumber,
        siDate: new Date().toISOString().split('T')[0],
        sku: randomProduct?.sku || 'UNKNOWN',
        quantity: Math.floor(Math.random() * 20) + 1,
        status: 'Open',
      };

      addSalesInvoice(newSi);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, colors: ['#1ec0f3', '#0a8bbf'] });
      toast.success(`Sales order synced: ${newSiNumber}`);
    } catch {
      toast.error('Failed to sync sales order');
    } finally {
      setIsPulling(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return salesInvoices.filter((si) =>
      si.siNumber.toLowerCase().includes(query) ||
      si.customerName.toLowerCase().includes(query) ||
      si.sku.toLowerCase().includes(query)
    );
  }, [salesInvoices, searchTerm]);

  const columns = createTableColumns<SalesInvoice>([
    {
      accessorKey: 'siNumber',
      header: 'Order No.',
      cell: (row) => (
        <span className="inline-flex rounded-lg border border-brand-500/20 bg-brand-500/10 px-2 py-1 font-mono text-xs text-brand-400">
          {row.siNumber}
        </span>
      ),
    },
    {
      accessorKey: 'siDate',
      header: 'Order Date',
      cell: (row) => <span className="text-sm text-neutral-200">{row.siDate}</span>,
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: (row) => <span className="font-semibold text-white">{row.customerName}</span>,
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: (row) => (
        <span className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-xs text-neutral-200">
          {row.sku}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      cell: (row) => <span className="font-bold text-white">{row.quantity}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge
          variant={row.status === 'Dispatched' ? 'success' : 'warning'}
          shape="pill"
          className="border-none"
        >
          {row.status === 'Dispatched' ? 'Dispatched' : 'Open'}
        </Badge>
      ),
    },
  ]);

  const totalOrders = salesInvoices.length;
  const openOrders = salesInvoices.filter((si) => si.status === 'Open').length;
  const dispatchedOrders = salesInvoices.filter((si) => si.status === 'Dispatched').length;
  const completion = totalOrders > 0 ? Math.round((dispatchedOrders / totalOrders) * 100) : 0;

  return (
    <OperationsPage
      title="Outward Orders"
      description="Pull sales orders, review current queue, then move picking work into packing and dispatch."
      icon={ArrowUpFromLine}
      actions={
        <Button
          size="sm"
          onClick={handlePullSales}
          disabled={isPulling}
          leftIcon={isPulling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        >
          {isPulling ? 'Syncing...' : 'Pull Orders'}
        </Button>
      }
      metrics={[
        { label: 'Total Orders', value: totalOrders },
        { label: 'Open Orders', value: openOrders, tone: 'warning' },
        { label: 'Dispatched', value: dispatchedOrders, tone: 'success' },
        { label: 'Completion', value: `${completion}%`, tone: 'brand' },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <OperationsPanel
          title="Sales Order Ledger"
          icon={FileText}
          description="Current outward queue from ERP sync."
        >
          <DataTable
            columns={columns}
            data={filteredInvoices}
            loading={false}
            searchPlaceholder="Search order, customer, or SKU..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </OperationsPanel>

        <div className="grid gap-4">
          <OperationsPanel
            title="Workflow"
            icon={Package}
            description="Use outward as source queue. Complete work in next steps."
          >
            <div className="space-y-3">
              <button
                onClick={() => navigate('/packing')}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-brand-500/30 hover:bg-brand-500/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Picking & Packing</p>
                    <p className="mt-1 text-xs text-neutral-400">Prepare open orders for dispatch.</p>
                  </div>
                  <Package className="h-4 w-4 text-brand-400" />
                </div>
              </button>

              <button
                onClick={() => navigate('/dispatch')}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-brand-500/30 hover:bg-brand-500/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Dispatch</p>
                    <p className="mt-1 text-xs text-neutral-400">Ship packed orders and close outward cycle.</p>
                  </div>
                  <Truck className="h-4 w-4 text-brand-400" />
                </div>
              </button>
            </div>
          </OperationsPanel>

          <OperationsPanel
            title="Queue Snapshot"
            icon={Users}
            description="Quick view of current work mix."
          >
            {filteredInvoices.length > 0 ? (
              <div className="space-y-3">
                {filteredInvoices.slice(0, 5).map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{row.customerName}</p>
                        <p className="mt-1 text-xs text-neutral-400">{row.siNumber} · {row.sku}</p>
                      </div>
                      <Badge variant={row.status === 'Dispatched' ? 'success' : 'warning'} shape="pill" className="border-none">
                        {row.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <OperationsEmptyState
                icon={FileText}
                title="No outward orders"
                description="Pull orders to start outward processing."
                action={
                  <Button
                    size="sm"
                    onClick={handlePullSales}
                    disabled={isPulling}
                    leftIcon={isPulling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  >
                    {isPulling ? 'Syncing...' : 'Pull Orders'}
                  </Button>
                }
              />
            )}
          </OperationsPanel>
        </div>
      </div>
    </OperationsPage>
  );
});

export default Outward;
