import React, { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, MapPin, Package, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

import { Badge } from '../components/atoms/Badge';
import { Button } from '../components/atoms/Button';
import { OperationsEmptyState, OperationsPage, OperationsPanel } from '../components/organisms/Operations/OperationsShell';
import { useWms } from '../context/WmsContext';

export const Packing = memo(function Packing() {
  const { salesInvoices, stock, products } = useWms();
  const [selectedSi, setSelectedSi] = useState('');
  const [pickedQty, setPickedQty] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
  const productDetails = activeOrder ? products.find((p) => p.sku === activeOrder.sku) : null;
  const stockLocation = activeOrder ? stock.find((s) => s.sku === activeOrder.sku) : null;

  const handlePick = () => {
    if (!activeOrder) return;

    const current = pickedQty[activeOrder.id] || 0;
    if (current >= activeOrder.quantity) {
      toast.error('Order already fully picked');
      return;
    }

    const nextQty = current + 1;
    setPickedQty((prev) => ({ ...prev, [activeOrder.id]: nextQty }));

    if (nextQty === activeOrder.quantity) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.65 }, colors: ['#10b981', '#11a7df'] });
      toast.success(`Order ${activeOrder.siNumber} fully picked`);
    } else {
      toast.success(`Picked 1 unit of ${activeOrder.sku}`);
    }
  };

  const allOpenOrders = salesInvoices.filter((si) => si.status === 'Open');
  const pickedOrders = allOpenOrders.filter((si) => (pickedQty[si.id] || 0) >= si.quantity).length;
  const pendingOrders = allOpenOrders.length;
  const progress = pendingOrders > 0 ? Math.round((pickedOrders / pendingOrders) * 100) : 0;
  const isFullyPicked = activeOrder ? (pickedQty[activeOrder.id] || 0) === activeOrder.quantity : false;
  const pendingUnits = activeOrder ? activeOrder.quantity - (pickedQty[activeOrder.id] || 0) : 0;

  return (
    <OperationsPage
      title="Picking & Packing"
      description="Select open sales order, verify stock location, then log picked quantity until order is ready for dispatch."
      icon={Package}
      metrics={[
        { label: 'Open Orders', value: pendingOrders, tone: 'warning' },
        { label: 'Fully Picked', value: pickedOrders, tone: 'success' },
        { label: 'Completion', value: `${progress}%`, tone: 'brand' },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <OperationsPanel
          title="Open Orders"
          icon={ClipboardList}
          description="Choose order to start picking."
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
                const picked = pickedQty[order.id] || 0;
                const done = picked >= order.quantity;
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
                      <Badge variant={done ? 'success' : 'warning'} shape="pill" className="border-none">
                        {done ? 'Ready' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">SKU</p>
                        <p className="mt-1 font-mono text-brand-300">{order.sku}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">Picked</p>
                        <p className="mt-1 font-bold text-white">{picked} / {order.quantity}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <OperationsEmptyState
              icon={ClipboardList}
              title="No open orders"
              description="Outward queue is empty or search found nothing."
            />
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Packing Workspace"
          icon={ScanLine}
          description="Use order details and stock location to complete picking."
        >
          {activeOrder ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{activeOrder.siNumber}</p>
                    <p className="mt-1 text-xs text-neutral-300">{activeOrder.customerName}</p>
                  </div>
                  <Badge variant={isFullyPicked ? 'success' : 'warning'} shape="pill" className="border-none">
                    {isFullyPicked ? 'Ready for Dispatch' : 'Picking'}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Product</p>
                    <p className="mt-1 text-sm font-semibold text-white">{productDetails?.title || 'Unknown Product'}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">SKU</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-brand-300">{activeOrder.sku}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Location</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {stockLocation ? `${stockLocation.rack}-${stockLocation.shelf}-${stockLocation.bin}` : 'Not mapped'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Required Qty</p>
                  <p className="mt-2 text-2xl font-black text-white">{activeOrder.quantity}</p>
                </div>
                <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Picked Qty</p>
                  <p className="mt-2 text-2xl font-black text-brand-300">{pickedQty[activeOrder.id] || 0}</p>
                </div>
                <div className="rounded-2xl border border-warning-500/20 bg-warning-500/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Pending Qty</p>
                  <p className="mt-2 text-2xl font-black text-warning-400">{pendingUnits}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handlePick}
                  disabled={isFullyPicked}
                  leftIcon={<Package className="h-4 w-4" />}
                >
                  Pick 1 Unit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dispatch')}
                  disabled={!isFullyPicked}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Move to Dispatch
                </Button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-400" />
                  <p className="text-sm font-semibold text-white">Operator Notes</p>
                </div>
                <p className="text-sm text-neutral-400">
                  Pick from shown location. When picked quantity reaches required quantity, order is ready for dispatch handoff.
                </p>
              </div>
            </div>
          ) : (
            <OperationsEmptyState
              icon={Package}
              title="No order selected"
              description="Choose an open order from the left to start picking."
            />
          )}
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

export default Packing;
