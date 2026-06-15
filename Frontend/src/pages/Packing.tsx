import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Group, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  Archive,
  ArrowLeft,
  Box as BoxIcon,
  CheckCircle2,
  ClipboardList,
  Package,
  Plus,
  ScanLine,
  Trash2,
  XCircle,
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
  PackingCarton,
  packingCartonsApi,
} from "../services/masterApi";
import { toast } from "../lib/toast";

type ScanTone = "idle" | "success" | "error";

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
  const [scanCode, setScanCode] = useState("");
  const [lastScanCode, setLastScanCode] = useState("");
  const [lastScanMessage, setLastScanMessage] = useState(
    "Select order to start packing.",
  );
  const [scanTone, setScanTone] = useState<ScanTone>("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isPacking, setIsPacking] = useState(false);
  const [isMarkingPacked, setIsMarkingPacked] = useState(false);
  const [cartons, setCartons] = useState<PackingCarton[]>([]);
  const [activeCartonId, setActiveCartonId] = useState<number | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const ordersData = await outwardOrdersApi.getAll({ status: "packed" });
      setOrders(ordersData);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCartons = useCallback(async (orderId: number) => {
    try {
      const data = await packingCartonsApi.getByOrder(orderId);
      setCartons(data);
      // Auto-select first open carton if none active
      const openCarton = data.find((c) => c.status === "Open");
      if (openCarton) {
        setActiveCartonId(openCarton.id);
      } else {
        setActiveCartonId(null);
      }
    } catch {
      setCartons([]);
      setActiveCartonId(null);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const activeOrders = orders.filter((order) => !isCanceledOrder(order));
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
    if (activeItemId) {
      void loadCartons(activeItemId);
    } else {
      setCartons([]);
      setActiveCartonId(null);
    }
  }, [activeItemId, loadCartons]);

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

  const packedInCartons = useMemo(
    () => cartons.reduce((sum, c) => sum + c.quantity, 0),
    [cartons],
  );

  const remainingToPack = activeOrder
    ? Math.max(activeOrder.quantity - packedInCartons, 0)
    : 0;

  const isFullyPacked = remainingToPack === 0;

  useEffect(() => {
    if (!activeOrder) return;
    setLastScanMessage("Scan SKU or Alias to pack into active carton.");
    setScanTone("idle");
    setScanCode("");
    window.setTimeout(() => scanInputRef.current?.focus(), 0);
  }, [activeOrder?.id, activeCartonId]);

  const handleCreateCarton = async () => {
    if (!activeOrder) return;
    try {
      const carton = await packingCartonsApi.create(activeOrder.id);
      setCartons((current) => [...current, carton]);
      setActiveCartonId(carton.id);
      toast.success(`Carton ${carton.cartonNumber} created`);
      window.setTimeout(() => scanInputRef.current?.focus(), 0);
    } catch (error: any) {
      toast.error(error.message || "Failed to create carton");
    }
  };

  const handlePackScan = async () => {
    if (!activeOrder) {
      toast.error("Select order first");
      return;
    }
    if (!activeCartonId) {
      toast.error("Create or select a carton first");
      return;
    }
    if (isFullyPacked) {
      toast.error("Order is fully packed");
      setScanCode("");
      return;
    }

    const normalizedScan = scanCode.trim().split("#")[0].trim();
    if (!normalizedScan) {
      toast.error("Scan SKU or Alias");
      return;
    }

    setLastScanCode(normalizedScan);
    setIsPacking(true);

    try {
      const updatedCarton = await packingCartonsApi.packItem(
        activeCartonId,
        normalizedScan,
      );
      setCartons((current) =>
        current.map((c) => (c.id === updatedCarton.id ? updatedCarton : c)),
      );
      setScanTone("success");
      setLastScanMessage(
        `Packed 1 into ${updatedCarton.cartonNumber} (${updatedCarton.quantity} items)`,
      );
      toast.success(`Packed into ${updatedCarton.cartonNumber}`);
      setScanCode("");
      window.setTimeout(() => scanInputRef.current?.focus(), 0);
    } catch (error: any) {
      setScanTone("error");
      setLastScanMessage(error.message || "Pack failed.");
      toast.error(error.message || "Pack failed");
      setScanCode("");
      window.setTimeout(() => scanInputRef.current?.focus(), 0);
    } finally {
      setIsPacking(false);
    }
  };

  const handleMarkReady = async (carton: PackingCarton) => {
    try {
      const updated = await packingCartonsApi.markReady(carton.id);
      setCartons((current) =>
        current.map((c) => (c.id === updated.id ? updated : c)),
      );
      // If the ready carton was active, clear active selection
      if (activeCartonId === carton.id) {
        const nextOpen = cartons.find(
          (c) => c.id !== carton.id && c.status === "Open",
        );
        setActiveCartonId(nextOpen?.id ?? null);
      }
      toast.success(`${carton.cartonNumber} marked as ready`);
    } catch (error: any) {
      toast.error(error.message || "Failed to mark ready");
    }
  };

  const handleMarkPacked = async () => {
    if (!activeOrder) {
      toast.error("Select order first");
      return;
    }

    try {
      setIsMarkingPacked(true);
      const carton = await packingCartonsApi.markOrderPacked(activeOrder.id);
      setCartons((current) => {
        const exists = current.some((item) => item.id === carton.id);
        if (exists) {
          return current.map((item) => (item.id === carton.id ? carton : item));
        }
        return [...current, carton];
      });
      setOrders((current) => current.filter((item) => item.id !== activeOrder.id));
      setLastScanCode("");
      setLastScanMessage("Marked packed without box packing.");
      setScanTone("success");
      toast.success(`${activeOrder.skuCode} marked as packed`);
    } catch (error: any) {
      setScanTone("error");
      setLastScanMessage(error.message || "Failed to mark packed.");
      toast.error(error.message || "Failed to mark packed");
    } finally {
      setIsMarkingPacked(false);
    }
  };

  const handleDeleteCarton = async (carton: PackingCarton) => {
    try {
      await packingCartonsApi.delete(carton.id);
      setCartons((current) => current.filter((c) => c.id !== carton.id));
      if (activeCartonId === carton.id) {
        const remainingOpen = cartons.find(
          (c) => c.id !== carton.id && c.status === "Open",
        );
        setActiveCartonId(remainingOpen?.id ?? null);
      }
      toast.success(`${carton.cartonNumber} deleted`);
    } catch {
      toast.error("Failed to delete carton");
    }
  };

  const readyCartons = cartons.filter((c) => c.status === "Ready").length;

  return (
    <OperationsPage
      title="Packing"
      description="Pack picked items into cartons. Scan SKU or Alias to add items, create cartons, and mark them ready."
      icon={Archive}
      hideHeader
    >
      <div className={isMobile ? "space-y-4" : "grid gap-4 xl:grid-cols-[0.82fr_1.18fr]"}>
        {(!isMobile || !activeOrder) && (
          <OperationsPanel
            title="Orders Ready to Pack"
            icon={ClipboardList}
            description="Select a picked order to pack into cartons."
            hideHeader={isMobile}
            action={
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                  {filteredOrders.length} Orders
                </span>
                <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                  {readyCartons} Ready Cartons
                </span>
              </div>
            }
          >
            {isMobile && (
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="rounded-md bg-white/[0.05] px-2.5 py-1.5 text-xs font-semibold text-neutral-300">
                  {filteredOrders.length} Orders
                </span>
                <span className="rounded-md bg-white/[0.05] px-2.5 py-1.5 text-xs font-semibold text-neutral-300">
                  {readyCartons} Ready Cartons
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
            title="Carton Packing"
            icon={BoxIcon}
            description="Create cartons and scan SKU or Alias into cartons."
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
                      variant={isFullyPacked ? "success" : "warning"}
                      shape="pill"
                      className="border-none"
                    >
                      {isFullyPacked ? "Fully Packed" : "Packing"}
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

                {/* Progress */}
                <Paper radius="md" p="sm" withBorder>
                  <Group justify="space-between" align="flex-start" gap="sm">
                    <Box>
                      <Text size="xs" fw={700}>
                        Active Item Packing Progress
                      </Text>
                      <Text size="11px" c="dimmed" mt={2}>
                        Pack into cartons or mark packed without box packing.
                      </Text>
                    </Box>
                    <Text size="xs" fw={800}>
                      {packedInCartons} / {activeOrder.quantity}
                    </Text>
                  </Group>
                  <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-brand-500 transition-all"
                      style={{
                        width: `${Math.min((packedInCartons / activeOrder.quantity) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <Text size="11px" c="dimmed" mt={4}>
                    {remainingToPack} remaining for {activeOrder.skuCode}
                    {activeOrder.alias ? ` / ${activeOrder.alias}` : ""} · {cartons.length} cartons ·{" "}
                    {readyCartons} ready
                  </Text>
                  <Group justify="flex-end" mt="sm">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => void handleMarkPacked()}
                      loading={isMarkingPacked}
                      disabled={isFullyPacked}
                      leftIcon={<CheckCircle2 size={14} />}
                      className={isMobile ? "w-full" : ""}
                    >
                      Mark Packed
                    </Button>
                  </Group>
                </Paper>

                {/* Carton List */}
                <Paper radius="md" p="sm" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text size="xs" fw={700}>
                      Cartons
                    </Text>
                    <Button
                      size="xs"
                      variant="outline"
                      leftIcon={<Plus size={14} />}
                      onClick={handleCreateCarton}
                    >
                      New Carton
                    </Button>
                  </Group>

                  {cartons.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No cartons yet. Create one to start packing.
                    </Text>
                  ) : (
                    <Stack gap="xs">
                      {cartons.map((carton) => {
                        const isActive = carton.id === activeCartonId;
                        const isReady = carton.status === "Ready";
                        return (
                          <Paper
                            key={carton.id}
                            radius="md"
                            p="xs"
                            withBorder
                            bg={
                              isActive ? "rgba(30,192,243,0.08)" : "transparent"
                            }
                            style={{
                              borderColor: isActive
                                ? "rgba(30,192,243,0.3)"
                                : isReady
                                  ? "rgba(34,197,94,0.3)"
                                  : "rgba(255,255,255,0.12)",
                              cursor: isReady ? "default" : "pointer",
                            }}
                            onClick={() => {
                              if (!isReady) setActiveCartonId(carton.id);
                            }}
                          >
                            <Group justify="space-between" wrap="nowrap">
                              <Group gap="sm" wrap="nowrap">
                                <BoxIcon
                                  size={16}
                                  color={
                                    isReady
                                      ? "var(--mantine-color-green-4)"
                                      : isActive
                                        ? "var(--mantine-color-cyan-4)"
                                        : "var(--mantine-color-gray-4)"
                                  }
                                />
                                <div>
                                  <Text size="xs" fw={700}>
                                    {carton.cartonNumber}
                                  </Text>
                                  <Text size="11px" c="dimmed">
                                    {carton.quantity} items
                                  </Text>
                                </div>
                              </Group>
                              <Group gap="xs" wrap="nowrap">
                                {isReady ? (
                                  <Badge
                                    variant="success"
                                    shape="pill"
                                    size="sm"
                                    className="border-none"
                                  >
                                    Ready
                                  </Badge>
                                ) : (
                                  <>
                                    {isActive && (
                                      <Text size="10px" c="cyan.3" fw={700}>
                                        ACTIVE
                                      </Text>
                                    )}
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleMarkReady(carton);
                                      }}
                                      disabled={carton.quantity <= 0}
                                      leftIcon={<CheckCircle2 size={12} />}
                                    >
                                      Ready
                                    </Button>
                                  </>
                                )}
                                <Tooltip label="Delete carton">
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    className="h-7 w-7 px-0 text-red-400 hover:text-red-300"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleDeleteCarton(carton);
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </Tooltip>
                              </Group>
                            </Group>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>

                {/* Scan Section */}
                <Paper
                  radius="md"
                  p="sm"
                  withBorder
                  style={{
                    borderColor:
                      scanTone === "success"
                        ? "rgba(34,197,94,0.3)"
                        : scanTone === "error"
                          ? "rgba(239,68,68,0.3)"
                          : "rgba(255,255,255,0.12)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ScanLine className="h-3.5 w-3.5 text-brand-400" />
                    <p className="text-xs font-semibold text-white">
                      {activeCartonId
                        ? `Scan into ${cartons.find((c) => c.id === activeCartonId)?.cartonNumber || "carton"}`
                        : "Select a carton to scan"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      ref={scanInputRef}
                      value={scanCode}
                      onChange={(e) => setScanCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handlePackScan();
                        }
                      }}
                      placeholder={
                        activeCartonId
                          ? isFullyPacked
                            ? "Order fully packed"
                            : `Scan ${activeOrder.skuCode}${activeOrder.alias ? ` or ${activeOrder.alias}` : ""}`
                          : "Select a carton first"
                      }
                      disabled={!activeCartonId || isFullyPacked}
                      className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <Button
                        onClick={() => void handlePackScan()}
                        loading={isPacking}
                        disabled={!activeCartonId || isFullyPacked}
                        size="xs"
                        leftIcon={<Package className="h-3.5 w-3.5" />}
                        className="h-9"
                      >
                        Pack
                      </Button>
                      <Button
                        onClick={() => void handleMarkPacked()}
                        loading={isMarkingPacked}
                        disabled={isFullyPacked}
                        size="xs"
                        variant="outline"
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        className="h-9"
                      >
                        Mark Packed
                      </Button>
                    </div>
                  </div>

                  {/* Status Message */}
                  {lastScanMessage && (
                    <div className="mt-2 flex items-center gap-2">
                      {scanTone === "success" ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : scanTone === "error" ? (
                        <XCircle size={14} className="text-red-400" />
                      ) : null}
                      <Text size="11px" c="dimmed">
                        {lastScanMessage}
                      </Text>
                    </div>
                  )}
                  {lastScanCode && (
                    <Text size="11px" c="dimmed" mt={2}>
                      Last code: {lastScanCode}
                    </Text>
                  )}
                </Paper>
              </Stack>
            ) : (
              <OperationsEmptyState
                icon={BoxIcon}
                title="No order selected"
                description="Select a picked order from the left to start packing into cartons."
              />
            )}
          </OperationsPanel>
        )}
      </div>
    </OperationsPage>
  );
});

export default Packing;
