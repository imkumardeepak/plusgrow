import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Truck } from "lucide-react";

import { useMediaQuery } from "@mantine/hooks";
import { OperationsPage } from "../components/organisms/Operations/OperationsShell";
import {
  CompactItemRow,
  CompactItems,
  OutboundQueue,
  OutboundQueueRow,
  OutboundSplitLayout,
  OutboundStageNav,
  ScannerDock,
  TaskInstruction,
  TaskWorkspace,
} from "../components/organisms/Operations/OutboundTaskUI";
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
    if (!isMobile && !selectedSalesOrderId && dispatchQueue.length > 0) {
      setSelectedSalesOrderId(dispatchQueue[0].salesOrderId);
    }

    if (
      selectedSalesOrderId &&
      !dispatchQueue.some((row) => row.salesOrderId === selectedSalesOrderId)
    ) {
      setSelectedSalesOrderId(!isMobile ? (dispatchQueue[0]?.salesOrderId ?? null) : null);
    }
  }, [dispatchQueue, selectedSalesOrderId, isMobile]);

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
      description="Finalize packed orders and confirm shipment."
      icon={Send}
      hideHeader
    >
      <div className="flex h-[calc(100dvh-105px)] lg:h-[calc(100dvh-175px)] flex-col gap-1 lg:gap-2 overflow-hidden">
        <OutboundStageNav active="dispatch" queueCount={dispatchQueue.length} compactLabel="Waiting" />
        <div className="flex-1 min-h-0 overflow-hidden">
          <OutboundSplitLayout
            showQueueOnMobile={!activeOrder}
        queue={
          <OutboundQueue
            title="Dispatch Queue"
            count={dispatchQueue.length}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search order, customer, SKU…"
            emptyTitle="Nothing waiting"
            emptyDescription="Packed orders will appear here when every line is ready."
          >
            {dispatchQueue.map((order) => (
              <OutboundQueueRow
                key={order.salesOrderId}
                active={order.salesOrderId === selectedSalesOrderId}
                orderNumber={order.orderNumber}
                customerName={order.customerName}
                status="Packed"
                primaryMetric={order.items.length}
                secondaryMetric={`${order.totalQuantity} units`}
                onClick={() => setSelectedSalesOrderId(order.salesOrderId)}
              />
            ))}
          </OutboundQueue>
        }
        workspace={
          activeOrder ? (
            <TaskWorkspace
              backLabel="Back to dispatch queue"
              onBack={() => setSelectedSalesOrderId(null)}
              orderNumber={activeOrder.orderNumber}
              customerName={activeOrder.customerName}
              status="Ready to Ship"
              progressLabel="Packed & ready"
              progressValue={100}
              meta={
                <span className="font-mono text-xs font-black tabular-nums text-indigo-300">
                  {activeOrder.totalQuantity} units
                </span>
              }
              bottomDock={
                <ScannerDock
                  label="Tracking / AWB"
                  value={trackingNumber}
                  onChange={setTrackingNumber}
                  onSubmit={() => void handleDispatch()}
                  actionLabel="Dispatch"
                  placeholder="Scan or enter AWB (optional)…"
                  disabled={isDispatching}
                  loading={isDispatching}
                  inputRef={trackingInputRef}
                  tone="indigo"
                />
              }
            >
              <TaskInstruction
                eyebrow="Shipment Confirmation"
                title="Verify the order, then dispatch"
                description="Tracking is optional. Scan an AWB or dispatch without one."
                tone="indigo"
                icon={Truck}
                metrics={[
                  { label: "Items", value: activeOrder.items.length, emphasis: true },
                  { label: "Quantity", value: activeOrder.totalQuantity, emphasis: true },
                  { label: "Ship Date", value: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(activeOrder.items[0]?.orderDate)) },
                  { label: "Progress", value: `${dispatchProgress}%` },
                ]}
              />
              <CompactItems title="Packed Items" count={activeOrder.items.length}>
                <div className="space-y-1">
                  {activeOrder.items.map((item) => (
                    <CompactItemRow
                      key={item.id}
                      done
                      productName={item.productName}
                      skuCode={`${item.skuCode}${item.alias ? ` / ${item.alias}` : ""}`}
                      quantity={`${item.quantity} qty`}
                    />
                  ))}
                </div>
              </CompactItems>
              <p className="mt-2 text-center text-[10px] leading-4 text-neutral-600">
                {dispatchedOrders} lines dispatched today · {dispatchProgress}% of loaded outward lines complete
              </p>
            </TaskWorkspace>
          ) : (
            <div className="hidden min-h-[560px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-neutral-500 xl:grid">
              Select an order to confirm dispatch.
            </div>
          )
        }
      />
        </div>
      </div>
    </OperationsPage>
  );
});

export default Dispatch;
