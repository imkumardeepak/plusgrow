import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  Archive,
  ArrowLeft,
  Box as BoxIcon,
  CheckCircle2,
  ClipboardList,
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
} from "../services/masterApi";
import { toast } from "../lib/toast";

type PackingOrderGroup = {
  salesOrderId: number;
  orderNumber: string;
  customerName: string;
  items: OutwardOrder[];
  totalQuantity: number;
  packedQuantity: number;
};

const isCanceledOrder = (order: OutwardOrder) =>
  order.status === "Canceled" || order.salesOrderStatus === "Canceled";

export const Packing = memo(function Packing() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingPacked, setIsMarkingPacked] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const ordersData = await outwardOrdersApi.getAll({ status: "picked" });
      setOrders(ordersData);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const activeOrders = orders.filter(
      (order) =>
        !isCanceledOrder(order) &&
        order.status === "Picked",
    );
    if (!query) return activeOrders;
    return activeOrders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.skuCode.toLowerCase().includes(query) ||
        (order.alias && order.alias.toLowerCase().includes(query)),
    );
  }, [orders, searchQuery]);

  const groupedOrders = useMemo<PackingOrderGroup[]>(() => {
    const groups = new Map<number, PackingOrderGroup>();

    filteredOrders.forEach((order) => {
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
        packedQuantity: 0,
      });
    });

    return Array.from(groups.values()).sort((a, b) => b.orderNumber.localeCompare(a.orderNumber));
  }, [filteredOrders]);

  useEffect(() => {
    if (!isMobile && !selectedSalesOrderId && groupedOrders.length > 0) {
      setSelectedSalesOrderId(groupedOrders[0].salesOrderId);
    }
    if (
      selectedSalesOrderId &&
      !groupedOrders.some((row) => row.salesOrderId === selectedSalesOrderId)
    ) {
      setSelectedSalesOrderId(!isMobile ? (groupedOrders[0]?.salesOrderId ?? null) : null);
    }
  }, [groupedOrders, selectedSalesOrderId, isMobile]);

  const activeGroup =
    groupedOrders.find((row) => row.salesOrderId === selectedSalesOrderId) ?? null;

  useEffect(() => {
    if (!activeGroup) {
      setActiveItemId(null);
      return;
    }

    const preferredItemId = activeGroup.items[0]?.id ?? null;
    setActiveItemId((current) =>
      activeGroup.items.some((item) => item.id === current) ? current : preferredItemId,
    );
  }, [activeGroup]);

  const activeOrder =
    activeGroup?.items.find((row) => row.id === activeItemId) ?? activeGroup?.items[0] ?? null;

  const handleMarkPacked = async () => {
    if (!activeOrder) {
      toast.error("Select order first");
      return;
    }

    try {
      setIsMarkingPacked(true);
      await outwardOrdersApi.markPacked(activeOrder.id);
      setOrders((current) => current.filter((item) => item.id !== activeOrder.id));
      toast.success(`${activeOrder.skuCode} marked as packed`);
    } catch (error: any) {
      toast.error(error.message || "Failed to mark packed");
    } finally {
      setIsMarkingPacked(false);
    }
  };

  return (
    <OperationsPage
      title="Packing"
      description="Review picked items and mark them packed."
      icon={Archive}
      hideHeader
    >
      <div className={isMobile ? "space-y-4" : "grid gap-4 xl:grid-cols-[0.82fr_1.18fr]"}>
        {(!isMobile || !activeOrder) && (
          <OperationsPanel
            title="Orders Ready to Pack"
            icon={ClipboardList}
            description="Select a picked order to mark packed."
            hideHeader={isMobile}
            action={
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                  {filteredOrders.length} Orders
                </span>
              </div>
            }
          >
            {isMobile && (
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="rounded-md bg-white/[0.05] px-2.5 py-1.5 text-xs font-semibold text-neutral-300">
                  {filteredOrders.length} Orders
                </span>
              </div>
            )}

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order, customer, SKU or alias..."
              className="mb-3 h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />

            {groupedOrders.length > 0 ? (
              <div className="max-h-[580px] space-y-2 overflow-y-auto scrollbar-thin">
                {groupedOrders.map((order) => {
                  const active = order.salesOrderId === selectedSalesOrderId;
                  const done = order.items.every((item) => item.status === "Packed");

                  return (
                    <button
                      key={order.salesOrderId}
                      onClick={() => setSelectedSalesOrderId(order.salesOrderId)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-brand-500/40 bg-brand-500/10"
                          : "border-white/10 bg-white/[0.03] hover:border-brand-500/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {order.orderNumber}
                          </p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {order.customerName}
                          </p>
                        </div>
                        <Badge
                          variant={done ? "success" : "warning"}
                          shape="pill"
                          className="border-none"
                        >
                          {done ? "Done" : "Packing"}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="uppercase tracking-[0.18em] text-neutral-500">
                            Items
                          </p>
                          <p className="mt-1 font-mono text-brand-300">
                            {order.items.length}
                          </p>
                        </div>
                        <div>
                          <p className="uppercase tracking-[0.18em] text-neutral-500">
                            Quantity
                          </p>
                          <p className="mt-1 font-bold text-white">
                            {order.totalQuantity}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <OperationsEmptyState
                icon={ClipboardList}
                title="No orders"
                description="No picked orders ready for packing."
              />
            )}
          </OperationsPanel>
        )}

        {(!isMobile || activeOrder) && (
          <OperationsPanel
            title="Packing"
            icon={BoxIcon}
            description="Review picked item and mark it packed."
            hideHeader={isMobile}
          >
            {activeOrder && activeGroup ? (
              <Stack gap="md">
                {isMobile && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setSelectedSalesOrderId(null)}
                    leftIcon={<ArrowLeft size={14} />}
                    className="mb-1 w-full"
                  >
                    Back to Orders
                  </Button>
                )}

                {/* Order Header */}
                <Paper radius="md" p="sm" withBorder>
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text size="xs" fw={700}>
                        {activeGroup.orderNumber}
                      </Text>
                      <Text size="11px" c="dimmed">
                        {activeGroup.customerName}
                      </Text>
                    </div>
                    <Badge
                      variant="warning"
                      shape="pill"
                      className="border-none"
                    >
                      Ready to Pack
                    </Badge>
                  </Group>
                  <Group gap="xs" mt="xs">
                    <Text size="11px" c="dimmed">
                      Active Code:
                    </Text>
                    <Text size="11px" ff="monospace" c="cyan.3">
                      {activeOrder.skuCode}
                      {activeOrder.alias ? ` / ${activeOrder.alias}` : ""}
                    </Text>
                  </Group>
                </Paper>

                {activeGroup.items.length > 1 && (
                  <Paper radius="md" p="sm" withBorder>
                    <Text size="xs" fw={700} mb="xs">
                      Order Items
                    </Text>
                    <Stack gap="xs">
                      {activeGroup.items.map((item) => {
                        const isActiveItem = item.id === activeOrder.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveItemId(item.id)}
                            className={`w-full rounded-lg border p-2.5 text-left transition ${
                              isActiveItem
                                ? "border-brand-500/40 bg-brand-500/10"
                                : "border-white/10 bg-white/[0.02] hover:border-brand-500/20 hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-white">
                                  {item.productName}
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-brand-300">
                                  {item.skuCode}
                                  {item.alias ? ` / ${item.alias}` : ""}
                                </p>
                              </div>
                              <Badge
                                variant={item.status === "Packed" ? "success" : "warning"}
                                shape="pill"
                                className="border-none"
                              >
                                {item.quantity} units
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </Stack>
                  </Paper>
                )}

                {/* Mark Packed */}
                <Paper radius="md" p="sm" withBorder>
                  <Group justify="space-between" align="flex-start" gap="sm">
                    <Box>
                      <Text size="xs" fw={700}>
                        Mark Packed
                      </Text>
                      <Text size="11px" c="dimmed" mt={2}>
                        Confirm this picked item is packed and ready for dispatch.
                      </Text>
                    </Box>
                    <Text size="xs" fw={800}>
                      Qty: {activeOrder.quantity}
                    </Text>
                  </Group>
                  <Text size="11px" c="dimmed" mt={4}>
                    {activeOrder.skuCode}
                    {activeOrder.alias ? ` / ${activeOrder.alias}` : ""}
                  </Text>
                  <Group justify="flex-end" mt="sm">
                    <Button
                      size="xs"
                      onClick={() => void handleMarkPacked()}
                      loading={isMarkingPacked}
                      leftIcon={<CheckCircle2 size={14} />}
                      className={isMobile ? "w-full" : ""}
                    >
                      Mark Packed
                    </Button>
                  </Group>
                </Paper>
              </Stack>
            ) : (
              <OperationsEmptyState
                icon={BoxIcon}
                title="No order selected"
                description="Select a picked order from the left to mark it packed."
              />
            )}
          </OperationsPanel>
        )}
      </div>
    </OperationsPage>
  );
});

export default Packing;
