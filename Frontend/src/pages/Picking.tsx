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

export const Picking = memo(function Picking() {
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [locations, setLocations] = useState<ProductAllottedLocationRecord[]>(
    [],
  );
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [locationScanCode, setLocationScanCode] = useState("");
  const [lastScanCode, setLastScanCode] = useState("");
  const [lastLocationCode, setLastLocationCode] = useState("");
  const [lastScanMessage, setLastScanMessage] = useState(
    "Scan location first.",
  );
  const [scanTone, setScanTone] = useState<ScanTone>("idle");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
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
      toast.error("Failed to load picking data");
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
        (order.status === "Open" ||
          order.status === "Picking" ||
          order.status === "Packed") &&
        (order.orderNumber.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.skuCode.toLowerCase().includes(query)),
    );
  }, [orders, searchQuery]);

  useEffect(() => {
    if (!selectedOrderId && openOrders.length > 0) {
      setSelectedOrderId(openOrders[0].id);
    }

    if (
      selectedOrderId &&
      !openOrders.some((row) => row.id === selectedOrderId)
    ) {
      setSelectedOrderId(openOrders[0]?.id ?? null);
    }
  }, [openOrders, selectedOrderId]);

  const activeOrder =
    openOrders.find((row) => row.id === selectedOrderId) ?? null;
  const locationRow = activeOrder
    ? (locations.find((row) => row.productId === activeOrder.productId) ?? null)
    : null;

  const locationSummary = useMemo(() => {
    if (!locationRow) return "Not mapped";
    const entries = Object.entries(locationRow.locationJson || {});
    if (entries.length === 0) return "Not mapped";
    return entries
      .slice(0, 2)
      .map(([code]) => code)
      .join(", ");
  }, [locationRow]);

  const readyOrders = openOrders.filter(
    (row) => row.status === "Packed",
  ).length;
  const pickedOrders = openOrders.filter(
    (row) => row.pendingQuantity === 0,
  ).length;
  const progress =
    openOrders.length > 0
      ? Math.round((pickedOrders / openOrders.length) * 100)
      : 0;
  const isFullyPicked = activeOrder ? activeOrder.pendingQuantity === 0 : false;

  useEffect(() => {
    if (!activeOrder) return;
    setLastScanMessage("Scan location first.");
    setScanTone("idle");
    setScanCode("");
    setLocationScanCode("");
    setIsLocationLocked(false);
    window.setTimeout(() => locationInputRef.current?.focus(), 0);
  }, [activeOrder?.id]);

  const handlePick = useCallback(
    async (order: OutwardOrder, scannedSku: string) => {
      const normalizedLocation = locationScanCode.trim();

      try {
        setIsPicking(true);
        const updated = await outwardOrdersApi.pick(order.id, {
          quantity: 1,
          skuCode: scannedSku,
          locationCode: normalizedLocation,
        });
        setOrders((current) =>
          current.map((row) => (row.id === updated.id ? updated : row)),
        );
        setSelectedOrderId(updated.id);
        setLastScanCode(scannedSku);
        setLastLocationCode(normalizedLocation);
        setScanTone("success");
        const remaining = updated.pendingQuantity;
        setLastScanMessage(
          remaining === 0
            ? `${updated.orderNumber} packed.`
            : `${remaining} left to pick.`,
        );
        toast.success(
          remaining === 0
            ? `${updated.orderNumber} packed`
            : `Picked 1 for ${updated.orderNumber}`,
        );
        if (remaining > 0) {
          setScanCode("");
          window.setTimeout(() => scanInputRef.current?.focus(), 0);
        }
      } catch (error: any) {
        setScanTone("error");
        setLastScanCode(scannedSku);
        setLastScanMessage(error.message || "Pick failed.");
        toast.error(error.message || "Pick failed");
      } finally {
        setIsPicking(false);
      }
    },
    [locationScanCode],
  );

  const handleLocationSubmit = () => {
    const normalizedLocation = locationScanCode.trim();
    if (!normalizedLocation) {
      toast.error("Scan location code");
      return;
    }
    setLastLocationCode(normalizedLocation);
    setIsLocationLocked(true);
    setLastScanMessage("Location set. Now scan SKU.");
    setScanCode("");
    window.setTimeout(() => scanInputRef.current?.focus(), 0);
  };

  const handleChangeLocation = () => {
    setIsLocationLocked(false);
    setLocationScanCode("");
    setLastScanMessage("Scan new location.");
    window.setTimeout(() => locationInputRef.current?.focus(), 0);
  };

  const handleScanSubmit = async () => {
    if (!activeOrder) {
      toast.error("Select order first");
      return;
    }

    if (!isLocationLocked) {
      toast.error("Scan location first");
      window.setTimeout(() => locationInputRef.current?.focus(), 0);
      return;
    }

    // Split scanned data by '#' and use the first part (index 0)
    const normalizedScan = scanCode.trim().split("#")[0].trim();
    if (!normalizedScan) {
      toast.error("Scan SKU code");
      return;
    }

    setLastScanCode(normalizedScan);

    if (isFullyPicked) {
      setScanTone("error");
      setLastScanMessage("Order fully picked.");
      setScanCode("");
      return;
    }

    if (normalizedScan.toLowerCase() !== activeOrder.skuCode.toLowerCase()) {
      setScanTone("error");
      setLastScanMessage(`SKU mismatch. Expected: ${activeOrder.skuCode}`);
      toast.error("SKU mismatch");
      setScanCode("");
      window.setTimeout(() => scanInputRef.current?.focus(), 0);
      return;
    }

    await handlePick(activeOrder, normalizedScan);
  };

  return (
    <OperationsPage
      title="Picking"
      description="Pick orders by scanning SKU and location."
      icon={Package}
      hideHeader
    >
      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <OperationsPanel
          title="Orders"
          icon={ClipboardList}
          description="Select order to pick."
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
            placeholder="Search order, customer, SKU..."
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
                        {done ? "Ready" : order.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">
                          SKU
                        </p>
                        <p className="mt-1 font-mono text-brand-300">
                          {order.skuCode}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.18em] text-neutral-500">
                          Picked
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {order.pickedQuantity} / {order.quantity}
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
              description="No open orders waiting for picking."
            />
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Scan to Pick"
          icon={ScanLine}
          description="Scan SKU then location."
        >
          {activeOrder ? (
            <div className="space-y-3">
              {/* Compact Order Header */}
              <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {activeOrder.orderNumber}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      {activeOrder.customerName}
                    </p>
                  </div>
                  <Badge
                    variant={isFullyPicked ? "success" : "warning"}
                    shape="pill"
                    className="border-none"
                  >
                    {isFullyPicked ? "Packed" : activeOrder.status}
                  </Badge>
                </div>
              </div>

              {/* Compact Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Product
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-white line-clamp-1">
                    {activeOrder.productName}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    SKU
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-brand-300">
                    {activeOrder.skuCode}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Location
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-white">
                    {locationSummary}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Progress
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-white">
                    {activeOrder.pickedQuantity} / {activeOrder.quantity}
                  </p>
                </div>
              </div>

              {/* Scan Section */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ScanLine className="h-3.5 w-3.5 text-brand-400" />
                  <p className="text-xs font-semibold text-white">Scan</p>
                </div>
                <div className="space-y-2">
                  {/* Location Input */}
                  <div className="flex gap-2">
                    <input
                      ref={locationInputRef}
                      value={locationScanCode}
                      onChange={(e) => setLocationScanCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isLocationLocked) {
                          e.preventDefault();
                          handleLocationSubmit();
                        }
                      }}
                      placeholder="Scan location first"
                      disabled={isLocationLocked}
                      className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                    />
                    {isLocationLocked ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={handleChangeLocation}
                        className="h-9"
                      >
                        Change
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        onClick={handleLocationSubmit}
                        className="h-9"
                      >
                        Set
                      </Button>
                    )}
                  </div>

                  {/* SKU Input */}
                  <div className="flex gap-2">
                    <input
                      ref={scanInputRef}
                      value={scanCode}
                      onChange={(e) => setScanCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleScanSubmit();
                        }
                      }}
                      placeholder={
                        isLocationLocked
                          ? `Scan ${activeOrder.skuCode}`
                          : "Set location first"
                      }
                      disabled={!isLocationLocked || isFullyPicked}
                      className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                    />
                    <Button
                      onClick={() => void handleScanSubmit()}
                      loading={isPicking}
                      disabled={!isLocationLocked || isFullyPicked}
                      size="xs"
                      leftIcon={<Package className="h-3.5 w-3.5" />}
                      className="h-9"
                    >
                      Pick
                    </Button>
                  </div>

                  {/* Dispatch Button */}
                  {isFullyPicked && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => navigate("/dispatch")}
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      className="h-9 w-full"
                    >
                      Move to Dispatch
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Message */}
              <div
                className={`rounded-xl border p-3 ${
                  scanTone === "success"
                    ? "border-green-500/20 bg-green-500/10"
                    : scanTone === "error"
                      ? "border-red-500/20 bg-red-500/10"
                      : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Status
                </p>
                <p className="mt-1 text-xs font-semibold text-white">
                  {lastScanMessage}
                </p>
                {lastScanCode && (
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    SKU: {lastScanCode}
                    {lastLocationCode ? ` · Loc: ${lastLocationCode}` : ""}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <OperationsEmptyState
              icon={Package}
              title="No order"
              description="Select order from left to start."
            />
          )}
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

export default Picking;
