import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  MapPin,
  Package,
  ScanLine,
} from "lucide-react";

import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  OutwardOrder,
  outwardOrdersApi,
  productAllottedLocationsApi,
  ProductAllottedLocationRecord,
} from "../services/masterApi";
import { toast } from "../lib/toast";

export const Packing = memo(function Packing() {
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [locations, setLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPicking, setIsPicking] = useState(false);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersData, locationsData] = await Promise.all([
        outwardOrdersApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setOrders(ordersData);
      setLocations(locationsData);
    } catch {
      toast.error("Failed to load packing data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openOrders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        (order.status === "Open" || order.status === "Picking" || order.status === "Packed") &&
        (order.orderNumber.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.skuCode.toLowerCase().includes(query)),
    );
  }, [orders, searchQuery]);

  const activeOrder = openOrders.find((row) => row.id === selectedOrderId) ?? null;
  const locationRow =
    activeOrder
      ? locations.find((row) => row.productId === activeOrder.productId) ?? null
      : null;

  const locationSummary = useMemo(() => {
    if (!locationRow) return "Not mapped";
    const entries = Object.entries(locationRow.locationJson || {});
    if (entries.length === 0) return "Not mapped";
    return entries
      .slice(0, 3)
      .map(([code, qty]) => `${code} (${qty})`)
      .join(", ");
  }, [locationRow]);

  const readyOrders = openOrders.filter((row) => row.status === "Packed").length;
  const pickedOrders = openOrders.filter((row) => row.pendingQuantity === 0).length;
  const progress = openOrders.length > 0 ? Math.round((pickedOrders / openOrders.length) * 100) : 0;
  const isFullyPicked = activeOrder ? activeOrder.pendingQuantity === 0 : false;

  const handlePick = async () => {
    if (!activeOrder) return;

    try {
      setIsPicking(true);
      const updated = await outwardOrdersApi.pick(activeOrder.id, { quantity: 1 });
      setOrders((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      toast.success(
        updated.pendingQuantity === 0
          ? `${updated.orderNumber} is packed and ready for dispatch`
          : `Picked 1 unit for ${updated.orderNumber}`,
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update picking progress");
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <OperationsPage
      title="Picking & Packing"
      description="Select a live outward order, review mapped pick locations, and complete picking until the order is packed."
      icon={Package}
      metrics={[
        { label: "Active Orders", value: openOrders.length, tone: "warning" },
        { label: "Ready For Dispatch", value: readyOrders, tone: "success" },
        { label: "Completion", value: `${progress}%`, tone: "brand" },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <OperationsPanel
          title="Open Orders"
          icon={ClipboardList}
          description="Choose a live outward order to start picking."
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
                const done = order.pendingQuantity === 0;
                const active = order.id === selectedOrderId;

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-brand-500/40 bg-brand-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-brand-500/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{order.orderNumber}</p>
                        <p className="mt-1 text-xs text-neutral-400">{order.customerName}</p>
                      </div>
                      <Badge variant={done ? "success" : "warning"} shape="pill" className="border-none">
                        {done ? "Ready" : order.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">SKU</p>
                        <p className="mt-1 font-mono text-brand-300">{order.skuCode}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">Picked</p>
                        <p className="mt-1 font-bold text-white">{order.pickedQuantity} / {order.quantity}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <OperationsEmptyState
              icon={ClipboardList}
              title="No active orders"
              description="No open outward orders are waiting for picking."
            />
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Packing Workspace"
          icon={ScanLine}
          description="Use order details and mapped locations to complete picking."
        >
          {activeOrder ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{activeOrder.orderNumber}</p>
                    <p className="mt-1 text-xs text-neutral-300">{activeOrder.customerName}</p>
                  </div>
                  <Badge variant={isFullyPicked ? "success" : "warning"} shape="pill" className="border-none">
                    {isFullyPicked ? "Ready for Dispatch" : activeOrder.status}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Product</p>
                    <p className="mt-1 text-sm font-semibold text-white">{activeOrder.productName}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">SKU</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-brand-300">{activeOrder.skuCode}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Location</p>
                    <p className="mt-1 text-sm font-semibold text-white">{locationSummary}</p>
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
                  <p className="mt-2 text-2xl font-black text-brand-300">{activeOrder.pickedQuantity}</p>
                </div>
                <div className="rounded-2xl border border-warning-500/20 bg-warning-500/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Pending Qty</p>
                  <p className="mt-2 text-2xl font-black text-warning-400">{activeOrder.pendingQuantity}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => void handlePick()}
                  disabled={isFullyPicked}
                  loading={isPicking}
                  leftIcon={<Package className="h-4 w-4" />}
                >
                  Pick 1 Unit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dispatch")}
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
                  Pick against the mapped outward locations. When picked quantity reaches required quantity, the order is packed automatically.
                </p>
              </div>
            </div>
          ) : (
            <OperationsEmptyState
              icon={Package}
              title="No order selected"
              description="Choose a live outward order from the left to start picking."
            />
          )}
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

export default Packing;
