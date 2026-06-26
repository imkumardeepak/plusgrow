import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, NumberInput } from "@mantine/core";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  MapPin,
  Package,
  RefreshCw,
  ScanLine,
  X,
} from "lucide-react";

import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import {
  OutwardOrder,
  ProductAllottedLocationRecord,
  SalesOrderRecord,
  outwardOrdersApi,
  productAllottedLocationsApi,
} from "../services/masterApi";
import { toast } from "../lib/toast";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ScanTone = "idle" | "success" | "error";

type StickerScan = {
  raw: string;
  sku: string;
  quantity: number;
  importDate?: string | null;
  mrp?: number | null;
  hasFullData?: boolean;
};

type ConsolidatedLine = {
  orderItemId: number;
  salesOrderId: number;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  quantity: number;
  pickedQuantity: number;
  pendingQuantity: number;
};

type ConsolidatedGroup = {
  key: string;
  productId: number;
  skuCode: string;
  productName: string;
  alias?: string | null;
  cartonQr?: string | null;
  cartonPerItem?: number | null;
  mrp: number | null;
  totalQuantity: number;
  totalPicked: number;
  totalPending: number;
  lines: ConsolidatedLine[];
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const parseStickerScan = (value: string): StickerScan => {
  const raw = value.trim();
  const parts = raw.split("#").map((p) => p.trim());
  const hasFullData = parts.length >= 4;
  const mrpText = hasFullData ? parts[3] : "";
  const mrpMatch = mrpText.match(/[\d,.]+/);
  const parsedMrp = mrpMatch ? Number(mrpMatch[0].replace(/,/g, "")) : null;
  return {
    raw,
    sku: parts[0] || raw,
    quantity: Math.max(Number(parts[1]) || 1, 1),
    importDate: parts.length >= 3 ? parts[2] : null,
    mrp: parsedMrp && Number.isFinite(parsedMrp) ? parsedMrp : null,
    hasFullData,
  };
};

const normalizeProductScan = (v?: string | null) =>
  (v || "").trim().split("#")[0].trim().toLowerCase();

const getCartonQuantity = (
  scan: string,
  cartonQr?: string | null,
  cartonPerItem?: number | null,
) => {
  const norm = normalizeProductScan(cartonQr);
  if (!norm || normalizeProductScan(scan) !== norm) return 0;
  return cartonPerItem && cartonPerItem > 0 ? cartonPerItem : 1;
};

const formatMrp = (v?: number | null) =>
  typeof v === "number" ? `Rs ${v.toFixed(2)}` : "—";

const mrpKey = (v?: number | null) =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(2) : "null";

const deriveOrderStatus = (items: OutwardOrder[]): SalesOrderRecord["status"] => {
  if (items.length === 0) return "Open";
  if (items.every((i) => i.pendingQuantity === 0)) return "Picked";
  if (items.some((i) => i.pickedQuantity > 0)) return "Picking";
  return "Open";
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export const ConsolidatedPick = memo(function ConsolidatedPick() {
  const [orders, setOrders] = useState<SalesOrderRecord[]>([]);
  const [locations, setLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // selection
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [orderSearch, setOrderSearch] = useState("");

  // expanded product group
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  // scan state
  const [locationCode, setLocationCode] = useState("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [skuCode, setSkuCode] = useState("");
  const [pickQty, setPickQty] = useState<number | "">("");
  const [scanTone, setScanTone] = useState<ScanTone>("idle");
  const [statusMessage, setStatusMessage] = useState("Select orders above, then pick a product.");
  const [isPicking, setIsPicking] = useState(false);

  const locationRef = useRef<HTMLInputElement>(null);
  const skuRef = useRef<HTMLInputElement>(null);

  /* ── Load ─────────────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersData, locsData] = await Promise.all([
        outwardOrdersApi.getSalesOrders({ status: "open", pageSize: 500 }),
        productAllottedLocationsApi.getAll(),
      ]);
      setOrders(ordersData.filter((o) => o.status !== "Canceled"));
      setLocations(locsData);
    } catch {
      toast.error("Failed to load consolidated picking data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  /* ── Derived: visible orders ─────────────────────────────────────────── */
  const visibleOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    const withPending = orders.filter((o) => o.items.some((i) => i.pendingQuantity > 0));
    if (!q) return withPending;
    return withPending.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.some(
          (i) =>
            i.skuCode.toLowerCase().includes(q) ||
            i.productName.toLowerCase().includes(q) ||
            (i.alias && i.alias.toLowerCase().includes(q)),
        ),
    );
  }, [orders, orderSearch]);

  /* ── Derived: consolidated product groups ─────────────────────────────── */
  const groups = useMemo<ConsolidatedGroup[]>(() => {
    const selected = new Set(selectedOrderIds);
    const map = new Map<string, ConsolidatedGroup>();
    orders
      .filter((o) => selected.has(o.id))
      .forEach((o) => {
        o.items.forEach((item) => {
          if (item.pendingQuantity <= 0) return;
          const key = `${item.productId}__${mrpKey(item.mrp)}`;
          const line: ConsolidatedLine = {
            orderItemId: item.id,
            salesOrderId: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            orderDate: o.orderDate,
            quantity: item.quantity,
            pickedQuantity: item.pickedQuantity,
            pendingQuantity: item.pendingQuantity,
          };
          const ex = map.get(key);
          if (ex) {
            ex.totalQuantity += item.quantity;
            ex.totalPicked += item.pickedQuantity;
            ex.totalPending += item.pendingQuantity;
            ex.lines.push(line);
            return;
          }
          map.set(key, {
            key,
            productId: item.productId,
            skuCode: item.skuCode,
            productName: item.productName,
            alias: item.alias,
            cartonQr: item.cartonQr,
            cartonPerItem: item.cartonPerItem,
            mrp: item.mrp ?? null,
            totalQuantity: item.quantity,
            totalPicked: item.pickedQuantity,
            totalPending: item.pendingQuantity,
            lines: [line],
          });
        });
      });
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        lines: g.lines.sort(
          (a, b) =>
            new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime() ||
            a.orderNumber.localeCompare(b.orderNumber),
        ),
      }))
      .sort((a, b) => a.skuCode.localeCompare(b.skuCode));
  }, [orders, selectedOrderIds]);

  const totalSelectedPending = groups.reduce((s, g) => s + g.totalPending, 0);

  const activeGroup = groups.find((g) => g.key === expandedGroupKey) ?? null;

  /* ── Auto-cleanup when active group disappears ────────────────────────── */
  useEffect(() => {
    if (expandedGroupKey && !groups.some((g) => g.key === expandedGroupKey)) {
      setExpandedGroupKey(null);
    }
  }, [groups, expandedGroupKey]);

  /* ── Reset scan state when active group changes ───────────────────────── */
  useEffect(() => {
    setLocationCode("");
    setIsLocationLocked(false);
    setSkuCode("");
    setScanTone("idle");
    if (activeGroup) {
      setPickQty(activeGroup.totalPending);
      setStatusMessage(`Scan location for ${activeGroup.skuCode}.`);
      window.setTimeout(() => locationRef.current?.focus(), 0);
    } else {
      setPickQty("");
      setStatusMessage("Select orders above, then pick a product.");
    }
  }, [expandedGroupKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  const getLocationSummary = useCallback(
    (productId: number) => {
      const row = locations.find((r) => r.productId === productId);
      if (!row) return "Not mapped";
      const entries = Object.entries(row.locationJson || {});
      if (!entries.length) return "Not mapped";
      return entries.map(([c, q]) => `${c} (${q})`).join(", ");
    },
    [locations],
  );

  const applyUpdatedItems = (updatedItems: OutwardOrder[]) => {
    if (!updatedItems.length) return;
    setOrders((cur) =>
      cur.map((order) => {
        const updates = updatedItems.filter((i) => i.salesOrderId === order.id);
        if (!updates.length) return order;
        const items = order.items.map(
          (i) => updates.find((u) => u.id === i.id) ?? i,
        );
        return {
          ...order,
          items,
          status: deriveOrderStatus(items),
          totalPickedQuantity: items.reduce((s, i) => s + i.pickedQuantity, 0),
          pendingQuantity: items.reduce((s, i) => s + i.pendingQuantity, 0),
        };
      }),
    );
  };

  /* ── Order selection ──────────────────────────────────────────────────── */
  const allVisibleSelected =
    visibleOrders.length > 0 &&
    visibleOrders.every((o) => selectedOrderIds.includes(o.id));

  const toggleOrder = (id: number) =>
    setSelectedOrderIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const ids = new Set(visibleOrders.map((o) => o.id));
      setSelectedOrderIds((cur) => cur.filter((x) => !ids.has(x)));
    } else {
      setSelectedOrderIds((cur) =>
        Array.from(new Set([...cur, ...visibleOrders.map((o) => o.id)])),
      );
    }
  };

  /* ── Scan handlers ────────────────────────────────────────────────────── */
  const handleSetLocation = () => {
    const loc = locationCode.trim();
    if (!loc) { toast.error("Scan location code"); return; }
    setIsLocationLocked(true);
    setStatusMessage("Location set. Now scan the product SKU or Alias.");
    window.setTimeout(() => skuRef.current?.focus(), 0);
  };

  const handleChangeLocation = () => {
    setIsLocationLocked(false);
    setLocationCode("");
    setStatusMessage("Scan new location.");
    window.setTimeout(() => locationRef.current?.focus(), 0);
  };

  const submitPick = async (quantity: number) => {
    if (!activeGroup) { toast.error("Select a product first"); return; }
    const loc = locationCode.trim();
    if (!loc) { toast.error("Scan location first"); return; }
    if (quantity <= 0) { toast.error("Quantity must be > 0"); return; }
    const capped = Math.min(quantity, activeGroup.totalPending);
    try {
      setIsPicking(true);
      const result = await outwardOrdersApi.consolidatedPick({
        salesOrderIds: selectedOrderIds,
        productId: activeGroup.productId,
        quantity: capped,
        skuCode: activeGroup.skuCode,
        locationCode: loc,
        mrp: activeGroup.mrp,
      });
      applyUpdatedItems(result.updatedItems);
      setScanTone("success");
      setStatusMessage(
        `Picked ${result.pickedQuantity} of ${activeGroup.skuCode} from ${result.locationCode} across ${result.allocations.length} order(s).`,
      );
      toast.success(`Picked ${result.pickedQuantity} unit(s) across ${result.allocations.length} order(s)`);
      const remaining = Math.max(activeGroup.totalPending - result.pickedQuantity, 0);
      setPickQty(remaining > 0 ? remaining : "");
      setSkuCode("");
      window.setTimeout(() => skuRef.current?.focus(), 0);
    } catch (err: any) {
      setScanTone("error");
      setStatusMessage(err.message || "Consolidated pick failed.");
      toast.error(err.message || "Consolidated pick failed");
    } finally {
      setIsPicking(false);
    }
  };

  const handleSkuScan = async () => {
    if (!activeGroup) { toast.error("Select a product first"); return; }
    if (!isLocationLocked) { toast.error("Scan location first"); window.setTimeout(() => locationRef.current?.focus(), 0); return; }
    const parsed = parseStickerScan(skuCode);
    if (!parsed.sku) { toast.error("Scan SKU or Alias"); return; }
    const scanVal = normalizeProductScan(parsed.sku);
    const matches =
      normalizeProductScan(activeGroup.skuCode) === scanVal ||
      normalizeProductScan(activeGroup.alias) === scanVal ||
      normalizeProductScan(activeGroup.cartonQr) === scanVal;
    if (!matches) {
      setScanTone("error");
      setStatusMessage(`Mismatch. Expected ${activeGroup.skuCode}${activeGroup.alias ? ` / ${activeGroup.alias}` : ""}.`);
      toast.error("SKU/Alias mismatch");
      setSkuCode("");
      window.setTimeout(() => skuRef.current?.focus(), 0);
      return;
    }
    if (parsed.hasFullData && parsed.mrp !== null && activeGroup.mrp !== null &&
      Number(parsed.mrp.toFixed(2)) !== Number(activeGroup.mrp.toFixed(2))) {
      const ok = window.confirm(
        `Price Mismatch!\nSticker: Rs ${parsed.mrp}\nOrder: Rs ${activeGroup.mrp}\n\nProceed?`,
      );
      if (!ok) { setSkuCode(""); window.setTimeout(() => skuRef.current?.focus(), 0); return; }
    }
    const cartonQty = getCartonQuantity(parsed.raw, activeGroup.cartonQr, activeGroup.cartonPerItem);
    const increment = Math.min(cartonQty > 0 ? cartonQty : 1, activeGroup.totalPending);
    await submitPick(increment);
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-3">

      {/* ── Step 1: Select Orders ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-[#10151e] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-brand-300" />
            <span className="text-sm font-bold text-white">Step 1 — Select Orders</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedOrderIds.length > 0 && (
              <span className="rounded bg-brand-500/15 px-2 py-0.5 text-[10px] font-black tabular-nums text-brand-200">
                {selectedOrderIds.length} selected
              </span>
            )}
            <button
              type="button"
              onClick={() => void loadData()}
              className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-white transition-colors"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-2.5 pb-1.5">
          <div className="relative">
            <input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search order, customer, SKU…"
              className="h-8 w-full rounded-lg border border-white/10 bg-black/25 pl-3 pr-8 text-xs font-bold text-white outline-none placeholder:text-neutral-600 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400/30"
            />
            {orderSearch && (
              <button
                type="button"
                onClick={() => setOrderSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Layers size={26} className="text-neutral-700 mb-2" />
            <p className="text-sm font-bold text-white">No open orders</p>
            <p className="mt-1 text-xs text-neutral-500">No open sales orders with pending quantity.</p>
          </div>
        ) : (
          <>
            {/* Select all toggle */}
            <div className="px-3 pb-1">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[10px] font-black uppercase tracking-widest text-brand-300 hover:text-brand-200 transition-colors"
              >
                {allVisibleSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            {/* Orders table */}
            <div className="border-t border-white/[0.06]">
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-white/[0.06] bg-white/[0.02]">
                <span></span>
                <span>Order / Customer</span>
                <span className="hidden sm:block text-center">Items</span>
                <span className="text-right">Pending</span>
              </div>

              <div className="max-h-[280px] overflow-y-auto">
                {visibleOrders.map((order) => {
                  const pending = order.items.reduce((s, i) => s + i.pendingQuantity, 0);
                  const checked = selectedOrderIds.includes(order.id);
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => toggleOrder(order.id)}
                      className={`w-full grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center px-3 py-2 text-left border-b border-white/[0.04] last:border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 ${
                        checked ? "bg-brand-500/8" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        readOnly
                        tabIndex={-1}
                        size="xs"
                        style={{ pointerEvents: "none" }}
                      />
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-black text-white">
                          {order.orderNumber}
                        </span>
                        <span className="block text-[11px] text-neutral-400 truncate">
                          {order.customerName}
                        </span>
                      </span>
                      <span className="hidden sm:block text-xs text-neutral-400 text-center tabular-nums">
                        {order.items.length}
                      </span>
                      <span>
                        <Badge variant="warning" shape="pill" className="border-none text-[10px]">
                          {pending}
                        </Badge>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Step 2: Pick by Product ─────────────────────────────────────────── */}
      {selectedOrderIds.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#10151e] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-brand-300" />
              <span className="text-sm font-bold text-white">Step 2 — Pick by Product</span>
            </div>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-black tabular-nums text-neutral-300">
              {groups.length} product(s) · {totalSelectedPending} pending
            </span>
          </div>

          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Package size={26} className="text-neutral-700 mb-2" />
              <p className="text-sm font-bold text-white">Nothing to pick</p>
              <p className="mt-1 text-xs text-neutral-500">Selected orders have no pending quantity.</p>
            </div>
          ) : (
            <>
              {/* Column header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-white/[0.06] bg-white/[0.02]">
                <span></span>
                <span>Product</span>
                <span className="hidden sm:block text-center">Orders</span>
                <span className="text-right">Picked</span>
                <span className="text-right">Pending</span>
              </div>

              {groups.map((group) => {
                const isExpanded = group.key === expandedGroupKey;
                const done = group.totalPending === 0;
                const pct = group.totalQuantity > 0
                  ? Math.round((group.totalPicked / group.totalQuantity) * 100)
                  : 0;

                return (
                  <div key={group.key} className="border-b border-white/[0.05] last:border-0">

                    {/* Product row */}
                    <button
                      type="button"
                      onClick={() => setExpandedGroupKey(isExpanded ? null : group.key)}
                      className={`w-full grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-2 items-center px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 ${
                        isExpanded
                          ? "bg-brand-500/8"
                          : done
                            ? "opacity-50 hover:opacity-75 hover:bg-white/[0.03]"
                            : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-neutral-500">
                        {isExpanded
                          ? <ChevronDown size={14} className="text-brand-400" />
                          : <ChevronRight size={14} />}
                      </span>

                      <span className="min-w-0">
                        <span className={`block font-medium text-xs truncate ${done ? "line-through text-neutral-500" : "text-white"}`}>
                          {group.productName}
                        </span>
                        <span className="block font-mono text-[10px] text-brand-300">
                          {group.skuCode}
                          {group.alias ? ` / ${group.alias}` : ""}
                          <span className="ml-1.5 text-neutral-500">{formatMrp(group.mrp)}</span>
                        </span>
                        {/* mini progress bar */}
                        <div className="mt-1 h-1 w-full max-w-[100px] overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </span>

                      <span className="hidden sm:block text-xs text-neutral-400 text-center tabular-nums">
                        {group.lines.length}
                      </span>

                      <span className="font-mono text-xs font-bold text-brand-200 text-right tabular-nums">
                        {group.totalPicked}
                      </span>

                      <span>
                        {done ? (
                          <span className="inline-flex items-center gap-0.5 text-green-400 text-[10px] font-bold">
                            <Check size={11} /> Done
                          </span>
                        ) : (
                          <Badge variant="warning" shape="pill" className="border-none text-[10px]">
                            {group.totalPending}
                          </Badge>
                        )}
                      </span>
                    </button>

                    {/* Expanded section */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-[#0b0f17] px-3 py-3 space-y-3">

                        {/* Location summary */}
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                          <MapPin size={12} className="text-brand-400 shrink-0" />
                          <span className="font-medium">Location:</span>
                          <span className="font-mono text-brand-300">{getLocationSummary(group.productId)}</span>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
                          {[
                            { label: "Orders", value: group.lines.length },
                            { label: "Need", value: group.totalQuantity },
                            { label: "Picked", value: group.totalPicked },
                          ].map((m) => (
                            <div key={m.label} className="bg-[#111721] px-2 py-1.5">
                              <div className="text-[9px] font-bold uppercase tracking-wide text-neutral-500">{m.label}</div>
                              <div className="font-mono text-sm font-black text-white mt-0.5 tabular-nums">{m.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Order allocation sub-table */}
                        <div className="rounded-lg border border-white/10 overflow-hidden">
                          <div className="bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-white/10">
                            Order Allocation ({group.lines.length})
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-[10px] text-neutral-500 border-b border-white/[0.06]">
                                <th className="text-left px-3 py-1.5">Order</th>
                                <th className="text-left px-2 py-1.5 hidden sm:table-cell">Customer</th>
                                <th className="text-right px-3 py-1.5">Picked/Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.lines.map((line) => (
                                <tr key={line.orderItemId} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                                  <td className="px-3 py-1.5">
                                    <span className="font-mono font-black text-white">{line.orderNumber}</span>
                                  </td>
                                  <td className="px-2 py-1.5 hidden sm:table-cell">
                                    <span className="text-neutral-400 truncate max-w-[120px] block">{line.customerName}</span>
                                  </td>
                                  <td className="px-3 py-1.5 text-right">
                                    {line.pendingQuantity === 0 ? (
                                      <span className="inline-flex items-center gap-1 text-green-400 text-[10px] font-bold">
                                        <Check size={10} /> {line.pickedQuantity}/{line.quantity}
                                      </span>
                                    ) : (
                                      <span className="font-mono font-bold text-white tabular-nums">
                                        {line.pickedQuantity}/{line.quantity}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Scan panel */}
                        {group.totalPending > 0 && (
                          <div className="rounded-lg border border-white/10 bg-[#10151e] p-3 space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                              Scan to Pick — {group.skuCode}
                            </label>

                            {/* Location step */}
                            {!isLocationLocked ? (
                              <div className="space-y-1">
                                <p className="text-[10px] text-neutral-500">Step 1 — Scan Location</p>
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <MapPin size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                                    <input
                                      ref={locationRef}
                                      value={locationCode}
                                      onChange={(e) => setLocationCode(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSetLocation(); } }}
                                      placeholder="Scan bin / location…"
                                      autoComplete="off"
                                      className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-8 pr-3 font-mono text-xs font-bold text-white outline-none placeholder:text-neutral-600 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400/30"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleSetLocation}
                                    className="h-9 px-4 rounded-lg border border-brand-500/35 bg-brand-500/10 text-xs font-black uppercase tracking-wide text-brand-200 hover:bg-brand-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                                  >
                                    Set
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] text-neutral-500">Step 2 — Scan Product</p>
                                  <button
                                    type="button"
                                    onClick={handleChangeLocation}
                                    className="text-[10px] font-bold text-brand-300 hover:text-brand-200 transition-colors"
                                  >
                                    📍 {locationCode} · Change
                                  </button>
                                </div>

                                {/* SKU scan */}
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <ScanLine size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                                    <input
                                      ref={skuRef}
                                      value={skuCode}
                                      onChange={(e) => setSkuCode(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleSkuScan(); } }}
                                      disabled={group.totalPending === 0}
                                      placeholder={`Scan ${group.skuCode}${group.alias ? ` or ${group.alias}` : ""}…`}
                                      autoComplete="off"
                                      className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-8 pr-3 font-mono text-xs font-bold text-white outline-none placeholder:text-neutral-600 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400/30 disabled:opacity-50"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void handleSkuScan()}
                                    disabled={isPicking || group.totalPending === 0}
                                    className="h-9 px-4 rounded-lg border border-brand-500/35 bg-brand-500/10 text-xs font-black uppercase tracking-wide text-brand-200 hover:bg-brand-500/20 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                                  >
                                    {isPicking ? "…" : "Pick"}
                                  </button>
                                </div>

                                {/* Manual qty pick */}
                                <div className="flex items-end gap-2">
                                  <NumberInput
                                    label="Or enter quantity manually"
                                    size="xs"
                                    className="flex-1"
                                    min={1}
                                    max={group.totalPending}
                                    value={pickQty}
                                    onChange={(v) => setPickQty(typeof v === "number" ? v : v === "" ? "" : Number(v))}
                                    disabled={group.totalPending === 0}
                                  />
                                  <Button
                                    onClick={() => void submitPick(typeof pickQty === "number" ? pickQty : 0)}
                                    loading={isPicking}
                                    disabled={group.totalPending === 0}
                                    size="xs"
                                    className="h-[30px]"
                                    leftIcon={<Package size={13} />}
                                  >
                                    Pick Qty
                                  </Button>
                                </div>
                                <p className="text-[10px] text-neutral-600">
                                  Allocated oldest order first. Max {group.totalPending} for this product.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Status message */}
                        <div className={`rounded-lg border px-3 py-2 text-[11px] ${
                          scanTone === "success"
                            ? "border-green-500/20 bg-green-500/[0.07] text-green-200"
                            : scanTone === "error"
                              ? "border-red-500/20 bg-red-500/[0.07] text-red-200"
                              : "border-white/10 bg-white/[0.025] text-neutral-400"
                        }`}>
                          {scanTone === "error" && (
                            <AlertTriangle size={11} className="inline mr-1.5 text-red-400" />
                          )}
                          {statusMessage}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Prompt when no orders selected */}
      {selectedOrderIds.length === 0 && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-8 text-center text-xs text-neutral-500">
          Select one or more orders above to build the product pick list.
        </div>
      )}
    </div>
  );
});

export default ConsolidatedPick;
