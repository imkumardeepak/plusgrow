import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  MapPin,
  Package,
  ScanLine,
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
  productAllottedLocationsApi,
  ProductAllottedLocationRecord,
} from "../services/masterApi";
import { toast } from "../lib/toast";

type ScanTone = "idle" | "success" | "error";

export const Packing = memo(function Packing() {
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [locations, setLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [locationScanCode, setLocationScanCode] = useState("");
  const [lastScanCode, setLastScanCode] = useState("");
  const [lastLocationCode, setLastLocationCode] = useState("");
  const [lastScanMessage, setLastScanMessage] = useState("Scan selected order SKU to pick 1 unit.");
  const [scanTone, setScanTone] = useState<ScanTone>("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isPicking, setIsPicking] = useState(false);
  const navigate = useNavigate();
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersData, locationsData] = await Promise.all([
        outwardOrdersApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setOrders(ordersData);
      setLocations(locationsData);
    } catch {
      toast.error("Failed to load packing data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openOrders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        (order.status === "Open" || order.status === "Picking" || order.status === "Packed") &&
        (order.orderNumber.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.skuCode.toLowerCase().includes(query)),
    );
  }, [orders, searchQuery]);

  useEffect(() => {
    if (!selectedOrderId && openOrders.length > 0) {
      setSelectedOrderId(openOrders[0].id);
    }

    if (selectedOrderId && !openOrders.some((row) => row.id === selectedOrderId)) {
      setSelectedOrderId(openOrders[0]?.id ?? null);
    }
  }, [openOrders, selectedOrderId]);

  const activeOrder = openOrders.find((row) => row.id === selectedOrderId) ?? null;
  const locationRow =
    activeOrder
      ? locations.find((row) => row.productId === activeOrder.productId) ?? null
      : null;

  const locationSummary = useMemo(() => {
    if (!locationRow) return "Not mapped";
    const entries = Object.entries(locationRow.locationJson || {});
    if (entries.length === 0) return "Not mapped";
    return entries
      .slice(0, 3)
      .map(([code, qty]) => `${code} (${qty})`)
      .join(", ");
  }, [locationRow]);

  const readyOrders = openOrders.filter((row) => row.status === "Packed").length;
  const pickedOrders = openOrders.filter((row) => row.pendingQuantity === 0).length;
  const progress = openOrders.length > 0 ? Math.round((pickedOrders / openOrders.length) * 100) : 0;
  const isFullyPicked = activeOrder ? activeOrder.pendingQuantity === 0 : false;

  useEffect(() => {
    if (!activeOrder) return;
    setLastScanMessage(`Scan SKU ${activeOrder.skuCode}, then scan location to pick this order.`);
    setScanTone("idle");
    setScanCode("");
    setLocationScanCode("");
    window.setTimeout(() => scanInputRef.current?.focus(), 0);
  }, [activeOrder?.id]);

  const handlePick = useCallback(
    async (order: OutwardOrder, scannedSku?: string) => {
      const normalizedLocation = locationScanCode.trim();

      try {
        setIsPicking(true);
        const updated = await outwardOrdersApi.pick(order.id, {
          quantity: 1,
          skuCode: scannedSku ?? order.skuCode,
          locationCode: normalizedLocation,
        });
        setOrders((current) => current.map((row) => (row.id === updated.id ? updated : row)));
        setSelectedOrderId(updated.id);
        setLastScanCode(scannedSku ?? order.skuCode);
        setLastLocationCode(normalizedLocation);
        setScanTone("success");
        setLastScanMessage(
          updated.pendingQuantity === 0
            ? `${updated.orderNumber} packed and ready for dispatch.`
            : `Picked 1 unit from ${normalizedLocation} for ${updated.orderNumber}. ${updated.pendingQuantity} pending.`,
        );
        toast.success(
          updated.pendingQuantity === 0
            ? `${updated.orderNumber} is packed and ready for dispatch`
            : `Picked 1 unit for ${updated.orderNumber}`,
        );
      } catch (error: any) {
        setScanTone("error");
        setLastScanCode(scannedSku ?? order.skuCode);
        setLastScanMessage(error.message || "Failed to update picking progress.");
        toast.error(error.message || "Failed to update picking progress");
      } finally {
        setIsPicking(false);
        setScanCode("");
        setLocationScanCode("");
        window.setTimeout(() => scanInputRef.current?.focus(), 0);
      }
    },
    [locationScanCode],
  );

  const handleScanSubmit = async () => {
    if (!activeOrder) {
      toast.error("Select an outward order first");
      return;
    }

    const normalizedScan = scanCode.trim();
    if (!normalizedScan) {
      toast.error("Scan SKU code first");
      return;
    }

    const normalizedLocation = locationScanCode.trim();
    if (!normalizedLocation) {
      toast.error("Scan location code after SKU");
      window.setTimeout(() => locationInputRef.current?.focus(), 0);
      return;
    }

    setLastScanCode(normalizedScan);
    setLastLocationCode(normalizedLocation);

    if (isFullyPicked) {
      setScanTone("error");
      setLastScanMessage("This order is already fully picked.");
      setScanCode("");
      return;
    }

    if (normalizedScan.toLowerCase() !== activeOrder.skuCode.toLowerCase()) {
      setScanTone("error");
      setLastScanMessage(`Scanned SKU ${normalizedScan} does not match ${activeOrder.skuCode}.`);
      toast.error("Scanned SKU does not match selected order");
      setScanCode("");
      window.setTimeout(() => scanInputRef.current?.focus(), 0);
      return;
    }

    await handlePick(activeOrder, normalizedScan);
  };

  return (
    <OperationsPage
      title="Picking & Packing"
      description="Select a live outward order, review mapped pick locations, and complete picking until the order is packed."
      icon={Package}
      hideHeader
    >
      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <OperationsPanel
          title="Open Orders"
          icon={ClipboardList}
          description="Choose a live order."
          action={
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                {openOrders.length} Active
              </span>
              <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                {readyOrders} Ready
              </span>
              <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                {progress}% Done
              </span>
            </div>
          }
        >
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order, customer, or SKU..."
            className="mb-3 h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />

          {openOrders.length > 0 ? (
            <div className="max-h-[580px] space-y-2 overflow-y-auto scrollbar-thin">
              {openOrders.map((order) => {
                const done = order.pendingQuantity === 0;
                const active = order.id === selectedOrderId;

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-brand-500/40 bg-brand-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-brand-500/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{order.orderNumber}</p>
                        <p className="mt-1 text-xs text-neutral-400">{order.customerName}</p>
                      </div>
                      <Badge variant={done ? "success" : "warning"} shape="pill" className="border-none">
                        {done ? "Ready" : order.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">SKU</p>
                        <p className="mt-1 font-mono text-brand-300">{order.skuCode}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">Picked</p>
                        <p className="mt-1 font-bold text-white">{order.pickedQuantity} / {order.quantity}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <OperationsEmptyState
              icon={ClipboardList}
              title="No active orders"
              description="No open outward orders are waiting for picking."
            />
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Scan Packing"
          icon={ScanLine}
          description="Scan SKU and location to confirm each pick."
        >
          {activeOrder ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{activeOrder.orderNumber}</p>
                      <p className="mt-1 text-xs text-neutral-300">{activeOrder.customerName}</p>
                    </div>
                    <Badge variant={isFullyPicked ? "success" : "warning"} shape="pill" className="border-none">
                      {isFullyPicked ? "Ready for Dispatch" : activeOrder.status}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Product</p>
                      <p className="mt-1 text-sm font-semibold text-white">{activeOrder.productName}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">SKU To Scan</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-brand-300">{activeOrder.skuCode}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Pick Location</p>
                      <p className="mt-1 text-sm font-semibold text-white">{locationSummary}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Required</p>
                    <p className="mt-2 text-2xl font-black text-white">{activeOrder.quantity}</p>
                  </div>
                  <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Picked</p>
                    <p className="mt-2 text-2xl font-black text-brand-300">{activeOrder.pickedQuantity}</p>
                  </div>
                  <div className="rounded-xl border border-warning-500/20 bg-warning-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Pending</p>
                    <p className="mt-2 text-2xl font-black text-warning-400">{activeOrder.pendingQuantity}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-brand-400" />
                  <p className="text-sm font-semibold text-white">Pick Scan</p>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                  <input
                    ref={scanInputRef}
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!locationScanCode.trim()) {
                          locationInputRef.current?.focus();
                          return;
                        }
                        void handleScanSubmit();
                      }
                    }}
                    placeholder={`Scan ${activeOrder.skuCode}`}
                    className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                  <input
                    ref={locationInputRef}
                    value={locationScanCode}
                    onChange={(e) => setLocationScanCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleScanSubmit();
                      }
                    }}
                    placeholder="Scan location or bin"
                    className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                  <Button
                    onClick={() => void handleScanSubmit()}
                    loading={isPicking}
                    disabled={isFullyPicked}
                    leftIcon={<Package className="h-4 w-4" />}
                  >
                    Pick by Scan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dispatch")}
                    disabled={!isFullyPicked}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Move to Dispatch
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[0.72fr_0.28fr]">
                <div
                  className={`rounded-xl border p-3 ${
                    scanTone === "success"
                      ? "border-green-500/20 bg-green-500/10"
                      : scanTone === "error"
                        ? "border-red-500/20 bg-red-500/10"
                        : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Last Scan Status</p>
                  <p className="mt-2 text-sm font-semibold text-white">{lastScanMessage}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {lastScanCode
                      ? `SKU: ${lastScanCode}${lastLocationCode ? ` · Location: ${lastLocationCode}` : ""}`
                      : "Waiting for first scan"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-400" />
                    <p className="text-sm font-semibold text-white">Pick Rule</p>
                  </div>
                  <p className="text-sm text-neutral-400">
                    Scan correct SKU first, then scan allotted location or mapped bin. Each valid pair picks one unit and reduces that location balance immediately.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <OperationsEmptyState
              icon={Package}
              title="No order selected"
              description="Choose a live outward order from the left to start scan picking."
            />
          )}
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

export default Packing;
