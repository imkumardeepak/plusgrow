import React, { memo, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Send, Truck, User } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

import { Badge } from '../components/atoms/Badge';
import { Button } from '../components/atoms/Button';
import { OperationsEmptyState, OperationsPage, OperationsPanel } from '../components/organisms/Operations/OperationsShell';
import { useWms } from '../context/WmsContext';

export const Dispatch = memo(function Dispatch() {
  const { salesInvoices, updateSalesInvoiceStatus } = useWms();
  const [selectedSi, setSelectedSi] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const openOrders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return salesInvoices.filter(
      (si) =>
        si.status === 'Open' &&
        (si.siNumber.toLowerCase().includes(query) ||
          si.customerName.toLowerCase().includes(query) ||
          si.sku.toLowerCase().includes(query))
    );
  }, [salesInvoices, searchQuery]);

  const activeOrder = salesInvoices.find((si) => si.id === selectedSi);
  const dispatchedOrders = salesInvoices.filter((si) => si.status === 'Dispatched').length;
  const dispatchProgress = salesInvoices.length > 0 ? Math.round((dispatchedOrders / salesInvoices.length) * 100) : 0;

  const handleDispatch = () => {
    if (!activeOrder) return;

    updateSalesInvoiceStatus(activeOrder.id, 'Dispatched');
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.65 }, colors: ['#11a7df', '#43d4ff', '#10b981'] });
    toast.success(`Order ${activeOrder.siNumber} dispatched`);
    setSelectedSi('');
  };

  const getCartonId = (id: string) => `CTN-${id.substring(0, 6).toUpperCase()}`;

  return (
    <OperationsPage
      title="Dispatch"
      description="Finalize packed orders, confirm shipping details, and close the order lifecycle."
      icon={Send}
      metrics={[
        { label: 'Awaiting Dispatch', value: openOrders.length, tone: 'warning' },
        { label: 'Dispatched Orders', value: dispatchedOrders, tone: 'success' },
        { label: 'Completion', value: `${dispatchProgress}%`, tone: 'brand' },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <OperationsPanel
          title="Dispatch Queue"
          icon={ClipboardList}
          description="Open orders ready for final shipment."
        >
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order, customer, or SKU..."
            className="mb-3 h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />

          {openOrders.length > 0 ? (
            <div className="max-h-[540px] space-y-2 overflow-y-auto scrollbar-thin">
              {openOrders.map((order) => {
                const active = order.id === selectedSi;

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedSi(order.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-brand-500/40 bg-brand-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-brand-500/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{order.siNumber}</p>
                        <p className="mt-1 text-xs text-neutral-400">{order.customerName}</p>
                      </div>
                      <Badge variant="warning" shape="pill" className="border-none">
                        Ready
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">SKU</p>
                        <p className="mt-1 font-mono text-brand-300">{order.sku}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">Qty</p>
                        <p className="mt-1 font-bold text-white">{order.quantity}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <OperationsEmptyState
              icon={Truck}
              title="Nothing waiting"
              description="No open orders are waiting for dispatch."
            />
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Dispatch Workspace"
          icon={Truck}
          description="Review selected order and confirm shipment."
        >
          {activeOrder ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{activeOrder.siNumber}</p>
                    <p className="mt-1 text-xs text-neutral-300">{activeOrder.customerName}</p>
                  </div>
                  <Badge variant="warning" shape="pill" className="border-none">
                    Ready to Ship
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Carton ID</p>
                  <p className="mt-2 font-mono text-xl font-black text-brand-300">{getCartonId(activeOrder.id)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Ship Date</p>
                  <p className="mt-2 text-xl font-black text-white">{activeOrder.siDate}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Customer</p>
                  <div className="mt-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-brand-400" />
                    <p className="text-sm font-semibold text-white">{activeOrder.customerName}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Shipment</p>
                  <p className="mt-2 text-sm font-semibold text-white">{activeOrder.sku} · {activeOrder.quantity} units</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-400" />
                  <p className="text-sm font-semibold text-white">Dispatch Check</p>
                </div>
                <p className="text-sm text-neutral-400">
                  Confirm packed order, carton ID, and customer details before shipment. Dispatch action will close the order.
                </p>
              </div>

              <Button
                onClick={handleDispatch}
                leftIcon={<Truck className="h-4 w-4" />}
              >
                Dispatch Order
              </Button>
            </div>
          ) : (
            <OperationsEmptyState
              icon={Send}
              title="No order selected"
              description="Choose dispatch queue item from the left to review shipment details."
            />
          )}
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

export default Dispatch;
