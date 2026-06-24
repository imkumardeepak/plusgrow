import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Group, Paper, Stack, Text, TextInput, Modal, Textarea, NumberInput } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  Archive,
  ArrowLeft,
  Box as BoxIcon,
  CheckCircle2,
  ClipboardList,
  ScanLine,
  AlertTriangle,
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

  useEffect(() => {
    if (activeOrder && isShortPackModalOpen) {
      setShortPackQty(activeOrder.quantity);
      setShortPackRemark("");
    }
  }, [activeOrder, isShortPackModalOpen]);

  const handleShortPackSubmit = async () => {
    if (!activeOrder) return;
    if (shortPackQty < 0 || shortPackQty >= activeOrder.quantity) {
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

    // Mark the matched item as packed
    try {
      setIsScanPacking(true);
      await outwardOrdersApi.markPacked(matchedItem.id);
      setOrders((current) => current.filter((item) => item.id !== matchedItem!.id));
      toast.success(`${matchedItem.skuCode} marked as packed via scan`);
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
      <div className={isMobile ? "space-y-2" : "grid gap-2.5 xl:grid-cols-[0.82fr_1.18fr]"}>
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
                <span className="w-full text-center rounded-md bg-white/[0.05] px-2.5 py-2 text-sm font-semibold text-neutral-300">
                  {filteredOrders.length} Orders Ready
                </span>
              </div>
            )}

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order, customer, SKU or alias..."
              className="mb-2 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/50"
            />

            {groupedOrders.length > 0 ? (
              <div className="max-h-[65vh] space-y-2 overflow-y-auto scrollbar-thin pb-4">
                {groupedOrders.map((order) => {
                  const active = order.salesOrderId === selectedSalesOrderId;
                  const done = order.items.every((item) => item.status === "Packed");

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
                          <p className="text-sm font-bold text-white">
                            {order.orderNumber}
                          </p>
                          <p className="mt-1 text-sm text-neutral-400">
                            {order.customerName}
                          </p>
                        </div>
                        <Badge
                          variant={done ? "success" : "warning"}
                          shape="pill"
                          size="sm"
                          className="border-none font-bold"
                        >
                          {done ? "Done" : "Packing"}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2.5 text-sm">
                        <div className="bg-black/20 p-2 rounded-lg">
                          <p className="uppercase tracking-[0.18em] text-[10px] text-neutral-500">
                            Items
                          </p>
                          <p className="mt-1 font-mono text-sm text-brand-300">
                            {order.items.length}
                          </p>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg">
                          <p className="uppercase tracking-[0.18em] text-[10px] text-neutral-500">
                            Quantity
                          </p>
                          <p className="mt-1 font-bold text-sm text-white">
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
            description="Review picked items and mark them packed."
            hideHeader={isMobile}
          >
            {activeOrder && activeGroup ? (
              <div className="flex flex-col h-full space-y-2">
                {isMobile && (
                  <Button
                    variant="light"
                    size="md"
                    onClick={() => setSelectedSalesOrderId(null)}
                    leftIcon={<ArrowLeft className="h-5 w-5" />}
                    className="w-full"
                  >
                    Back to Orders List
                  </Button>
                )}

                {/* Active Order Header Card */}
                <div className="rounded-2xl border-2 border-brand-500/30 bg-brand-500/5 p-2.5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-tight">
                        {activeGroup.orderNumber}
                      </h2>
                      <p className="text-sm text-neutral-400">
                        {activeGroup.customerName}
                      </p>
                    </div>
                    <Badge
                      variant="warning"
                      shape="pill"
                      size="sm"
                      className="border-none shadow-sm"
                    >
                      Packing
                    </Badge>
                  </div>
                </div>

                {/* Giant Scan Section */}
                <div className="rounded-2xl border-2 border-cyan-500/30 bg-[#1A1A1A] p-3 shadow-xl transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-full">
                      <ScanLine size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Scan to Pack</h3>
                      <p className="text-sm text-neutral-400">Scan SKU, Alias, or Carton QR</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <TextInput
                      ref={scanInputRef}
                      size="sm"
                      radius="md"
                      placeholder="Scan barcode..."
                      value={scanInput}
                      onChange={(e) => setScanInput(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleScanPack();
                      }}
                      disabled={isScanPacking}
                      autoFocus
                      className="flex-1 [&_input]:text-sm [&_input]:font-mono [&_input]:font-bold"
                    />
                    <Button
                      size="sm"
                      onClick={() => void handleScanPack()}
                      loading={isScanPacking}
                      color="cyan"
                      className="px-8"
                    >
                      PACK
                    </Button>
                  </div>
                </div>

                {/* Target Item Card (If active item is not packed yet) */}
                {activeOrder.status !== "Packed" && (
                  <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2.5 opacity-5 pointer-events-none">
                      <BoxIcon size={120} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <BoxIcon className="h-5 w-5 text-brand-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Current Item to Pack</h3>
                    </div>
                    
                    <div className="space-y-2 relative z-10">
                      <div>
                        <p className="text-sm font-black text-white leading-tight">
                          {activeOrder.productName}
                        </p>
                        <p className="mt-1 font-mono text-sm text-brand-300">
                          {activeOrder.skuCode}
                          {activeOrder.alias ? ` / ${activeOrder.alias}` : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-2.5">
                          <p className="text-xs uppercase tracking-wider text-orange-300 font-bold mb-1">Pick Qty</p>
                          <p className="text-2xl font-black text-orange-400">
                            {activeOrder.quantity}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-white/10">
                        <Button
                          size="sm"
                          fullWidth
                          onClick={() => void handleMarkPacked()}
                          loading={isMarkingPacked}
                          leftIcon={<CheckCircle2 size={20} />}
                          className="shadow-[0_0_15px_rgba(var(--brand-500),0.2)]"
                        >
                          Mark Packed
                        </Button>
                        <Button
                          size="sm"
                          fullWidth
                          variant="light"
                          color="yellow"
                          onClick={() => setIsShortPackModalOpen(true)}
                          leftIcon={<AlertTriangle size={20} />}
                        >
                          Report Damage
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items List */}
                {activeGroup.items.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-[#141414] overflow-hidden flex-1 flex flex-col min-h-[250px]">
                    <div className="p-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-neutral-400" />
                        <p className="text-sm font-bold text-neutral-300">Order Items</p>
                      </div>
                      <Badge size="sm" variant="outline">{activeGroup.items.length} total</Badge>
                    </div>
                    <div className="overflow-y-auto p-3 space-y-2 scrollbar-thin">
                      {activeGroup.items.map((item) => {
                        const isActiveItem = item.id === activeOrder.id;
                        const itemDone = item.status === "Packed";
                        
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveItemId(item.id)}
                            className={`w-full rounded-xl border p-2.5 text-left transition ${
                              isActiveItem && !itemDone
                                ? "border-brand-500/40 bg-brand-500/10 shadow-[0_0_10px_rgba(var(--brand-500),0.1)]"
                                : itemDone 
                                  ? "border-green-500/20 bg-green-500/5 opacity-80" 
                                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className={`text-sm font-bold ${itemDone ? 'text-neutral-400 line-through' : 'text-white'}`}>
                                  {item.productName}
                                </p>
                                <p className="mt-1 font-mono text-xs text-brand-300">
                                  {item.skuCode}
                                  {item.alias ? ` / ${item.alias}` : ""}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant={itemDone ? "success" : "warning"}
                                  size="sm"
                                  className="border-none font-bold shadow-sm"
                                >
                                  {itemDone ? "Packed" : "Pending"}
                                </Badge>
                                <p className="mt-2 text-sm font-bold text-white">
                                  Qty: {item.quantity}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <OperationsEmptyState
                icon={BoxIcon}
                title="No order selected"
                description="Select a picked order from the list to mark it packed."
              />
            )}
          </OperationsPanel>
        )}
      </div>

      <Modal
        opened={isShortPackModalOpen}
        onClose={() => setIsShortPackModalOpen(false)}
        title="Report Damaged / Short Pack"
        centered
        size="sm"
      >
        <Text size="md" mb="xl" color="dimmed">
          You are about to pack fewer items than what was originally picked. 
          The missing items will be returned to stock as an adjustment.
        </Text>
        <Stack gap="lg">
          <NumberInput
            label={`Actual Quantity Packed (Picked: ${activeOrder?.quantity ?? 0})`}
            value={shortPackQty}
            onChange={(val) => setShortPackQty(typeof val === 'number' ? val : 0)}
            min={0}
            max={(activeOrder?.quantity ?? 1) - 1}
            required
            size="sm"
            radius="md"
          />
          <Textarea
            label="Reason for shortage"
            placeholder="e.g. 1 item damaged, missing from bin, etc."
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
            Save & Short Pack
          </Button>
        </div>
      </Modal>
    </OperationsPage>
  );
});

export default Packing;
