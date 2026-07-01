import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActionIcon,
  Badge as MantineBadge,
  Modal,
  NumberInput,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  AlertTriangle,
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ScanLine,
  Search,
  X,
} from "lucide-react";

import { Button } from "../components/atoms/Button";
import { OperationsPage } from "../components/organisms/Operations/OperationsShell";
import { OutboundStageNav } from "../components/organisms/Operations/OutboundTaskUI";
import { OutwardOrder, outwardOrdersApi } from "../services/masterApi";
import { toast } from "../lib/toast";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type PackingOrderGroup = {
  salesOrderId: number;
  orderNumber: string;
  customerName: string;
  items: OutwardOrder[];
  totalQuantity: number;
  packedQuantity: number;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const isCanceledOrder = (o: OutwardOrder) =>
  o.status === "Canceled" || o.salesOrderStatus === "Canceled";

const normalizeCode = (v?: string | null) => (v || "").trim().toUpperCase();

const extractTokens = (raw: string) => {
  const upper = normalizeCode(raw);
  const tokens = new Set<string>();
  if (upper) tokens.add(upper);
  upper.split(/[\s#|,;:/\\?&=]+/).map((t) => t.trim()).filter(Boolean).forEach((t) => tokens.add(t));
  return Array.from(tokens);
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export const Packing = memo(function Packing() {
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // expanded row
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);

  // scan
  const [scanInput, setScanInput] = useState("");
  const [isScanPacking, setIsScanPacking] = useState(false);
  const [isMarkingPacked, setIsMarkingPacked] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  // short pack modal
  const [isShortPackOpen, setIsShortPackOpen] = useState(false);
  const [shortPackQty, setShortPackQty] = useState<number>(0);
  const [shortPackRemark, setShortPackRemark] = useState("");
  const [isShortPacking, setIsShortPacking] = useState(false);

  /* ── Load ─────────────────────────────────────────────────────────────── */
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await outwardOrdersApi.getAll({ status: "picked" });
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const active = orders.filter((o) => !isCanceledOrder(o) && o.status === "Picked");
    if (!q) return active;
    return active.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.skuCode.toLowerCase().includes(q) ||
        (o.alias && o.alias.toLowerCase().includes(q)),
    );
  }, [orders, searchQuery]);

  const groupedOrders = useMemo<PackingOrderGroup[]>(() => {
    const groups = new Map<number, PackingOrderGroup>();
    filteredOrders.forEach((o) => {
      const id = o.salesOrderId ?? 0;
      const cur = groups.get(id);
      if (cur) {
        cur.items.push(o);
        cur.totalQuantity += o.quantity;
        cur.packedQuantity += o.packedQuantity;
        return;
      }
      groups.set(id, {
        salesOrderId: id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        items: [o],
        totalQuantity: o.quantity,
        packedQuantity: o.packedQuantity,
      });
    });
    return Array.from(groups.values()).sort((a, b) => b.orderNumber.localeCompare(a.orderNumber));
  }, [filteredOrders]);

  const activeGroup = groupedOrders.find((g) => g.salesOrderId === expandedOrderId) ?? null;
  const activeOrder =
    activeGroup?.items.find((i) => i.id === activeItemId) ??
    activeGroup?.items[0] ??
    null;
  const activeItemIndex = activeGroup && activeOrder
    ? activeGroup.items.findIndex((i) => i.id === activeOrder.id)
    : -1;
  const packingProgress =
    activeGroup && activeGroup.totalQuantity > 0
      ? Math.round((activeGroup.packedQuantity / activeGroup.totalQuantity) * 100)
      : 0;
  const isFullyScanned = !!activeOrder && activeOrder.packedQuantity >= activeOrder.pickedQuantity;

  /* ── Reset when expanding ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!activeGroup) return;
    setScanInput("");
    const first = activeGroup.items.find((i) => i.packedQuantity < i.pickedQuantity);
    setActiveItemId(first?.id ?? activeGroup.items[0]?.id ?? null);
    window.setTimeout(() => scanRef.current?.focus(), 80);
  }, [expandedOrderId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const focusScanner = () => setTimeout(() => scanRef.current?.focus(), 10);

  const handleMarkPacked = async (
    toPack: OutwardOrder | null = activeOrder,
    opts?: { auto?: boolean },
  ) => {
    if (!toPack) { toast.error("Select an order"); return; }
    try {
      setIsMarkingPacked(true);
      if (toPack.packedQuantity < toPack.pickedQuantity) {
        toast.error(`Scan all units first (${toPack.packedQuantity}/${toPack.pickedQuantity})`);
        return;
      }
      await outwardOrdersApi.markPacked(toPack.id);
      setOrders((cur) => cur.filter((i) => i.id !== toPack.id));
      toast.success(opts?.auto ? `${toPack.skuCode} saved` : `${toPack.skuCode} marked as packed`);
    } catch (err: any) {
      toast.error(err.message || "Failed to mark packed");
    } finally {
      setIsMarkingPacked(false);
    }
  };

  const handleSavePacking = () => {
    if (!activeOrder) { toast.error("Select order first"); return; }
    if (activeOrder.packedQuantity === activeOrder.pickedQuantity) {
      void handleMarkPacked(activeOrder);
      return;
    }
    setIsShortPackOpen(true);
  };

  useEffect(() => {
    if (activeOrder && isShortPackOpen) {
      setShortPackQty(activeOrder.packedQuantity);
      setShortPackRemark("");
    }
  }, [activeOrder, isShortPackOpen]);

  const handleShortPack = async () => {
    if (!activeOrder) return;
    if (shortPackQty < 0 || shortPackQty >= activeOrder.pickedQuantity) {
      toast.error("Packed quantity must be less than picked quantity");
      return;
    }
    if (!shortPackRemark.trim()) { toast.error("Enter a reason for shortage"); return; }
    try {
      setIsShortPacking(true);
      await outwardOrdersApi.shortPack(activeOrder.id, {
        packedQuantity: shortPackQty,
        remark: shortPackRemark,
      });
      setOrders((cur) => cur.filter((i) => i.id !== activeOrder.id));
      setIsShortPackOpen(false);
      toast.success(`${activeOrder.skuCode} short-packed`);
    } catch (err: any) {
      toast.error(err.message || "Failed to short-pack");
    } finally {
      setIsShortPacking(false);
    }
  };

  // item lookup map for scanner
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

  const handleScanPack = async () => {
    const raw = scanInput.trim();
    if (!raw) return;
    if (!activeGroup) { toast.warning("Select an order first"); setScanInput(""); return; }

    const tokens = extractTokens(raw);
    let matched: OutwardOrder | undefined;
    for (const t of tokens) {
      const f = itemLookup.get(t);
      if (f) { matched = f; break; }
    }
    setScanInput("");
    if (!matched) { toast.error("Scanned code doesn't match any item"); focusScanner(); return; }

    const scannedCode = normalizeCode(raw.split("#")[0]);
    const isCarton = !!matched.cartonQr && normalizeCode(matched.cartonQr) === scannedCode;
    const increment = isCarton && matched.cartonPerItem && matched.cartonPerItem > 0 ? matched.cartonPerItem : 1;

    if (matched.packedQuantity >= matched.pickedQuantity) {
      toast.warning(`${matched.skuCode} is fully scanned. Save to complete.`);
      setActiveItemId(matched.id);
      focusScanner();
      return;
    }

    try {
      setIsScanPacking(true);
      const updated = await outwardOrdersApi.updatePackingQuantity(matched.id, increment);
      setOrders((cur) => cur.map((i) => (i.id === updated.id ? updated : i)));
      setActiveItemId(updated.id);
      if (updated.packedQuantity >= updated.pickedQuantity) {
        await handleMarkPacked(updated, { auto: true });
      } else {
        toast.success(`Packed ${updated.packedQuantity}/${updated.pickedQuantity} for ${updated.skuCode}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Scan pack failed");
    } finally {
      setIsScanPacking(false);
      focusScanner();
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <OperationsPage title="Packing" description="Pack picked orders" icon={Archive} hideHeader>
      <div className="flex flex-col gap-2">

        <OutboundStageNav active="packing" queueCount={groupedOrders.length} compactLabel="Ready" />

        {/* Search + refresh */}
        <div className="flex gap-2">
          <TextInput
            className="flex-1"
            placeholder="Search order, customer, SKU…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
            radius="md"
            leftSection={<Search size={14} />}
            rightSection={
              searchQuery ? (
                <ActionIcon size="xs" variant="transparent" onClick={() => setSearchQuery("")}>
                  <X size={14} />
                </ActionIcon>
              ) : null
            }
          />
          <ActionIcon
            variant="light"
            color="gray"
            size="lg"
            radius="md"
            onClick={() => void loadOrders()}
            loading={isLoading}
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </ActionIcon>
        </div>

        {/* Count line */}
        <div className="text-xs text-neutral-500">
          {groupedOrders.length === 0 ? "No orders to pack" : `${groupedOrders.length} order(s) ready to pack`}
        </div>

        {/* ── Orders table ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/10 bg-[#10151e] overflow-hidden">

          {groupedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Archive size={30} className="text-neutral-700 mb-3" />
              <p className="text-sm font-bold text-white">Nothing to pack</p>
              <p className="mt-1 text-xs text-neutral-500">Picked orders appear here when ready.</p>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                <span></span>
                <span>Order / Customer</span>
                <span className="text-right">Packed</span>
                <span className="text-right hidden sm:block">Lines</span>
              </div>

              {groupedOrders.map((group) => {
                const isExpanded = group.salesOrderId === expandedOrderId;
                const grpProgress =
                  group.totalQuantity > 0
                    ? Math.round((group.packedQuantity / group.totalQuantity) * 100)
                    : 0;

                return (
                  <div key={group.salesOrderId} className="border-b border-white/[0.05] last:border-0">

                    {/* ── Order row ─────────────────────────────────────── */}
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : group.salesOrderId)}
                      className={`w-full grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 ${
                        isExpanded ? "bg-cyan-500/8" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-neutral-500">
                        {isExpanded
                          ? <ChevronDown size={14} className="text-cyan-400" />
                          : <ChevronRight size={14} />}
                      </span>

                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-black text-white">
                          {group.orderNumber}
                        </span>
                        <span className="block text-[11px] text-neutral-400 truncate">
                          {group.customerName === "Direct Outward" || group.orderNumber.startsWith("DO-")
                            ? group.items.map((i) => i.skuCode).join(" | ")
                            : group.customerName}
                        </span>
                        {/* mini progress bar */}
                        <div className="mt-1 h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-cyan-500 transition-[width] duration-300"
                            style={{ width: `${grpProgress}%` }}
                          />
                        </div>
                      </span>

                      <span className="font-mono text-xs font-bold text-cyan-200 text-right tabular-nums">
                        {group.packedQuantity}/{group.totalQuantity}
                      </span>

                      <span className="hidden sm:block text-xs text-neutral-400 text-right">
                        {group.items.length}
                      </span>
                    </button>

                    {/* ── Expanded panel ─────────────────────────────────── */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-[#0b0f17] px-3 py-3 space-y-3">

                        {/* Progress */}
                        <div>
                          <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                            <span>Line {Math.max(activeItemIndex + 1, 1)} of {group.items.length}</span>
                            <span className="font-mono tabular-nums">
                              {group.packedQuantity}/{group.totalQuantity} packed · {packingProgress}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-300 transition-[width] duration-300"
                              style={{ width: `${packingProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Items sub-table */}
                        <div className="rounded-lg border border-white/10 overflow-hidden">
                          <div className="bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-white/10">
                            Order Lines ({group.items.length})
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-[10px] text-neutral-500 border-b border-white/[0.06]">
                                <th className="text-left px-3 py-1.5">Product</th>
                                <th className="text-left px-2 py-1.5 hidden sm:table-cell">SKU</th>
                                <th className="text-right px-3 py-1.5">Packed</th>
                                <th className="text-center px-2 py-1.5">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((item) => {
                                const done = item.status === "Packed";
                                const isActive = item.id === activeItemId;
                                return (
                                  <tr
                                    key={item.id}
                                    onClick={() => setActiveItemId(item.id)}
                                    className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors ${
                                      isActive
                                        ? "bg-cyan-500/10"
                                        : done
                                          ? "opacity-40"
                                          : "hover:bg-white/[0.04]"
                                    }`}
                                  >
                                    <td className="px-3 py-2">
                                      <span className={`block font-medium truncate max-w-[140px] ${done ? "line-through text-neutral-500" : "text-white"}`}>
                                        {item.productName}
                                      </span>
                                      <span className="font-mono text-[10px] text-cyan-300 sm:hidden">{item.skuCode}</span>
                                    </td>
                                    <td className="px-2 py-2 hidden sm:table-cell">
                                      <span className="font-mono text-cyan-300">{item.skuCode}</span>
                                      {item.alias && <span className="ml-1 text-neutral-500">/ {item.alias}</span>}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-white tabular-nums">
                                      {item.packedQuantity}/{item.pickedQuantity}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      {done ? (
                                        <span className="inline-flex items-center gap-1 text-green-400 font-bold text-[10px]">
                                          <Check size={11} /> Done
                                        </span>
                                      ) : (
                                        <MantineBadge size="xs" color="cyan" variant="light">Packing</MantineBadge>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Active item highlight */}
                        {activeOrder && !isFullyScanned && (
                          <div className="flex items-center gap-2 rounded-md bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 text-xs">
                            <Archive size={13} className="text-cyan-300 shrink-0" />
                            <span className="font-bold text-cyan-200 truncate">{activeOrder.productName}</span>
                            <span className="ml-auto font-mono text-cyan-300 shrink-0 tabular-nums">
                              {activeOrder.packedQuantity}/{activeOrder.pickedQuantity}
                            </span>
                          </div>
                        )}

                        {/* Scanner */}
                        <div className="rounded-lg border border-white/10 bg-[#10151e] p-3 space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                            Scan SKU, Alias, or Carton QR
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <ScanLine size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                              <input
                                ref={scanRef}
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleScanPack(); } }}
                                disabled={isScanPacking || isMarkingPacked || isShortPacking}
                                placeholder="Scan barcode…"
                                autoComplete="off"
                                autoFocus
                                className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-8 pr-3 font-mono text-xs font-bold text-white outline-none placeholder:text-neutral-600 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30 disabled:opacity-50"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleScanPack()}
                              disabled={isScanPacking || isMarkingPacked || isShortPacking}
                              className="h-9 px-4 rounded-lg border border-cyan-500/35 bg-cyan-500/10 text-xs font-black uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                            >
                              {isScanPacking || isMarkingPacked ? "…" : "Pack"}
                            </button>
                          </div>

                          {/* Save button */}
                          <Button
                            fullWidth
                            size="sm"
                            onClick={handleSavePacking}
                            loading={isMarkingPacked || isShortPacking}
                            color={isFullyScanned ? "green" : "yellow"}
                          >
                            {isFullyScanned
                              ? `✓ Save Full Quantity (${activeOrder?.pickedQuantity ?? 0})`
                              : `Save Less Quantity (${activeOrder?.packedQuantity ?? 0}/${activeOrder?.pickedQuantity ?? 0})`}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Short pack modal ─────────────────────────────────────────────── */}
      <Modal opened={isShortPackOpen} onClose={() => setIsShortPackOpen(false)} title="Confirm Less Packed Quantity" centered size="sm">
        <Text size="md" mb="xl" color="dimmed">
          You scanned fewer items than were picked. Enter a reason. Missing quantity returns to stock.
        </Text>
        <div className="space-y-4">
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
            placeholder="e.g. 1 item damaged during packing…"
            required
            value={shortPackRemark}
            onChange={(e) => setShortPackRemark(e.currentTarget.value)}
            minRows={3}
            size="sm"
            radius="md"
            data-autofocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" color="gray" size="md" onClick={() => setIsShortPackOpen(false)}>Cancel</Button>
          <Button onClick={handleShortPack} loading={isShortPacking} color="yellow" size="md">Confirm Less Quantity</Button>
        </div>
      </Modal>
    </OperationsPage>
  );
});

export default Packing;
