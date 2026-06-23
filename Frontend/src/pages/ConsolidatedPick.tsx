import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, NumberInput, ScrollArea, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { AlertTriangle, Layers, Package, RefreshCw, ScanLine, X } from "lucide-react";

import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import {
  OperationsEmptyState,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  OutwardOrder,
  ProductAllottedLocationRecord,
  SalesOrderRecord,
  outwardOrdersApi,
  productAllottedLocationsApi,
} from "../services/masterApi";
import { toast } from "../lib/toast";

type ScanTone = "idle" | "success" | "error";

type StickerScan = {
  raw: string;
  sku: string;
  quantity: number;
  importDate?: string | null;
  mrp?: number | null;
  hasFullData?: boolean;
};

// Sticker format: <SKUCODE>#<QNTY>#<DATEOFIMPORT>#<INVOICENUMBER/PRICE>
const parseStickerScan = (value: string): StickerScan => {
  const raw = value.trim();
  const parts = raw.split("#").map((part) => part.trim());
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

const normalizeProductScan = (value?: string | null) =>
  (value || "").trim().split("#")[0].trim().toLowerCase();

const getCartonQuantity = (
  scan: string,
  cartonQr?: string | null,
  cartonPerItem?: number | null,
) => {
  const normalizedCartonQr = normalizeProductScan(cartonQr);
  if (!normalizedCartonQr || normalizeProductScan(scan) !== normalizedCartonQr) return 0;
  return cartonPerItem && cartonPerItem > 0 ? cartonPerItem : 1;
};

const formatMrp = (value?: number | null) =>
  typeof value === "number" ? `Rs ${value.toFixed(2)}` : "-";

const mrpKey = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "null";

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

const deriveOrderStatus = (items: OutwardOrder[]): SalesOrderRecord["status"] => {
  if (items.length === 0) return "Open";
  if (items.every((item) => item.pendingQuantity === 0)) return "Picked";
  if (items.some((item) => item.pickedQuantity > 0)) return "Picking";
  return "Open";
};

export const ConsolidatedPick = memo(function ConsolidatedPick() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [orders, setOrders] = useState<SalesOrderRecord[]>([]);
  const [locations, setLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState("");

  const [locationScanCode, setLocationScanCode] = useState("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [skuScanCode, setSkuScanCode] = useState("");
  const [pickQuantity, setPickQuantity] = useState<number | "">("");
  const [scanTone, setScanTone] = useState<ScanTone>("idle");
  const [statusMessage, setStatusMessage] = useState("Select open sales orders, then a product to pick.");

  const [isLoading, setIsLoading] = useState(true);
  const [isPicking, setIsPicking] = useState(false);

  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const skuInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersData, locationsData] = await Promise.all([
        // Only open sales orders are offered for selection.
        outwardOrdersApi.getSalesOrders({ status: "open", pageSize: 500 }),
        productAllottedLocationsApi.getAll(),
      ]);
      setOrders(ordersData.filter((order) => order.status !== "Canceled"));
      setLocations(locationsData);
    } catch {
      toast.error("Failed to load consolidated picking data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    const withPending = orders.filter((order) =>
      order.items.some((item) => item.pendingQuantity > 0),
    );
    if (!query) return withPending;
    return withPending.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.items.some(
          (item) =>
            item.skuCode.toLowerCase().includes(query) ||
            item.productName.toLowerCase().includes(query) ||
            (item.alias && item.alias.toLowerCase().includes(query)),
        ),
    );
  }, [orders, orderSearch]);

  const toggleOrder = (salesOrderId: number) => {
    setSelectedOrderIds((current) =>
      current.includes(salesOrderId)
        ? current.filter((id) => id !== salesOrderId)
        : [...current, salesOrderId],
    );
  };

  const allVisibleSelected =
    visibleOrders.length > 0 && visibleOrders.every((order) => selectedOrderIds.includes(order.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleOrders.map((order) => order.id));
      setSelectedOrderIds((current) => current.filter((id) => !visibleIds.has(id)));
    } else {
      setSelectedOrderIds((current) =>
        Array.from(new Set([...current, ...visibleOrders.map((order) => order.id)])),
      );
    }
  };

  const groups = useMemo<ConsolidatedGroup[]>(() => {
    const selected = new Set(selectedOrderIds);
    const map = new Map<string, ConsolidatedGroup>();

    orders
      .filter((order) => selected.has(order.id))
      .forEach((order) => {
        order.items.forEach((item) => {
          if (item.pendingQuantity <= 0) return;
          const key = `${item.productId}__${mrpKey(item.mrp)}`;
          const line: ConsolidatedLine = {
            orderItemId: item.id,
            salesOrderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            orderDate: order.orderDate,
            quantity: item.quantity,
            pickedQuantity: item.pickedQuantity,
            pendingQuantity: item.pendingQuantity,
          };

          const existing = map.get(key);
          if (existing) {
            existing.totalQuantity += item.quantity;
            existing.totalPicked += item.pickedQuantity;
            existing.totalPending += item.pendingQuantity;
            existing.lines.push(line);
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
      .map((group) => ({
        ...group,
        lines: group.lines.sort(
          (a, b) =>
            new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime() ||
            a.orderNumber.localeCompare(b.orderNumber),
        ),
      }))
      .sort((a, b) => a.skuCode.localeCompare(b.skuCode));
  }, [orders, selectedOrderIds]);

  useEffect(() => {
    if (activeGroupKey && !groups.some((group) => group.key === activeGroupKey)) {
      setActiveGroupKey(null);
    }
  }, [groups, activeGroupKey]);

  const activeGroup = groups.find((group) => group.key === activeGroupKey) ?? null;

  const getLocationSummary = useCallback(
    (productId: number) => {
      const row = locations.find((entry) => entry.productId === productId) ?? null;
      if (!row) return "Not mapped";
      const entries = Object.entries(row.locationJson || {});
      if (entries.length === 0) return "Not mapped";
      return entries.map(([code, quantity]) => `${code} (${quantity})`).join(", ");
    },
    [locations],
  );

  // Reset the scan workflow whenever the active product group changes.
  useEffect(() => {
    setLocationScanCode("");
    setIsLocationLocked(false);
    setSkuScanCode("");
    setScanTone("idle");
    if (activeGroup) {
      setPickQuantity(activeGroup.totalPending);
      setStatusMessage(`Scan location for ${activeGroup.skuCode}.`);
      window.setTimeout(() => locationInputRef.current?.focus(), 0);
    } else {
      setPickQuantity("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupKey]);

  const handleLocationSubmit = () => {
    const normalized = locationScanCode.trim();
    if (!normalized) {
      toast.error("Scan location code");
      return;
    }
    setIsLocationLocked(true);
    setStatusMessage("Location set. Now scan the product SKU or Alias.");
    window.setTimeout(() => skuInputRef.current?.focus(), 0);
  };

  const handleChangeLocation = () => {
    setIsLocationLocked(false);
    setLocationScanCode("");
    setStatusMessage("Scan new location.");
    window.setTimeout(() => locationInputRef.current?.focus(), 0);
  };

  const applyUpdatedItems = (updatedItems: OutwardOrder[]) => {
    if (updatedItems.length === 0) return;
    setOrders((current) =>
      current.map((order) => {
        const updatesForOrder = updatedItems.filter((item) => item.salesOrderId === order.id);
        if (updatesForOrder.length === 0) return order;
        const items = order.items.map(
          (item) => updatesForOrder.find((updated) => updated.id === item.id) ?? item,
        );
        return {
          ...order,
          items,
          status: deriveOrderStatus(items),
          totalPickedQuantity: items.reduce((sum, item) => sum + item.pickedQuantity, 0),
          pendingQuantity: items.reduce((sum, item) => sum + item.pendingQuantity, 0),
        };
      }),
    );
  };

  const submitPick = async (quantity: number) => {
    if (!activeGroup) {
      toast.error("Select a product group first");
      return;
    }
    const normalizedLocation = locationScanCode.trim();
    if (!normalizedLocation) {
      toast.error("Scan location first");
      return;
    }
    if (quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    const cappedQuantity = Math.min(quantity, activeGroup.totalPending);

    try {
      setIsPicking(true);
      const result = await outwardOrdersApi.consolidatedPick({
        salesOrderIds: selectedOrderIds,
        productId: activeGroup.productId,
        quantity: cappedQuantity,
        skuCode: activeGroup.skuCode,
        locationCode: normalizedLocation,
        mrp: activeGroup.mrp,
      });

      applyUpdatedItems(result.updatedItems);
      setScanTone("success");
      setStatusMessage(
        `Picked ${result.pickedQuantity} of ${activeGroup.skuCode} from ${result.locationCode} across ${result.allocations.length} order(s).`,
      );
      toast.success(`Picked ${result.pickedQuantity} unit(s) across ${result.allocations.length} order(s)`);
      const remainingPending = Math.max(activeGroup.totalPending - result.pickedQuantity, 0);
      setPickQuantity(remainingPending > 0 ? remainingPending : "");
      setSkuScanCode("");
      window.setTimeout(() => skuInputRef.current?.focus(), 0);
    } catch (error: any) {
      setScanTone("error");
      setStatusMessage(error.message || "Consolidated pick failed.");
      toast.error(error.message || "Consolidated pick failed");
    } finally {
      setIsPicking(false);
    }
  };

  const handleSkuScanSubmit = async () => {
    if (!activeGroup) {
      toast.error("Select a product group first");
      return;
    }
    if (!isLocationLocked) {
      toast.error("Scan location first");
      window.setTimeout(() => locationInputRef.current?.focus(), 0);
      return;
    }

    const parsed = parseStickerScan(skuScanCode);
    if (!parsed.sku) {
      toast.error("Scan SKU or Alias");
      return;
    }

    const scanVal = normalizeProductScan(parsed.sku);
    const matchesProduct =
      normalizeProductScan(activeGroup.skuCode) === scanVal ||
      normalizeProductScan(activeGroup.alias) === scanVal ||
      normalizeProductScan(activeGroup.cartonQr) === scanVal;

    if (!matchesProduct) {
      setScanTone("error");
      setStatusMessage(
        `SKU/Alias mismatch. Expected ${activeGroup.skuCode}${activeGroup.alias ? ` / ${activeGroup.alias}` : ""}.`,
      );
      toast.error("SKU/Alias mismatch");
      setSkuScanCode("");
      window.setTimeout(() => skuInputRef.current?.focus(), 0);
      return;
    }

    // MRP guard, mirroring the per-item pick screen behaviour.
    if (
      parsed.hasFullData &&
      parsed.mrp !== null &&
      activeGroup.mrp !== null &&
      Number(parsed.mrp.toFixed(2)) !== Number(activeGroup.mrp.toFixed(2))
    ) {
      const message = `Price Mismatch Alert!\n\nSticker Price: Rs ${parsed.mrp}\nSales Order Price: Rs ${activeGroup.mrp}\n\nProceed with picking?`;
      if (!window.confirm(message)) {
        setSkuScanCode("");
        window.setTimeout(() => skuInputRef.current?.focus(), 0);
        return;
      }
    }

    // A single scan adds the carton quantity (or 1) toward the consolidated total.
    const cartonQuantity = getCartonQuantity(parsed.raw, activeGroup.cartonQr, activeGroup.cartonPerItem);
    const increment = Math.min(cartonQuantity > 0 ? cartonQuantity : 1, activeGroup.totalPending);
    await submitPick(increment);
  };

  const handlePickEntered = () => {
    const quantity = typeof pickQuantity === "number" ? pickQuantity : 0;
    void submitPick(quantity);
  };

  const totalSelectedPending = groups.reduce((sum, group) => sum + group.totalPending, 0);

  return (
    <div className={isMobile ? "space-y-4" : "grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"}>
      <OperationsPanel
        title="Open Sales Orders"
        icon={Layers}
        description="Select the open orders to pick together."
        action={
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
              {selectedOrderIds.length} selected
            </span>
            <Button size="xs" variant="outline" leftIcon={<RefreshCw size={13} />} loading={isLoading} onClick={() => void loadData()}>
              Refresh
            </Button>
          </div>
        }
      >
        <input
          value={orderSearch}
          onChange={(event) => setOrderSearch(event.target.value)}
          placeholder="Search order, customer, SKU or alias..."
          className="mb-3 h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />

        {visibleOrders.length > 0 ? (
          <>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-300 hover:text-brand-200"
            >
              {allVisibleSelected ? "Clear all" : "Select all"}
            </button>
            <div className="max-h-[560px] space-y-2 overflow-y-auto scrollbar-thin">
              {visibleOrders.map((order) => {
                const pending = order.items.reduce((sum, item) => sum + item.pendingQuantity, 0);
                const checked = selectedOrderIds.includes(order.id);
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => toggleOrder(order.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      checked
                        ? "border-brand-500/40 bg-brand-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-brand-500/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <Checkbox checked={checked} readOnly tabIndex={-1} mt={2} style={{ pointerEvents: "none" }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-white">{order.orderNumber}</p>
                        <Badge variant="warning" shape="pill" className="border-none">
                          {pending} pending
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-400">{order.customerName}</p>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {order.items.length} item(s) · {order.totalQuantity} qty
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <OperationsEmptyState
            icon={Layers}
            title="No open orders"
            description="There are no open sales orders with pending quantity."
          />
        )}
      </OperationsPanel>

      <OperationsPanel
        title="Pick by Product"
        icon={Package}
        description="Pick the combined quantity per product across the selected orders."
        action={
          <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
            {groups.length} product(s) · {totalSelectedPending} pending
          </span>
        }
      >
        {selectedOrderIds.length === 0 ? (
          <OperationsEmptyState
            icon={Package}
            title="No orders selected"
            description="Select one or more open sales orders on the left to build the product pick list."
          />
        ) : groups.length === 0 ? (
          <OperationsEmptyState
            icon={Package}
            title="Nothing to pick"
            description="The selected orders have no pending quantity."
          />
        ) : (
          <div className="space-y-3">
            <div className="max-h-[280px] space-y-2 overflow-y-auto scrollbar-thin">
              {groups.map((group) => {
                const active = group.key === activeGroupKey;
                const done = group.totalPending === 0;
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setActiveGroupKey(group.key)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-brand-500/40 bg-brand-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-brand-500/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{group.productName}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-brand-300">
                          {group.skuCode}
                          {group.alias ? ` / ${group.alias}` : ""} · MRP {formatMrp(group.mrp)}
                        </p>
                      </div>
                      <Badge variant={done ? "success" : "warning"} shape="pill" className="border-none">
                        {done ? "Done" : `${group.totalPending} to pick`}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <p className="uppercase tracking-wider text-neutral-500">Orders</p>
                        <p className="mt-0.5 font-mono text-brand-300">{group.lines.length}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wider text-neutral-500">Need</p>
                        <p className="mt-0.5 font-bold text-white">{group.totalQuantity}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wider text-neutral-500">Picked</p>
                        <p className="mt-0.5 font-bold text-white">{group.totalPicked}</p>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-neutral-400">
                      Location: {getLocationSummary(group.productId)}
                    </p>
                  </button>
                );
              })}
            </div>

            {activeGroup ? (
              <>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-brand-400" />
                    <p className="text-xs font-semibold text-white">
                      Orders for {activeGroup.skuCode} ({activeGroup.lines.length})
                    </p>
                  </div>
                  <ScrollArea.Autosize mah={150}>
                    <div className="space-y-1.5">
                      {activeGroup.lines.map((line) => (
                        <div
                          key={line.orderItemId}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-white">{line.orderNumber}</p>
                            <p className="truncate text-[10px] text-neutral-400">{line.customerName}</p>
                          </div>
                          <Badge variant={line.pendingQuantity === 0 ? "success" : "warning"} shape="pill" className="border-none">
                            {line.pickedQuantity}/{line.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea.Autosize>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <ScanLine className="h-3.5 w-3.5 text-brand-400" />
                    <p className="text-xs font-semibold text-white">Scan to Pick</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          ref={locationInputRef}
                          value={locationScanCode}
                          onChange={(event) => setLocationScanCode(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !isLocationLocked) {
                              event.preventDefault();
                              handleLocationSubmit();
                            }
                          }}
                          placeholder="Scan location first"
                          disabled={isLocationLocked}
                          className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-2.5 pr-8 text-xs text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                        />
                        {locationScanCode && !isLocationLocked && (
                          <button
                            type="button"
                            onClick={() => {
                              setLocationScanCode("");
                              locationInputRef.current?.focus();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {isLocationLocked ? (
                        <Button size="xs" variant="outline" onClick={handleChangeLocation} className="h-9">
                          Change
                        </Button>
                      ) : (
                        <Button size="xs" onClick={handleLocationSubmit} className="h-9">
                          Set
                        </Button>
                      )}
                    </div>

                    <input
                      ref={skuInputRef}
                      value={skuScanCode}
                      onChange={(event) => setSkuScanCode(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleSkuScanSubmit();
                        }
                      }}
                      placeholder={
                        isLocationLocked
                          ? `Scan ${activeGroup.skuCode}${activeGroup.alias ? ` or ${activeGroup.alias}` : ""}`
                          : "Set location first"
                      }
                      disabled={!isLocationLocked || activeGroup.totalPending === 0}
                      className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                    />

                    <div className="flex items-end gap-2">
                      <NumberInput
                        label="Quantity to pick"
                        size="xs"
                        className="flex-1"
                        min={1}
                        max={activeGroup.totalPending}
                        value={pickQuantity}
                        onChange={(value) =>
                          setPickQuantity(typeof value === "number" ? value : value === "" ? "" : Number(value))
                        }
                        disabled={!isLocationLocked || activeGroup.totalPending === 0}
                      />
                      <Button
                        onClick={handlePickEntered}
                        loading={isPicking}
                        disabled={!isLocationLocked || activeGroup.totalPending === 0}
                        size="xs"
                        leftIcon={<Package className="h-3.5 w-3.5" />}
                        className="h-9"
                      >
                        Pick Qty
                      </Button>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Allocated oldest order first. Max {activeGroup.totalPending} for this product.
                    </p>
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    scanTone === "success"
                      ? "border-green-500/20 bg-green-500/10"
                      : scanTone === "error"
                        ? "border-red-500/20 bg-red-500/10"
                        : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">Status</p>
                  <p className="mt-1 text-xs font-semibold text-white">
                    {scanTone === "error" ? (
                      <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-red-300" />
                    ) : null}
                    {statusMessage}
                  </p>
                </div>
              </>
            ) : (
              <OperationsEmptyState
                icon={ScanLine}
                title="Select a product"
                description="Choose a product above to scan and pick its combined quantity."
              />
            )}
          </div>
        )}
      </OperationsPanel>
    </div>
  );
});

export default ConsolidatedPick;
