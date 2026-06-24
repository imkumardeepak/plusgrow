import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ArrowLeft, ClipboardList, ScanLine, Send, Truck, User } from "lucide-react";

import { useMediaQuery } from "@mantine/hooks";
import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { OutwardOrder, outwardOrdersApi } from "../services/masterApi";
import { toast } from "../lib/toast";

type DispatchOrderGroup = {
  salesOrderId: number;
  orderNumber: string;
  customerName: string;
  items: OutwardOrder[];
  totalQuantity: number;
};

const isCanceledOrder = (order: OutwardOrder) =>
  order.status === "Canceled" || order.salesOrderStatus === "Canceled";

const isReadyForDispatch = (order: OutwardOrder) =>
  order.status === "Packed";

export const Dispatch = memo(function Dispatch() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const trackingInputRef = useRef<HTMLInputElement>(null);

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

  const dispatchQueue = useMemo<DispatchOrderGroup[]>(() => {
    const query = searchQuery.toLowerCase();
    const groups = new Map<number, DispatchOrderGroup>();

    orders
      .filter((order) => !isCanceledOrder(order) && order.status !== "Dispatched")
      .forEach((order) => {
      const salesOrderId = order.salesOrderId ?? 0;
      const current = groups.get(salesOrderId);
      if (current) {
        current.items.push(order);
        current.totalQuantity += order.quantity;
        return;
      }

      groups.set(salesOrderId, {
        salesOrderId,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        items: [order],
        totalQuantity: order.quantity,
      });
      });

    return Array.from(groups.values()).filter((group) => {
      const matchesSearch =
        !query ||
        group.orderNumber.toLowerCase().includes(query) ||
        group.customerName.toLowerCase().includes(query) ||
        group.items.some((item) => item.skuCode.toLowerCase().includes(query));

      const allReadyForDispatch = group.items.every(isReadyForDispatch);
      return matchesSearch && allReadyForDispatch;
    });
  }, [orders, searchQuery]);

  const activeOrder = dispatchQueue.find((row) => row.salesOrderId === selectedSalesOrderId) ?? null;
  const activeOrders = orders.filter((row) => !isCanceledOrder(row));
  const dispatchedOrders = activeOrders.filter((row) => row.status === "Dispatched").length;
  const dispatchProgress = activeOrders.length > 0 ? Math.round((dispatchedOrders / activeOrders.length) * 100) : 0;

  useEffect(() => {
    if (!activeOrder) {
      return;
    }
  }, [activeOrder]);

  // Clear tracking number when switching orders
  useEffect(() => {
    setTrackingNumber("");
  }, [selectedSalesOrderId]);

  useEffect(() => {
    if (!selectedSalesOrderId && dispatchQueue.length > 0) {
      setSelectedSalesOrderId(dispatchQueue[0].salesOrderId);
    }

    if (
      selectedSalesOrderId &&
      !dispatchQueue.some((row) => row.salesOrderId === selectedSalesOrderId)
    ) {
      setSelectedSalesOrderId(dispatchQueue[0]?.salesOrderId ?? null);
    }
  }, [dispatchQueue, selectedSalesOrderId]);

  const handleDispatch = async () => {
    if (!activeOrder) return;

    try {
      setIsDispatching(true);
      await outwardOrdersApi.dispatchSalesOrder(
        activeOrder.salesOrderId,
        trackingNumber.trim() || undefined,
      );
      toast.success(`Order ${activeOrder.orderNumber} dispatched`);
      setSelectedSalesOrderId(null);
      setTrackingNumber("");
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
      <div className={isMobile ? "space-y-2" : "grid gap-2.5 xl:grid-cols-[0.82fr_1.18fr]"}>
        {(!isMobile || !activeOrder) && (
          <OperationsPanel
            title="Dispatch Queue"
            icon={ClipboardList}
            description="Packed orders waiting."
            hideHeader={isMobile}
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
            {isMobile && (
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="flex-1 text-center rounded-md bg-white/[0.05] px-2.5 py-2 text-sm font-semibold text-neutral-300">
                  {dispatchQueue.length} Waiting
                </span>
                <span className="flex-1 text-center rounded-md bg-white/[0.05] px-2.5 py-2 text-sm font-semibold text-neutral-300">
                  {dispatchedOrders} Done
                </span>
              </div>
            )}

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order, customer, or SKU..."
              className="mb-2 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/50"
            />

            {dispatchQueue.length > 0 ? (
              <div className="max-h-[65vh] space-y-2 overflow-y-auto scrollbar-thin pb-4">
                {dispatchQueue.map((order) => {
                  const active = order.salesOrderId === selectedSalesOrderId;

                  return (
                    <button
                      key={order.salesOrderId}
                      onClick={() => setSelectedSalesOrderId(order.salesOrderId)}
                      className={`w-full rounded-xl border p-2.5 text-left transition ${
                        active
                          ? "border-brand-500/50 bg-brand-500/10 shadow-[0_0_15px_rgba(var(--brand-500),0.15)]"
                          : "border-white/10 bg-white/[0.03] hover:border-brand-500/30 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-white">{order.orderNumber}</p>
                          <p className="mt-1 text-sm text-neutral-400">{order.customerName}</p>
                        </div>
                        <Badge variant="warning" shape="pill" size="sm" className="border-none font-bold">
                          Ready
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2.5 text-sm">
                        <div className="bg-black/20 p-2 rounded-lg">
                          <p className="uppercase tracking-[0.18em] text-[10px] text-neutral-500">Items</p>
                          <p className="mt-1 font-mono text-sm text-brand-300">{order.items.length}</p>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg">
                          <p className="uppercase tracking-[0.18em] text-[10px] text-neutral-500">Qty</p>
                          <p className="mt-1 font-bold text-sm text-white">{order.totalQuantity}</p>
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
        )}

        {(!isMobile || activeOrder) && (
          <OperationsPanel
            title="Dispatch Workspace"
            icon={Truck}
            description="Confirm shipment."
            hideHeader={isMobile}
          >
            {activeOrder ? (
              <div className="flex flex-col h-full space-y-2">
                {isMobile && (
                  <Button
                    variant="light"
                    size="md"
                    onClick={() => setSelectedSalesOrderId(null)}
                    leftIcon={<ArrowLeft className="h-5 w-5" />}
                    className="w-full mb-2"
                  >
                    Back to Queue
                  </Button>
                )}

                {/* Active Dispatch Header Card */}
                <div className="rounded-2xl border-2 border-brand-500/30 bg-brand-500/5 p-2.5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-tight">{activeOrder.orderNumber}</h2>
                      <p className="text-sm text-neutral-400 mt-1">{activeOrder.customerName}</p>
                    </div>
                    <Badge variant="warning" shape="pill" size="sm" className="border-none shadow-sm">
                      Ready to Ship
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Items</p>
                      <p className="mt-1 text-sm font-black text-brand-300">{activeOrder.items.length}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Ship Date</p>
                      <p className="mt-1 text-sm font-black text-white">{activeOrder.items[0]?.orderDate.slice(0, 10)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Customer</p>
                      <div className="mt-1 flex items-center gap-2">
                        <User className="h-4 w-4 text-brand-400" />
                        <p className="text-sm font-semibold text-white truncate max-w-[80px]" title={activeOrder.customerName}>{activeOrder.customerName}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Shipment Qty</p>
                      <p className="mt-1 text-sm font-black text-white">{activeOrder.totalQuantity}</p>
                    </div>
                  </div>
                </div>

                {/* Tracking & Action Section */}
                <div className="rounded-2xl border-2 border-indigo-500/30 bg-[#1A1A1A] p-3 shadow-xl transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-full">
                      <ScanLine size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Tracking Details</h3>
                      <p className="text-sm text-neutral-400">Scan or enter tracking ID manually</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <input
                      ref={trackingInputRef}
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && trackingNumber.trim()) {
                          e.preventDefault();
                          void handleDispatch();
                        }
                      }}
                      autoFocus
                      placeholder="e.g. AWB123456789 (Optional)"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-mono font-bold text-neutral-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <Button
                    size="sm"
                    fullWidth
                    color="indigo"
                    onClick={() => void handleDispatch()}
                    loading={isDispatching}
                    leftIcon={<Send size={24} />}
                    className="text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-shadow"
                  >
                    DISPATCH ORDER
                  </Button>
                </div>

                {/* Items List */}
                <div className="rounded-xl border border-white/10 bg-[#141414] flex-1 overflow-hidden flex flex-col min-h-[200px]">
                  <div className="mb-0 flex items-center justify-between p-2.5 bg-white/[0.03] border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-neutral-400" />
                      <p className="text-sm font-bold text-neutral-300">Order Items</p>
                    </div>
                    <Badge size="md" variant="outline">{activeOrder.items.length} items</Badge>
                  </div>
                  <div className="space-y-2 p-3 overflow-y-auto scrollbar-thin">
                    {activeOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-white">{item.productName}</p>
                            <p className="mt-1 font-mono text-xs text-brand-300">
                              {item.skuCode}
                              {item.alias ? ` / ${item.alias}` : ""}
                            </p>
                          </div>
                          <Badge variant="warning" shape="pill" className="border-none font-bold">
                            {item.quantity} units
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <OperationsEmptyState
                icon={Send}
                title="No order selected"
                description="Choose a packed order from the queue to confirm shipment."
              />
            )}
          </OperationsPanel>
        )}
      </div>
    </OperationsPage>
  );
});

export default Dispatch;
