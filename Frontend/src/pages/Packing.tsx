import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Stack, Text, Modal, Textarea, NumberInput } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  Archive,
  Box as BoxIcon,
} from "lucide-react";

import { Button } from "../components/atoms/Button";
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

/** Normalize a code string for comparison (trim + uppercase) */
const normalizeCode = (value?: string | null) => (value || "").trim().toUpperCase();

/** Extract all possible tokens from a scanned string (handles multi-part QR codes) */
const extractTokens = (raw: string) => {
  const upper = normalizeCode(raw);
  const tokens = new Set<string>();
  if (upper) tokens.add(upper);
  upper
    .split(/[\s#|,;:/\\?&=]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .forEach((t) => tokens.add(t));
  return Array.from(tokens);
};

export const Packing = memo(function Packing() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingPacked, setIsMarkingPacked] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [isScanPacking, setIsScanPacking] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [isShortPackModalOpen, setIsShortPackModalOpen] = useState(false);
  const [shortPackQty, setShortPackQty] = useState<number>(0);
  const [shortPackRemark, setShortPackRemark] = useState("");
  const [isShortPacking, setIsShortPacking] = useState(false);

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
        current.packedQuantity += order.packedQuantity;
        return;
      }

      groups.set(salesOrderId, {
        salesOrderId,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        items: [order],
        totalQuantity: order.quantity,
        packedQuantity: order.packedQuantity,
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

    const preferredItemId =
      activeGroup.items.find((item) => item.packedQuantity < item.pickedQuantity)?.id ??
      activeGroup.items[0]?.id ??
      null;
    setActiveItemId((current) =>
      activeGroup.items.some((item) => item.id === current) ? current : preferredItemId,
    );
  }, [activeGroup]);

  const activeOrder =
    activeGroup?.items.find((row) => row.id === activeItemId) ?? activeGroup?.items[0] ?? null;
  const activeItemIndex = activeGroup && activeOrder
    ? activeGroup.items.findIndex((item) => item.id === activeOrder.id)
    : -1;
  const packingProgress = activeGroup && activeGroup.items.length > 0
    ? Math.round((activeGroup.packedQuantity / activeGroup.totalQuantity) * 100)
    : 0;
  const isActiveItemFullyScanned =
    !!activeOrder && activeOrder.packedQuantity >= activeOrder.pickedQuantity;

  const handleMarkPacked = async (
    orderToPack: OutwardOrder | null = activeOrder,
    options?: { auto?: boolean },
  ) => {
    if (!orderToPack) {
      toast.error("Select order first");
      return;
    }

    try {
      setIsMarkingPacked(true);
      if (orderToPack.packedQuantity < orderToPack.pickedQuantity) {
        toast.error(`Scan all units first. Packed ${orderToPack.packedQuantity} of ${orderToPack.pickedQuantity}`);
        return;
      }
      await outwardOrdersApi.markPacked(orderToPack.id);
      setOrders((current) => current.filter((item) => item.id !== orderToPack.id));
      toast.success(
        options?.auto
          ? `${orderToPack.skuCode} fully scanned and saved`
          : `${orderToPack.skuCode} marked as packed`,
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to mark packed");
    } finally {
      setIsMarkingPacked(false);
    }
  };

  const handleSavePacking = () => {
    if (!activeOrder) {
      toast.error("Select order first");
      return;
    }

    if (activeOrder.packedQuantity === activeOrder.pickedQuantity) {
      void handleMarkPacked(activeOrder);
      return;
    }

    setIsShortPackModalOpen(true);
  };

  useEffect(() => {
    if (activeOrder && isShortPackModalOpen) {
      setShortPackQty(activeOrder.packedQuantity);
      setShortPackRemark("");
    }
  }, [activeOrder, isShortPackModalOpen]);

  const handleShortPackSubmit = async () => {
    if (!activeOrder) return;
    if (shortPackQty < 0 || shortPackQty >= activeOrder.pickedQuantity) {
      toast.error("Packed quantity must be less than picked quantity");
      return;
    }
    if (!shortPackRemark.trim()) {
      toast.error("Please enter a reason for the shortage");
      return;
    }

    try {
      setIsShortPacking(true);
      await outwardOrdersApi.shortPack(activeOrder.id, {
        packedQuantity: shortPackQty,
        remark: shortPackRemark,
      });
      setOrders((current) => current.filter((item) => item.id !== activeOrder.id));
      setIsShortPackModalOpen(false);
      toast.success(`${activeOrder.skuCode} short-packed successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to short-pack order");
    } finally {
      setIsShortPacking(false);
    }
  };

  // ── Scanner: build lookup from active group items by SKU / Alias / Carton QR ──
  const itemLookup = useMemo(() => {
    const map = new Map<string, OutwardOrder>();
    if (!activeGroup) return map;
    for (const item of activeGroup.items) {
      if (item.skuCode) map.set(normalizeCode(item.skuCode), item);
      if (item.alias) map.set(normalizeCode(item.alias), item);
      if (item.cartonQr) map.set(normalizeCode(item.cartonQr), item);
    }
    return map;
  }, [activeGroup]);

  const focusScanner = () => {
    setTimeout(() => scanInputRef.current?.focus(), 10);
  };

  const handleScanPack = async () => {
    const raw = scanInput.trim();
    if (!raw) return;

    if (!activeGroup) {
      toast.warning("Select an order first");
      setScanInput("");
      return;
    }

    // Resolve scanned code to an item
    const tokens = extractTokens(raw);
    let matchedItem: OutwardOrder | undefined;
    for (const token of tokens) {
      const found = itemLookup.get(token);
      if (found) {
        matchedItem = found;
        break;
      }
    }

    setScanInput("");

    if (!matchedItem) {
      toast.error("Scanned code does not match any item in this order");
      focusScanner();
      return;
    }

    const scannedProductCode = normalizeCode(raw.split("#")[0]);
    const isCartonScan =
      !!matchedItem.cartonQr &&
      normalizeCode(matchedItem.cartonQr) === scannedProductCode;
    const increment =
      isCartonScan && matchedItem.cartonPerItem && matchedItem.cartonPerItem > 0
        ? matchedItem.cartonPerItem
        : 1;

    if (matchedItem.packedQuantity >= matchedItem.pickedQuantity) {
      toast.warning(`${matchedItem.skuCode} is fully scanned. Save the line to complete packing.`);
      setActiveItemId(matchedItem.id);
      focusScanner();
      return;
    }

    try {
      setIsScanPacking(true);
      const updated = await outwardOrdersApi.updatePackingQuantity(matchedItem.id, increment);
      setOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setActiveItemId(updated.id);
      if (updated.packedQuantity >= updated.pickedQuantity) {
        await handleMarkPacked(updated, { auto: true });
      } else {
        toast.success(`Packed ${updated.packedQuantity} of ${updated.pickedQuantity} for ${updated.skuCode}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to mark packed");
    } finally {
      setIsScanPacking(false);
      focusScanner();
    }
  };

  return (
    <OperationsPage
      title="Packing"
      description="Review picked items and mark them packed."
      icon={Archive}
      hideHeader
    >
      <div className="flex h-[calc(100dvh-105px)] lg:h-[calc(100dvh-175px)] flex-col gap-1 lg:gap-2 overflow-hidden">
        <OutboundStageNav active="packing" queueCount={groupedOrders.length} compactLabel="Ready" />
        <div className="flex-1 min-h-0 overflow-hidden">
          <OutboundSplitLayout
            showQueueOnMobile={!activeOrder}
        queue={
          <OutboundQueue
            title="Ready to Pack"
            count={groupedOrders.length}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search order, customer, SKU…"
            emptyTitle="Nothing to pack"
            emptyDescription="Picked orders will appear here when they are ready."
          >
            {groupedOrders.map((order) => (
              <OutboundQueueRow
                key={order.salesOrderId}
                active={order.salesOrderId === selectedSalesOrderId}
                orderNumber={order.orderNumber}
                customerName={order.customerName}
                status="Picked"
                primaryMetric={order.items.length}
                secondaryMetric={`${order.totalQuantity} units`}
                onClick={() => setSelectedSalesOrderId(order.salesOrderId)}
              />
            ))}
          </OutboundQueue>
        }
        workspace={
          activeOrder && activeGroup ? (
            <TaskWorkspace
              backLabel="Back to packing queue"
              onBack={() => setSelectedSalesOrderId(null)}
              orderNumber={activeGroup.orderNumber}
              customerName={activeGroup.customerName}
              status="Packing"
              progressLabel={`Line ${Math.max(activeItemIndex + 1, 1)} of ${activeGroup.items.length}`}
              progressValue={packingProgress}
              meta={
                <span className="font-mono text-xs font-black tabular-nums text-cyan-300">
                  {activeGroup.packedQuantity}/{activeGroup.totalQuantity}
                </span>
              }
              bottomDock={
                <ScannerDock
                  label="Scan SKU, Alias, or Carton QR"
                  value={scanInput}
                  onChange={setScanInput}
                  onSubmit={() => void handleScanPack()}
                  actionLabel="Pack"
                  placeholder="Scan barcode…"
                  disabled={isScanPacking || isMarkingPacked || isShortPacking}
                  loading={isScanPacking || isMarkingPacked}
                  inputRef={scanInputRef}
                  tone="cyan"
                />
              }
            >
              <TaskInstruction
                eyebrow="Current Packing Task"
                title={activeOrder.productName}
                description={`${activeOrder.skuCode}${activeOrder.alias ? ` / ${activeOrder.alias}` : ""}`}
                tone="cyan"
                icon={BoxIcon}
                metrics={[
                  { label: "Picked Qty", value: activeOrder.quantity, emphasis: true },
                  { label: "Packed Qty", value: `${activeOrder.packedQuantity}/${activeOrder.pickedQuantity}`, emphasis: true },
                  { label: "Remaining", value: Math.max(activeOrder.pickedQuantity - activeOrder.packedQuantity, 0) },
                  { label: "Line", value: `${Math.max(activeItemIndex + 1, 1)}/${activeGroup.items.length}` },
                ]}
              />

              <div className="mt-2">
                <Button
                  size="sm"
                  fullWidth
                  onClick={handleSavePacking}
                  loading={isMarkingPacked || isShortPacking}
                  color={isActiveItemFullyScanned ? "green" : "yellow"}
                >
                  {isActiveItemFullyScanned
                    ? "Save Full Quantity"
                    : `Save Less Quantity (${activeOrder.packedQuantity}/${activeOrder.pickedQuantity})`}
                </Button>
              </div>

              <CompactItems title="Order Items" count={activeGroup.items.length}>
                <div className="space-y-1">
                  {activeGroup.items.map((item) => (
                    <CompactItemRow
                      key={item.id}
                      active={item.id === activeOrder.id}
                      done={item.status === "Packed"}
                      productName={item.productName}
                      skuCode={`${item.skuCode}${item.alias ? ` / ${item.alias}` : ""}`}
                      quantity={`${item.packedQuantity}/${item.pickedQuantity}`}
                      onClick={() => setActiveItemId(item.id)}
                    />
                  ))}
                </div>
              </CompactItems>
            </TaskWorkspace>
          ) : (
            <div className="hidden min-h-[560px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-neutral-500 xl:grid">
              Select an order to begin packing.
            </div>
          )
        }
      />
        </div>
      </div>

      <Modal
        opened={isShortPackModalOpen}
        onClose={() => setIsShortPackModalOpen(false)}
        title="Confirm Less Packed Quantity"
        centered
        size="sm"
      >
        <Text size="md" mb="xl" color="dimmed">
          You scanned fewer items than were picked. Enter the reason before completing this line.
          The missing quantity will return to stock, and dispatch will use only the confirmed packed quantity.
        </Text>
        <Stack gap="lg">
          <NumberInput
            label={`Verified Packed Quantity (Picked: ${activeOrder?.pickedQuantity ?? 0})`}
            value={shortPackQty}
            readOnly
            min={0}
            max={(activeOrder?.pickedQuantity ?? 1) - 1}
            required
            size="sm"
            radius="md"
          />
          <Textarea
            label="Reason for shortage"
            placeholder="For example: 1 item damaged during packing…"
            required
            value={shortPackRemark}
            onChange={(e) => setShortPackRemark(e.currentTarget.value)}
            minRows={4}
            size="sm"
            radius="md"
            data-autofocus
          />
        </Stack>
        <div className="mt-8 flex justify-end gap-2.5">
          <Button variant="outline" color="gray" size="md" onClick={() => setIsShortPackModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleShortPackSubmit} loading={isShortPacking} color="yellow" size="md">
            Confirm Less Quantity
          </Button>
        </div>
      </Modal>
    </OperationsPage>
  );
});

export default Packing;
