import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NumberInput } from "@mantine/core";
import {
  AlertTriangle,
  Check,
  MapPin,
  Package,
  RefreshCw,
  ScanLine,
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

type PickLocationRow = {
  key: string;
  group: ConsolidatedGroup;
  locationCode: string;
  rawCode: string;
  binCode?: string;
  locationStock: number;
  pickQuantity: number;
  sequence: number;
  isMapped: boolean;
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

  // active table row
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null);

  // scan state
  const [locationCode, setLocationCode] = useState("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [skuCode, setSkuCode] = useState("");
  const [pickQty, setPickQty] = useState<number | "">("");
  const [scanTone, setScanTone] = useState<ScanTone>("idle");
  const [statusMessage, setStatusMessage] = useState("");
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

  /* ── Derived: all pending SOs are included by default ─────────────────── */
  const visibleOrders = useMemo(() => {
    return orders.filter((o) => o.items.some((i) => i.pendingQuantity > 0));
  }, [orders]);

  const selectedOrderIds = useMemo(
    () => visibleOrders.map((order) => order.id),
    [visibleOrders],
  );

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
  const totalSelectedQuantity = groups.reduce((s, g) => s + g.totalQuantity, 0);

  const pickRows = useMemo<PickLocationRow[]>(() => {
    return groups.flatMap((group) => {
      const row = locations.find((r) => r.productId === group.productId);
      const locationEntries = Object.entries(row?.locationJson || {})
        .map(([rawCode, qty]) => {
          const parts = rawCode.split('::');
          return {
            rawCode,
            locationCode: parts[0],
            binCode: parts.length > 1 ? parts[1] : undefined,
            qty: Number(qty) || 0,
          };
        })
        .filter((entry) => entry.qty > 0);

      let remaining = group.totalPending;
      const rows: PickLocationRow[] = [];

      locationEntries.forEach((entry, index) => {
        if (remaining <= 0) return;
        const pickQuantity = Math.min(entry.qty, remaining);
        rows.push({
          key: `${group.key}__${entry.rawCode}`,
          group,
          rawCode: entry.rawCode,
          locationCode: entry.locationCode,
          binCode: entry.binCode,
          locationStock: entry.qty,
          pickQuantity,
          sequence: index + 1,
          isMapped: true,
        });
        remaining -= pickQuantity;
      });

      if (remaining > 0) {
        rows.push({
          key: `${group.key}__unmapped`,
          group,
          rawCode: "Not mapped",
          locationCode: "Not mapped",
          locationStock: 0,
          pickQuantity: remaining,
          sequence: locationEntries.length + 1,
          isMapped: false,
        });
      }

      return rows;
    });
  }, [groups, locations]);

  const activeRow = pickRows.find((row) => row.key === activeRowKey) ?? pickRows[0] ?? null;
  const activeGroup = activeRow?.group ?? null;

  /* ── Keep first available row active by default ───────────────────────── */
  useEffect(() => {
    if (pickRows.length === 0) {
      if (activeRowKey !== null) setActiveRowKey(null);
      return;
    }

    if (!activeRowKey || !pickRows.some((row) => row.key === activeRowKey)) {
      setActiveRowKey(pickRows[0].key);
    }
  }, [activeRowKey, pickRows]);

  /* ── Reset scan state when active group changes ───────────────────────── */
  useEffect(() => {
    setLocationCode("");
    setIsLocationLocked(false);
    setSkuCode("");
    setScanTone("idle");
    if (activeRow) {
      setPickQty(activeRow.pickQuantity);
      setStatusMessage("");
      window.setTimeout(() => locationRef.current?.focus(), 0);
    } else {
      setPickQty("");
      setStatusMessage("");
    }
  }, [activeRowKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  const reduceLocationStock = (productId: number, location: string, quantity: number) => {
    setLocations((cur) =>
      cur.map((row) => {
        if (row.productId !== productId) return row;
        const current = Number(row.locationJson?.[location] || 0);
        return {
          ...row,
          locationJson: {
            ...row.locationJson,
            [location]: Math.max(current - quantity, 0),
          },
        };
      }),
    );
  };

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

  /* ── Scan handlers ────────────────────────────────────────────────────── */
  const handleSetLocation = () => {
    if (!activeRow) { toast.error("Select a row first"); return; }
    if (!activeRow.isMapped) { toast.error("No allotted location found for this row"); return; }
    const loc = locationCode.trim().toUpperCase();
    if (!loc) { toast.error("Scan location code"); return; }
    
    // Allow matching against either the rawCode (e.g. LOC::BIN), the binCode (e.g. BIN), or just the locationCode (e.g. LOC)
    const validMatches = [
      activeRow.rawCode.toUpperCase(),
      activeRow.locationCode.toUpperCase(),
      ...(activeRow.binCode ? [activeRow.binCode.toUpperCase()] : [])
    ];
    
    if (!validMatches.includes(loc)) {
      setScanTone("error");
      setStatusMessage(`Wrong location. Go to ${activeRow.locationCode}${activeRow.binCode ? ` [${activeRow.binCode}]` : ''}.`);
      toast.error(`Scan ${activeRow.locationCode} first`);
      return;
    }
    
    // If they scanned a bin, make sure we use the rawCode so the backend can deduct from the correct bin
    const finalLocationCode = (loc === activeRow.binCode?.toUpperCase()) ? activeRow.rawCode : loc;
    
    setIsLocationLocked(true);
    // Store the exact key we need to send to the backend for accurate deduction
    setLocationCode(finalLocationCode);
    setScanTone("success");
    setStatusMessage(`${activeRow.locationCode} verified`);
    window.setTimeout(() => skuRef.current?.focus(), 0);
  };

  const handleChangeLocation = () => {
    setIsLocationLocked(false);
    setLocationCode("");
    setStatusMessage("Scan new location.");
    window.setTimeout(() => locationRef.current?.focus(), 0);
  };

  const submitPick = async (quantity: number) => {
    if (!activeRow || !activeGroup) { toast.error("Select a row first"); return; }
    if (!activeRow.isMapped) { toast.error("No allotted location found for this row"); return; }
    const loc = locationCode.trim();
    if (!loc) { toast.error("Scan location first"); return; }
    if (quantity <= 0) { toast.error("Quantity must be > 0"); return; }
    const capped = Math.min(quantity, activeRow.pickQuantity);
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
      reduceLocationStock(activeGroup.productId, result.locationCode, result.pickedQuantity);
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
    if (!activeRow || !activeGroup) { toast.error("Select a row first"); return; }
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
    const increment = Math.min(cartonQty > 0 ? cartonQty : 1, activeRow.pickQuantity);
    await submitPick(increment);
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#10151e] px-2 py-1.5 text-[10px] font-black text-neutral-300 sm:text-xs">
        <span className="inline-flex items-center gap-1 text-brand-200">
          <Package size={12} />
          {visibleOrders.length} SO
        </span>
        <span className="text-neutral-600">|</span>
        <span>{groups.length} SKU</span>
        <span className="text-neutral-600">|</span>
        <span>{totalSelectedPending}/{totalSelectedQuantity}</span>
        <button
          type="button"
          onClick={() => void loadData()}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          aria-label="Refresh SO list"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#10151e] overflow-hidden">
        {visibleOrders.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs font-bold text-neutral-500">
            No open SO
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[78px_1fr_auto_auto] gap-x-2 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-white/[0.06] bg-white/[0.02] sm:grid-cols-[110px_1fr_auto_auto_auto]">
              <span>Location</span>
              <span>Product</span>
              <span className="hidden sm:block text-center">SO</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Bal</span>
            </div>

          {pickRows.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs font-bold text-neutral-500">
              Nothing to pick
            </div>
          ) : (
            <>
              {pickRows.map((row) => {
                const group = row.group;
                const isActive = row.key === activeRow?.key;
                const orderRefs = Array.from(
                  new Map(
                    group.lines.map((line) => [
                      line.salesOrderId,
                      `${line.orderNumber} - ${line.customerName}`,
                    ]),
                  ).values(),
                );
                const orderRefText = orderRefs.join(" | ");

                return (
                  <div key={row.key} className="border-b border-white/[0.05] last:border-0">
                    <button
                      type="button"
                      onClick={() => setActiveRowKey(row.key)}
                      className={`w-full grid grid-cols-[78px_1fr_auto_auto] gap-x-2 items-center px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 sm:grid-cols-[110px_1fr_auto_auto_auto] ${
                        isActive
                          ? "bg-brand-500/8"
                          : row.isMapped
                            ? "hover:bg-white/[0.04]"
                            : "bg-yellow-500/[0.04] hover:bg-yellow-500/[0.07]"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className={`block truncate font-mono text-[11px] font-black ${
                          row.isMapped ? "text-brand-200" : "text-yellow-300"
                        }`}>
                          {row.locationCode}
                          {row.binCode && <span className="ml-1 text-[10px] text-brand-400 bg-brand-900/40 px-1 rounded">[{row.binCode}]</span>}
                        </span>
                        <span className="block text-[9px] font-black text-neutral-500">
                          {row.isMapped ? `#${row.sequence} · ${row.locationStock}` : "assign"}
                        </span>
                      </span>

                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="min-w-0 truncate text-xs font-semibold text-white">
                            {group.productName}
                          </span>
                          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-black tabular-nums text-neutral-300 sm:hidden">
                            {group.lines.length} SO
                          </span>
                          <span className="hidden shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-black tabular-nums text-neutral-300 sm:inline">
                            Need {row.pickQuantity}
                          </span>
                        </span>
                        <span
                          className="block truncate text-[10px] font-semibold text-neutral-400"
                          title={orderRefText}
                        >
                          {orderRefText}
                        </span>
                        <span className="block font-mono text-[10px] text-brand-300">
                          {group.skuCode}
                          {group.alias ? ` / ${group.alias}` : ""}
                          <span className="ml-1.5 text-neutral-500">{formatMrp(group.mrp)}</span>
                        </span>
                      </span>

                      <span className="hidden sm:block text-xs text-neutral-400 text-center tabular-nums">
                        {group.lines.length}
                      </span>

                      <span className="font-mono text-xs font-bold text-brand-200 text-right tabular-nums">
                        {row.pickQuantity}
                      </span>

                      <span>
                        <Badge variant={row.isMapped ? "warning" : "danger"} shape="pill" className="border-none text-[10px]">
                          {group.totalPending}
                        </Badge>
                      </span>
                    </button>

                    {isActive && (
                      <div className="border-t border-white/10 bg-[#0b0f17] px-2.5 py-2.5 space-y-2">
                        {!isLocationLocked ? (
                          <div className="grid grid-cols-[1fr_auto] gap-2">
                            <div className="relative">
                              <MapPin size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                              <input
                                ref={locationRef}
                                value={locationCode}
                                onChange={(e) => setLocationCode(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSetLocation(); } }}
                                placeholder={`Verify ${row.locationCode}`}
                                autoComplete="off"
                                disabled={!row.isMapped}
                                className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-8 pr-3 font-mono text-xs font-bold text-white outline-none placeholder:text-neutral-600 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400/30 disabled:opacity-50"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSetLocation}
                              disabled={!row.isMapped}
                              className="h-9 px-4 rounded-lg border border-brand-500/35 bg-brand-500/10 text-xs font-black uppercase tracking-wide text-brand-200 hover:bg-brand-500/20 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                            >
                              Set
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-300">
                                <Check size={11} /> {row.locationCode}
                              </span>
                              <button
                                type="button"
                                onClick={handleChangeLocation}
                                className="text-[10px] font-bold text-brand-300 hover:text-brand-200 transition-colors"
                              >
                                Change
                              </button>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                              <div className="relative">
                                <ScanLine size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                                <input
                                  ref={skuRef}
                                  value={skuCode}
                                  onChange={(e) => setSkuCode(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleSkuScan(); } }}
                                  placeholder={`Scan ${group.skuCode}${group.alias ? ` / ${group.alias}` : ""}`}
                                  autoComplete="off"
                                  className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-8 pr-3 font-mono text-xs font-bold text-white outline-none placeholder:text-neutral-600 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400/30"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleSkuScan()}
                                disabled={isPicking}
                                className="h-9 px-4 rounded-lg border border-brand-500/35 bg-brand-500/10 text-xs font-black uppercase tracking-wide text-brand-200 hover:bg-brand-500/20 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                              >
                                {isPicking ? "..." : "Pick"}
                              </button>
                            </div>
                            <div className="flex items-end gap-2">
                              <NumberInput
                                label="Qty"
                                size="xs"
                                className="flex-1"
                                min={1}
                                max={row.pickQuantity}
                                value={pickQty}
                                onChange={(v) => setPickQty(typeof v === "number" ? v : v === "" ? "" : Number(v))}
                              />
                              <Button
                                onClick={() => void submitPick(typeof pickQty === "number" ? pickQty : 0)}
                                loading={isPicking}
                                size="xs"
                                className="h-[30px]"
                                leftIcon={<Package size={13} />}
                              >
                                Pick Qty
                              </Button>
                            </div>
                          </div>
                        )}

                        {statusMessage && (
                          <div className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
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
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
          </>
        )}
      </div>
    </div>
  );
});

export default ConsolidatedPick;
