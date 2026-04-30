import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Send, Truck, User } from "lucide-react";

import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { OutwardOrder, outwardOrdersApi } from "../services/masterApi";
import { toast } from "../lib/toast";

export const Dispatch = memo(function Dispatch() {
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartonId, setCartonId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const ordersData = await outwardOrdersApi.getAll();
      setOrders(ordersData);
    } catch {
      toast.error("Failed to load dispatch queue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dispatchQueue = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        order.status === "Packed" &&
        (order.orderNumber.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.skuCode.toLowerCase().includes(query)),
    );
  }, [orders, searchQuery]);

  const activeOrder = dispatchQueue.find((row) => row.id === selectedOrderId) ?? null;
  const dispatchedOrders = orders.filter((row) => row.status === "Dispatched").length;
  const dispatchProgress = orders.length > 0 ? Math.round((dispatchedOrders / orders.length) * 100) : 0;

  useEffect(() => {
    if (!activeOrder) {
      setCartonId("");
      return;
    }

    setCartonId(activeOrder.cartonId || `CTN-${activeOrder.orderNumber.replace("SO-", "")}`);
  }, [activeOrder]);

  const handleDispatch = async () => {
    if (!activeOrder) return;

    try {
      setIsDispatching(true);
      const updated = await outwardOrdersApi.dispatch(activeOrder.id, {
        cartonId: cartonId.trim() || null,
      });
      toast.success(`Order ${updated.orderNumber} dispatched`);
      setOrders((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedOrderId(null);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to dispatch order");
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <OperationsPage
      title="Dispatch"
      description="Finalize packed orders, confirm carton details, and close the outward order with live stock deduction."
      icon={Send}
      hideHeader
    >
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <OperationsPanel
          title="Dispatch Queue"
          icon={ClipboardList}
          description="Packed orders waiting."
          action={
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                {dispatchQueue.length} Waiting
              </span>
              <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                {dispatchedOrders} Done
              </span>
              <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                {dispatchProgress}% Complete
              </span>
            </div>
          }
        >
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order, customer, or SKU..."
            className="mb-3 h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />

          {dispatchQueue.length > 0 ? (
            <div className="max-h-[540px] space-y-2 overflow-y-auto scrollbar-thin">
              {dispatchQueue.map((order) => {
                const active = order.id === selectedOrderId;

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
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
                      <Badge variant="warning" shape="pill" className="border-none">
                        Ready
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">SKU</p>
                        <p className="mt-1 font-mono text-brand-300">{order.skuCode}</p>
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
              description="No packed orders are waiting for dispatch."
            />
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Dispatch Workspace"
          icon={Truck}
          description="Confirm shipment."
        >
          {activeOrder ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{activeOrder.orderNumber}</p>
                    <p className="mt-1 text-xs text-neutral-300">{activeOrder.customerName}</p>
                  </div>
                  <Badge variant="warning" shape="pill" className="border-none">
                    Ready to Ship
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Carton ID</p>
                  <p className="mt-2 font-mono text-xl font-black text-brand-300">{cartonId || "-"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Ship Date</p>
                  <p className="mt-2 text-xl font-black text-white">{activeOrder.orderDate.slice(0, 10)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Customer</p>
                  <div className="mt-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-brand-400" />
                    <p className="text-sm font-semibold text-white">{activeOrder.customerName}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Shipment</p>
                  <p className="mt-2 text-sm font-semibold text-white">{activeOrder.skuCode} · {activeOrder.quantity} units</p>
                </div>
              </div>

              <Input
                label="Carton ID"
                value={cartonId}
                onChange={(event) => setCartonId(event.target.value)}
                fullWidth
              />

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-400" />
                  <p className="text-sm font-semibold text-white">Dispatch Rule</p>
                </div>
                <p className="text-sm text-neutral-400">
                  Dispatch will close the order, reduce live stock quantity, and update allotted location balances.
                </p>
              </div>

              <Button
                onClick={() => void handleDispatch()}
                loading={isDispatching}
                leftIcon={<Truck className="h-4 w-4" />}
              >
                Dispatch Order
              </Button>
            </div>
          ) : (
            <OperationsEmptyState
              icon={Send}
              title="No order selected"
              description="Choose a packed order from the left to confirm shipment."
            />
          )}
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

export default Dispatch;
