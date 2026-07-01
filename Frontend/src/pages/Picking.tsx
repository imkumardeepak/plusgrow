import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ActionIcon,
  Badge as MantineBadge,
  Modal,
  Select,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  X,
} from "lucide-react";

import { Button } from "../components/atoms/Button";
import { OperationsPage } from "../components/organisms/Operations/OperationsShell";
import { OutboundStageNav } from "../components/organisms/Operations/OutboundTaskUI";
import {
  OutwardOrder,
  Product,
  ProductLookupResult,
  outwardOrdersApi,
  productAllottedLocationsApi,
  ProductAllottedLocationRecord,
  productsApi,
  partiesApi,
  locationsApi,
  Location,
  Party,
} from "../services/masterApi";
import { toast } from "../lib/toast";
import ConsolidatedPick from "./ConsolidatedPick";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type DirectPickCartItem = {
  id: string;
  product: Product;
  skuCode: string;
  locationCode: string;
  binCode?: string;
  quantity: number;
  mrp: number | null;
  importDate: string | null;
  lookupResult: ProductLookupResult;
};

type ScanTone = "idle" | "success" | "error";

type StickerScan = {
  raw: string;
  sku: string;
  quantity: number;
  importDate?: string | null;
  batchNumber?: string | null;
  mrp?: number | null;
  hasFullData?: boolean;
};

type PickingOrderGroup = {
  salesOrderId: number;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  status: OutwardOrder["status"];
  items: OutwardOrder[];
  totalQuantity: number;
  totalPickedQuantity: number;
  pendingQuantity: number;
};

type PickingMode = "sales_orders" | "direct_pick" | "consolidated";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const parseStickerScan = (value: string): StickerScan => {
  const raw = value.trim();
  const parts = raw.split("#").map((p) => p.trim());
  const hasFullData = parts.length >= 4;
  const mrpText = hasFullData ? parts[3] : "";
  const mrpMatch = mrpText.match(/\d[\d,]*(?:\.\d+)?/);
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

const formatMrp = (v?: number | null) =>
  typeof v === "number" ? `Rs ${v.toFixed(2)}` : "—";

const isCanceledOrder = (o: OutwardOrder) =>
  o.status === "Canceled" || o.salesOrderStatus === "Canceled";

const normalizeProductScan = (v?: string | null) =>
  (v || "").trim().split("#")[0].trim().toLowerCase();

const getCartonQty = (
  scan: string,
  cartonQr?: string | null,
  cartonPerItem?: number | null,
) => {
  const norm = normalizeProductScan(cartonQr);
  if (!norm || normalizeProductScan(scan) !== norm) return 0;
  return cartonPerItem && cartonPerItem > 0 ? cartonPerItem : 1;
};

const statusColor: Record<string, string> = {
  Open: "blue",
  Picking: "yellow",
  Picked: "green",
  Packed: "cyan",
  Dispatched: "gray",
  Canceled: "red",
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export const Picking = memo(function Picking() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [locations, setLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [masterLocations, setMasterLocations] = useState<Location[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<PickingMode>("consolidated");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);

  // ── Scan state ────────────────────────────────────────────────────────────
  const [locationCode, setLocationCode] = useState("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [lastLocationCode, setLastLocationCode] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanTone, setScanTone] = useState<ScanTone>("idle");
  const [lastScanMessage, setLastScanMessage] = useState("Scan location first.");
  const [lastScanCode, setLastScanCode] = useState("");
  const [isPicking, setIsPicking] = useState(false);

  // ── MRP mismatch ──────────────────────────────────────────────────────────
  const [mrpMismatch, setMrpMismatch] = useState<{
    matchedItem: OutwardOrder;
    effectiveScan: StickerScan;
  } | null>(null);

  // ── Short close ───────────────────────────────────────────────────────────
  const [isShortCloseOpen, setIsShortCloseOpen] = useState(false);
  const [shortCloseRemark, setShortCloseRemark] = useState("");
  const [isShortClosing, setIsShortClosing] = useState(false);

  // ── Direct pick ───────────────────────────────────────────────────────────
  const [directCustomer, setDirectCustomer] = useState("Self");
  const [directItems, setDirectItems] = useState<DirectPickCartItem[]>([]);
  const [directSkuInput, setDirectSkuInput] = useState("");
  const [isDirectPicking, setIsDirectPicking] = useState(false);
  const [isDirectLoading, setIsDirectLoading] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const scanRef = useRef<HTMLInputElement>(null);
  const locRef = useRef<HTMLInputElement>(null);
  const directRef = useRef<HTMLInputElement>(null);

  /* ── Load data ─────────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersData, locsData, partiesData, masterLocsData] = await Promise.all([
        outwardOrdersApi.getAll(),
        productAllottedLocationsApi.getAll(),
        partiesApi.getPaged({ page: 1, pageSize: 1000 }),
        locationsApi.getAll(),
      ]);
      setOrders(ordersData);
      setLocations(locsData);
      setParties(partiesData.data);
      setMasterLocations(masterLocsData);
    } catch {
      toast.error("Failed to load picking data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    if (mode === "direct_pick") {
      window.setTimeout(() => directRef.current?.focus(), 50);
    }
  }, [mode]);

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const openOrders = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        !isCanceledOrder(o) &&
        o.pendingQuantity > 0 &&
        (o.status === "Open" || o.status === "Picking") &&
        (!q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.skuCode.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q) ||
          (o.alias && o.alias.toLowerCase().includes(q))),
    );
  }, [orders, searchQuery]);

  const orderGroups = useMemo<PickingOrderGroup[]>(() => {
    const map = new Map<number, PickingOrderGroup>();
    openOrders.forEach((o) => {
      const ex = map.get(o.salesOrderId);
      if (ex) {
        ex.items.push(o);
        ex.totalQuantity += o.quantity;
        ex.totalPickedQuantity += o.pickedQuantity;
        ex.pendingQuantity += o.pendingQuantity;
        ex.status =
          ex.items.every((i) => i.pendingQuantity === 0 || i.status === "Picked")
            ? "Picked"
            : ex.items.some((i) => i.pickedQuantity > 0 || i.status === "Picking")
              ? "Picking"
              : "Open";
        return;
      }
      map.set(o.salesOrderId, {
        salesOrderId: o.salesOrderId,
        orderNumber: o.orderNumber,
        orderDate: o.orderDate,
        customerName: o.customerName,
        status: o.pendingQuantity === 0 || o.status === "Picked" ? "Picked" : o.status,
        items: [o],
        totalQuantity: o.quantity,
        totalPickedQuantity: o.pickedQuantity,
        pendingQuantity: o.pendingQuantity,
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      const d = new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
      return d || b.orderNumber.localeCompare(a.orderNumber);
    });
  }, [openOrders]);

  const activeGroup = orderGroups.find((g) => g.salesOrderId === expandedOrderId) ?? null;
  const activeItem =
    activeGroup?.items.find((i) => i.id === activeItemId) ??
    activeGroup?.items[0] ??
    null;
  const isFullyPicked = activeGroup ? activeGroup.pendingQuantity === 0 : false;
  const progress =
    activeGroup && activeGroup.totalQuantity > 0
      ? Math.round((activeGroup.totalPickedQuantity / activeGroup.totalQuantity) * 100)
      : 0;

  /* ── Location helpers ───────────────────────────────────────────────────── */
  const getLocationSummary = useCallback(
    (productId: number) => {
      const row = locations.find((r) => r.productId === productId) ?? null;
      if (!row) return "Not mapped";
      const entries = Object.entries(row.locationJson || {});
      if (!entries.length) return "Not mapped";
      return entries.map(([c, q]) => `${c} (${q})`).join(", ");
    },
    [locations],
  );

  /* ── Reset scan when expanding a new order ─────────────────────────────── */
  useEffect(() => {
    if (!activeGroup) return;
    setScanCode("");
    setLocationCode("");
    setIsLocationLocked(false);
    setLastScanMessage("Scan location first.");
    setScanTone("idle");
    // auto-select first pending item
    const first = activeGroup.items.find((i) => i.pendingQuantity > 0);
    setActiveItemId(first?.id ?? activeGroup.items[0]?.id ?? null);
    window.setTimeout(() => locRef.current?.focus(), 80);
  }, [expandedOrderId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handle location set ─────────────────────────────────────────────────── */
  const handleSetLocation = () => {
    let loc = locationCode.trim().toUpperCase();
    if (!loc) { toast.error("Scan a location first"); return; }
    
    const locationByCode = masterLocations.find(l => l.locationCode.toUpperCase() === loc);
    if (!locationByCode) {
      const locationByBin = masterLocations.find(l => l.bins?.some(b => b.toUpperCase() === loc));
      if (locationByBin) {
        const binScanned = loc;
        loc = `${locationByBin.locationCode.toUpperCase()}::${binScanned}`;
        toast.info(`Bin resolved to Location ${locationByBin.locationCode}`);
      }
    }

    setLastLocationCode(loc);
    setIsLocationLocked(true);
    setLastScanMessage("Location set. Now scan SKU or Alias.");
    setScanCode("");
    window.setTimeout(() => scanRef.current?.focus(), 0);
  };

  const handleChangeLocation = () => {
    setIsLocationLocked(false);
    setLocationCode("");
    setLastScanMessage("Scan new location.");
    window.setTimeout(() => locRef.current?.focus(), 0);
  };

  /* ── Handle pick scan ─────────────────────────────────────────────────── */
  const handlePick = useCallback(
    async (orderItem: OutwardOrder, scan: StickerScan, mrpConfirmed = false) => {
      try {
        setIsPicking(true);
        const updated = await outwardOrdersApi.pick(orderItem.id, {
          quantity: scan.quantity,
          skuCode: orderItem.skuCode,
          locationCode: lastLocationCode.trim(),
          mrp: scan.mrp,
          importDate: scan.importDate,
          mrpMismatchConfirmed: mrpConfirmed,
        });
        setOrders((cur) => cur.map((r) => (r.id === updated.id ? updated : r)));
        setActiveItemId(updated.id);
        setLastScanCode(scan.raw);
        setScanTone("success");
        const rem = updated.pendingQuantity;
        setLastScanMessage(
          rem === 0
            ? `${updated.orderNumber} picked & ready for packing.`
            : `${rem} left to pick.`,
        );
        toast.success(
          rem === 0
            ? `${updated.orderNumber} ready for packing`
            : `Picked ${scan.quantity} for ${updated.orderNumber}`,
        );
        if (rem > 0) { setScanCode(""); window.setTimeout(() => scanRef.current?.focus(), 0); }
      } catch (err: any) {
        setScanTone("error");
        setLastScanCode(scan.raw);
        setLastScanMessage(err.message || "Pick failed.");
        toast.error(err.message || "Pick failed");
      } finally {
        setIsPicking(false);
      }
    },
    [lastLocationCode],
  );

  const handleScanSubmit = async () => {
    if (!activeGroup) { toast.error("Select an order first"); return; }
    if (!isLocationLocked) {
      toast.error("Set a location first");
      window.setTimeout(() => locRef.current?.focus(), 0);
      return;
    }
    const parsed = parseStickerScan(scanCode);
    if (!parsed.sku) { toast.error("Scan SKU or Alias"); return; }
    setLastScanCode(parsed.raw);
    if (isFullyPicked) { setScanTone("error"); setLastScanMessage("Order fully picked."); setScanCode(""); return; }

    const scanVal = normalizeProductScan(parsed.sku);
    const matched =
      activeGroup.items.find(
        (i) =>
          i.pendingQuantity > 0 &&
          (normalizeProductScan(i.skuCode) === scanVal ||
            normalizeProductScan(i.alias) === scanVal ||
            normalizeProductScan(i.cartonQr) === scanVal),
      ) ?? null;

    if (!matched) {
      setScanTone("error");
      setLastScanMessage(
        `Mismatch. Expected: ${activeGroup.items.map((i) => i.skuCode).join(", ")}`,
      );
      toast.error("SKU/Alias mismatch");
      setScanCode("");
      window.setTimeout(() => scanRef.current?.focus(), 0);
      return;
    }

    const cartonQty = getCartonQty(parsed.raw, matched.cartonQr, matched.cartonPerItem);
    const effectiveScan: StickerScan = {
      ...parsed,
      sku: matched.skuCode,
      quantity: Math.min(cartonQty > 0 ? cartonQty : 1, matched.pendingQuantity),
    };

    if (
      effectiveScan.hasFullData &&
      effectiveScan.mrp !== null &&
      matched.mrp !== null &&
      matched.mrp !== undefined &&
      Number(effectiveScan.mrp!.toFixed(2)) !== Number(Number(matched.mrp).toFixed(2))
    ) {
      setMrpMismatch({ matchedItem: matched, effectiveScan });
      return;
    }

    setActiveItemId(matched.id);
    await handlePick(matched, effectiveScan);
  };

  /* ── MRP mismatch handlers ───────────────────────────────────────────────── */
  const handleMrpConfirm = async () => {
    if (!mrpMismatch) return;
    const { matchedItem, effectiveScan } = mrpMismatch;
    setMrpMismatch(null);
    setActiveItemId(matchedItem.id);
    await handlePick(matchedItem, effectiveScan, true);
  };
  const handleMrpReject = () => {
    setMrpMismatch(null);
    setScanCode("");
    window.setTimeout(() => scanRef.current?.focus(), 0);
  };

  /* ── Short close ─────────────────────────────────────────────────────────── */
  const handleShortClose = async () => {
    if (!activeGroup) return;
    if (!shortCloseRemark.trim()) { toast.error("Enter a reason"); return; }
    try {
      setIsShortClosing(true);
      await outwardOrdersApi.shortCloseSalesOrder(activeGroup.salesOrderId, shortCloseRemark);
      await loadData();
      setIsShortCloseOpen(false);
      setShortCloseRemark("");
      setExpandedOrderId(null);
      toast.success(`${activeGroup.orderNumber} finished`);
    } catch (err: any) {
      toast.error(err.message || "Failed to finish order");
    } finally {
      setIsShortClosing(false);
    }
  };

  /* ── Direct pick handlers ────────────────────────────────────────────────── */
  const handleDirectScan = useCallback(async () => {
    const parsed = parseStickerScan(directSkuInput);
    if (!parsed.sku) { toast.error("Scan SKU or Alias"); return; }
    setIsDirectLoading(true);
    try {
      const result = await productsApi.lookup(parsed.sku);
      const cartonQty = getCartonQty(parsed.raw, result.product.cartonQr, result.product.cartonPerItem);
      const pickQty = cartonQty > 0 ? cartonQty : 1;
      const firstLoc = result.locations.find((e) => e.quantity > 0);
      
      const rawLocCode = firstLoc?.locationCode || "";
      const locParts = rawLocCode.split("::");
      const locCode = locParts[0];
      const binCode = locParts.length > 1 ? locParts[1] : undefined;
      if (!locCode) toast.error("No allotted location found for this product");

      setDirectItems((cur) => {
        const idx = cur.findIndex(
          (i) =>
            i.product.sku?.toLowerCase() === result.product.sku?.toLowerCase() ||
            (i.product.alias && i.product.alias.toLowerCase() === result.product.alias?.toLowerCase()),
        );
        if (idx >= 0) {
          return cur.map((i, n) => (n === idx ? { ...i, quantity: i.quantity + pickQty } : i));
        }
        return [
          {
            id: Math.random().toString(36).slice(7),
            product: result.product,
            skuCode: result.product.sku || result.product.alias || parsed.sku,
            locationCode: locCode,
            binCode: binCode,
            quantity: pickQty,
            mrp: parsed.mrp,
            importDate: parsed.importDate,
            lookupResult: result,
          },
          ...cur,
        ];
      });
      setDirectSkuInput("");
    } catch (err: any) {
      toast.error(err.message || "Product not found");
    } finally {
      setIsDirectLoading(false);
      window.setTimeout(() => directRef.current?.focus(), 50);
    }
  }, [directSkuInput]);

  const handleDirectSubmit = async () => {
    if (!directItems.length) { toast.error("Cart is empty"); return; }
    const customer = directCustomer === "Self" ? null : directCustomer;
    setIsDirectPicking(true);
    try {
      const created = await outwardOrdersApi.bulkDirectPick({
        remark: "Direct Pick",
        customerName: customer,
        items: directItems.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          skuCode: i.skuCode,
          locationCode: i.binCode ? `${i.locationCode}::${i.binCode}` : i.locationCode,
          mrp: i.mrp,
          importDate: i.importDate,
        })),
      });
      setOrders((cur) => [...created, ...cur]);
      toast.success(`${created.length} item(s) direct picked`);
      setDirectItems([]);
      setDirectCustomer("Self");
    } catch (err: any) {
      toast.error(err.message || "Direct pick failed");
    } finally {
      setIsDirectPicking(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <OperationsPage title="Picking" description="Pick orders" icon={Package} hideHeader>
      <div className="flex flex-col gap-2">

        {/* ── Stage nav ─────────────────────────────────────────────────── */}
        <OutboundStageNav active="picking" queueCount={orderGroups.length} compactLabel="Active" />

        {/* ── Mode tabs ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1">
          {(["consolidated", "direct_pick", "sales_orders"] as const).map((m) => {
            const labels: Record<PickingMode, string> = {
              sales_orders: "SO Wise",
              consolidated: "SO List",
              direct_pick: "Direct Pick",
            };
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                  mode === m
                    ? "bg-brand-500 text-slate-950 shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {labels[m]}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            CONSOLIDATED
        ════════════════════════════════════════════════════════════════ */}
        {mode === "consolidated" && <ConsolidatedPick />}

        {/* ═══════════════════════════════════════════════════════════════
            DIRECT PICK
        ════════════════════════════════════════════════════════════════ */}
        {mode === "direct_pick" && (
          <div className="flex flex-col gap-2">

            {/* ── Scan + party header ─────────────────────────────────────── */}
            <div className="rounded-xl border border-white/10 bg-[#10151e] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-white/[0.025]">
                <ScanLine size={14} className="text-brand-300" />
                <span className="text-sm font-bold text-white">Direct Pick</span>
                {directItems.length > 0 && (
                  <span className="ml-auto rounded bg-brand-500/15 px-2 py-0.5 text-[10px] font-black tabular-nums text-brand-200">
                    {directItems.length} in cart
                  </span>
                )}
              </div>

              <div className="p-3 space-y-2.5">
                {/* Party selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 w-[60px] shrink-0">
                    Customer
                  </span>
                  <Select
                    placeholder="Self"
                    data={[{ value: "Self", label: "Self" }, ...parties.map((p) => ({ value: p.name, label: p.name }))]}
                    value={directCustomer}
                    onChange={(v) => setDirectCustomer(v || "Self")}
                    searchable
                    clearable={false}
                    size="xs"
                    radius="md"
                    className="flex-1"
                    styles={{ input: { fontWeight: 700 } }}
                  />
                </div>

                {/* SKU scan row */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 w-[60px] shrink-0">
                    Scan SKU
                  </span>
                  <div className="relative flex-1">
                    <ScanLine size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      ref={directRef}
                      value={directSkuInput}
                      onChange={(e) => setDirectSkuInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleDirectScan(); } }}
                      disabled={isDirectLoading}
                      placeholder="Scan barcode / alias…"
                      autoComplete="off"
                      autoFocus
                      className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-8 pr-3 font-mono text-xs font-black text-white outline-none placeholder:text-neutral-600 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400/30 disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDirectScan()}
                    disabled={isDirectLoading || !directSkuInput.trim()}
                    className="h-9 min-w-[64px] rounded-lg border border-brand-500/35 bg-brand-500/10 px-3 text-xs font-black uppercase tracking-wide text-brand-200 transition-colors hover:bg-brand-500/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    {isDirectLoading ? "…" : "Add"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Cart table ──────────────────────────────────────────────── */}
            {directItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] py-10 text-center text-xs text-neutral-600">
                <ScanLine size={22} className="mb-2 text-neutral-700" />
                Scan a product to add it to the cart.
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#10151e] overflow-hidden">
                {/* Cart header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.025]">
                  <div className="flex items-center gap-2">
                    <Package size={13} className="text-brand-300" />
                    <span className="text-xs font-bold text-white">Cart</span>
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-black text-neutral-300">
                      {directItems.length}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      · {directItems.reduce((s, i) => s + i.quantity, 0)} units
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDirectItems([])}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-white/[0.06] bg-white/[0.015]">
                  <span>Product / SKU</span>
                  <span className="text-center hidden sm:block">Location</span>
                  <span className="text-center">Qty</span>
                  <span></span>
                </div>

                {/* Items */}
                {directItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center px-3 py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Product info */}
                    <div className="min-w-0">
                      <span className="block font-mono text-xs font-black text-brand-200">{item.skuCode}</span>
                      <span className="block text-[10px] text-neutral-400 truncate">{item.product.name}</span>
                    </div>

                    {/* Location badge */}
                    <div className="hidden sm:flex flex-col items-start gap-1">
                      <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-300 whitespace-nowrap">
                        {item.locationCode || "—"}
                        {item.binCode && <span className="ml-1 text-blue-200">[{item.binCode}]</span>}
                      </span>
                      {item.locationCode && masterLocations.find(l => l.locationCode.toUpperCase() === item.locationCode.toUpperCase())?.bins?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {masterLocations.find(l => l.locationCode.toUpperCase() === item.locationCode.toUpperCase())?.bins?.map(bin => (
                            <span key={bin} className="rounded border border-blue-500/30 px-1 py-0 text-[9px] text-blue-300 whitespace-nowrap">
                              {bin}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Qty stepper */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDirectItems((c) => c.map((i) => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                        className="h-6 w-6 rounded-md border border-white/10 bg-white/[0.06] text-sm font-black text-neutral-200 hover:bg-white/[0.12] transition-colors flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="min-w-[22px] text-center font-mono text-xs font-black text-white tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDirectItems((c) => c.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                        className="h-6 w-6 rounded-md border border-brand-500/30 bg-brand-500/10 text-sm font-black text-brand-200 hover:bg-brand-500/20 transition-colors flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => setDirectItems((c) => c.filter((i) => i.id !== item.id))}
                      className="h-6 w-6 rounded-md text-neutral-600 hover:bg-red-500/15 hover:text-red-400 transition-colors flex items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {/* Submit footer */}
                <div className="px-3 py-2.5 border-t border-white/10 bg-white/[0.025]">
                  <Button
                    fullWidth
                    size="sm"
                    onClick={() => void handleDirectSubmit()}
                    loading={isDirectPicking}
                    leftIcon={<ArrowRight size={14} />}
                  >
                    Submit Direct Pick ({directItems.reduce((s, i) => s + i.quantity, 0)} units for {directCustomer})
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SALES ORDERS  — flat table with inline expand
        ════════════════════════════════════════════════════════════════ */}
        {mode === "sales_orders" && (
          <div className="flex flex-col gap-2">
            {/* Search */}
            <TextInput
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

            {/* Refresh + count */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                {orderGroups.length === 0 ? "No open orders" : `${orderGroups.length} order(s) pending`}
              </span>
              <button
                type="button"
                onClick={() => void loadData()}
                className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white transition-colors"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Orders table */}
            <div className="rounded-xl border border-white/10 bg-[#10151e] overflow-hidden">
              {orderGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <Package size={30} className="text-neutral-700 mb-3" />
                  <p className="text-sm font-bold text-white">No open orders</p>
                  <p className="mt-1 text-xs text-neutral-500">Orders with pending quantity appear here.</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    <span></span>
                    <span>Order / Customer</span>
                    <span className="hidden sm:block">Lines</span>
                    <span className="text-right">Picked</span>
                    <span className="text-right">Status</span>
                  </div>

                  {orderGroups.map((group) => {
                    const isExpanded = group.salesOrderId === expandedOrderId;

                    return (
                      <div key={group.salesOrderId} className="border-b border-white/[0.05] last:border-0">

                        {/* ── Order row ───────────────────────────────────── */}
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedOrderId(isExpanded ? null : group.salesOrderId);
                          }}
                          className={`w-full grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 ${
                            isExpanded
                              ? "bg-brand-500/10"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="text-neutral-500">
                            {isExpanded
                              ? <ChevronDown size={14} className="text-brand-400" />
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
                              <span className="ml-2 text-neutral-600 hidden sm:inline">
                                {new Date(group.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              </span>
                            </span>
                          </span>

                          <span className="hidden sm:block text-xs text-neutral-400 text-right">
                            {group.items.length}
                          </span>

                          <span className="font-mono text-xs font-bold text-brand-200 text-right tabular-nums">
                            {group.totalPickedQuantity}/{group.totalQuantity}
                          </span>

                          <span>
                            <MantineBadge size="xs" color={statusColor[group.status] ?? "gray"} variant="light">
                              {group.status}
                            </MantineBadge>
                          </span>
                        </button>

                        {/* ── Expanded panel ──────────────────────────────── */}
                        {isExpanded && (
                          <div className="border-t border-white/10 bg-[#0b0f17] px-3 py-3 space-y-3">

                            {/* Progress bar */}
                            <div>
                              <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                                <span>{group.totalPickedQuantity}/{group.totalQuantity} units picked</span>
                                <span className="font-mono tabular-nums">{progress}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-[width] duration-300"
                                  style={{ width: `${progress}%` }}
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
                                    <th className="text-left px-2 py-1.5 hidden md:table-cell">Location</th>
                                    <th className="text-right px-3 py-1.5">Pending</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items.map((item) => {
                                    const done = item.pendingQuantity === 0;
                                    const isActive = item.id === activeItemId;
                                    return (
                                      <tr
                                        key={item.id}
                                        onClick={() => setActiveItemId(item.id)}
                                        className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors ${
                                          isActive
                                            ? "bg-brand-500/10"
                                            : done
                                              ? "opacity-40"
                                              : "hover:bg-white/[0.04]"
                                        }`}
                                      >
                                        <td className="px-3 py-2">
                                          <span className={`font-medium ${done ? "line-through text-neutral-500" : "text-white"} block truncate max-w-[140px]`}>
                                            {item.productName}
                                          </span>
                                          <span className="font-mono text-[10px] text-brand-300 sm:hidden">{item.skuCode}</span>
                                        </td>
                                        <td className="px-2 py-2 hidden sm:table-cell">
                                          <span className="font-mono text-brand-300">{item.skuCode}</span>
                                          {item.alias && <span className="ml-1 text-neutral-500">/ {item.alias}</span>}
                                        </td>
                                        <td className="px-2 py-2 hidden md:table-cell">
                                          <span className="flex items-center gap-1 text-neutral-400 text-[10px]">
                                            <MapPin size={10} />
                                            {getLocationSummary(item.productId)}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {done ? (
                                            <span className="inline-flex items-center gap-1 text-green-400 font-bold">
                                              <Check size={12} /> Done
                                            </span>
                                          ) : (
                                            <span className="font-mono font-black text-white tabular-nums">
                                              {item.pendingQuantity}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Scan section */}
                            {isFullyPicked ? (
                              <Button fullWidth color="green" onClick={() => navigate("/packing")}>
                                ✓ All Picked — Continue to Packing
                              </Button>
                            ) : (
                              <div className="rounded-lg border border-white/10 bg-[#10151e] p-3 space-y-2.5">
                                {/* Active item hint */}
                                {activeItem && (
                                  <div className="flex items-center gap-2 rounded-md bg-brand-500/10 border border-brand-500/20 px-2.5 py-1.5 text-xs">
                                    <Package size={13} className="text-brand-300 shrink-0" />
                                    <span className="font-bold text-brand-200 truncate">{activeItem.productName}</span>
                                    <span className="ml-auto font-mono text-brand-300 shrink-0 tabular-nums">
                                      {activeItem.pendingQuantity} left
                                    </span>
                                  </div>
                                )}

                                {/* Scan feedback */}
                                {(lastScanMessage || lastScanCode) && (
                                  <div className={`rounded-md border px-2.5 py-1.5 text-[11px] ${
                                    scanTone === "error"
                                      ? "border-red-500/25 bg-red-500/[0.07] text-red-200"
                                      : scanTone === "success"
                                        ? "border-green-500/20 bg-green-500/[0.06] text-green-200"
                                        : "border-white/10 bg-white/[0.025] text-neutral-400"
                                  }`}>
                                    {scanTone === "error" && <AlertTriangle size={11} className="inline mr-1.5 text-red-400" />}
                                    {lastScanMessage}
                                    {lastScanCode && <span className="ml-1.5 font-mono text-neutral-500">({lastScanCode})</span>}
                                  </div>
                                )}

                                {/* Location input */}
                                {!isLocationLocked ? (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                      Step 1 — Scan Location
                                    </label>
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <MapPin size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                                        <input
                                          ref={locRef}
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
                                        className="h-9 px-4 rounded-lg border border-brand-500/35 bg-brand-500/10 text-xs font-black uppercase tracking-wide text-brand-200 hover:bg-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 transition-colors"
                                      >
                                        Set
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                        Step 2 — Scan Product
                                      </label>
                                      <button
                                        type="button"
                                        onClick={handleChangeLocation}
                                        className="text-[10px] font-bold text-brand-300 hover:text-brand-200 transition-colors"
                                      >
                                        📍 {lastLocationCode} 
                                        {masterLocations.find(l => l.locationCode.toUpperCase() === lastLocationCode.toUpperCase())?.bins?.map(bin => (
                                          <span key={bin} className="ml-1 rounded border border-brand-300/30 px-1 text-[9px]">
                                            {bin}
                                          </span>
                                        ))}
                                        · Change
                                      </button>
                                    </div>
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <ScanLine size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                                        <input
                                          ref={scanRef}
                                          value={scanCode}
                                          onChange={(e) => setScanCode(e.target.value)}
                                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleScanSubmit(); } }}
                                          disabled={isPicking}
                                          placeholder="Scan SKU, alias, or carton QR…"
                                          autoComplete="off"
                                          className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-8 pr-3 font-mono text-xs font-bold text-white outline-none placeholder:text-neutral-600 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400/30 disabled:opacity-50"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => void handleScanSubmit()}
                                        disabled={isPicking}
                                        className="h-9 px-4 rounded-lg border border-brand-500/35 bg-brand-500/10 text-xs font-black uppercase tracking-wide text-brand-200 hover:bg-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50 transition-colors"
                                      >
                                        {isPicking ? "…" : "Pick"}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Short close */}
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setIsShortCloseOpen(true)}
                                    className="text-[10px] font-bold text-yellow-600 hover:text-yellow-400 transition-colors"
                                  >
                                    Exception: Short Close
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Short close */}
      <Modal
        opened={isShortCloseOpen}
        onClose={() => setIsShortCloseOpen(false)}
        title="Complete Picking"
        centered
        size="sm"
      >
        <Text size="md" mb="lg" color="dimmed">
          Finish picking this order without fulfilling all items.
          Any remaining unpicked quantities will be canceled permanently.
        </Text>
        <Textarea
          label="Reason for Short Close"
          placeholder="e.g. Stock unavailable, damaged items, etc."
          required
          value={shortCloseRemark}
          onChange={(e) => setShortCloseRemark(e.currentTarget.value)}
          minRows={4}
          size="md"
          data-autofocus
        />
        <div className="mt-8 flex justify-end gap-2.5">
          <Button variant="outline" color="gray" size="md" onClick={() => setIsShortCloseOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleShortClose} loading={isShortClosing} color="yellow" size="md">
            Confirm & Save Order
          </Button>
        </div>
      </Modal>

      {/* MRP mismatch */}
      <Modal opened={!!mrpMismatch} onClose={handleMrpReject} title="Price Mismatch Alert" centered size="md">
        {mrpMismatch && (
          <div className="space-y-3">
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-orange-400 mt-0.5 shrink-0" size={18} />
                <div>
                  <p className="text-sm text-neutral-300">The scanned item has a different price than the sales order.</p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">Scanned Price</p>
                      <p className="text-base font-black text-white">Rs {mrpMismatch.effectiveScan.mrp}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">Expected Price</p>
                      <p className="text-base font-black text-white">Rs {mrpMismatch.matchedItem.mrp}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm font-semibold text-white">Do you want to proceed with picking this item?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" color="gray" size="sm" onClick={handleMrpReject}>Reject</Button>
              <Button color="orange" size="sm" onClick={handleMrpConfirm}>OK, Pick Item</Button>
            </div>
          </div>
        )}
      </Modal>
    </OperationsPage>
  );
});

export default Picking;
