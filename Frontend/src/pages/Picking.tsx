import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { NumberInput, Select, Stack, Group, Text, Textarea, TextInput } from "@mantine/core";
import {
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  MapPin,
  Package,
  ScanLine,
  Plus,
} from "lucide-react";
import { useMediaQuery } from "@mantine/hooks";

import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import { Modal } from "../components/atoms/Modal";
import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  OutwardOrder,
  Product,
  outwardOrdersApi,
  productAllottedLocationsApi,
  ProductAllottedLocationRecord,
  productsApi,
} from "../services/masterApi";
import { toast } from "../lib/toast";

type ScanTone = "idle" | "success" | "error";

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

export const Picking = memo(function Picking() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<ProductAllottedLocationRecord[]>(
    [],
  );
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
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
  const [isDirectPicking, setIsDirectPicking] = useState(false);
  const [isDirectPickModalOpen, setIsDirectPickModalOpen] = useState(false);
  const [directProductSearch, setDirectProductSearch] = useState("");
  const [directProductId, setDirectProductId] = useState<number | null>(null);
  const [directSkuCode, setDirectSkuCode] = useState("");
  const [directLocationCode, setDirectLocationCode] = useState("");
  const [directQuantity, setDirectQuantity] = useState(1);
  const [directRemark, setDirectRemark] = useState("");
  const [directCustomerName, setDirectCustomerName] = useState("");
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

  const loadProducts = useCallback(async () => {
    try {
      const data = await productsApi.search(directProductSearch);
      setProducts(data);
    } catch {
      toast.error("Failed to load product lookup");
    }
  }, [directProductSearch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.id),
        label: `${product.sku || "NO-SKU"} - ${product.name}`,
      })),
    [products],
  );

  const openOrders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        (order.status === "Open" ||
          order.status === "Picking" ||
          order.status === "Packed") &&
        (order.orderNumber.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.skuCode.toLowerCase().includes(query) ||
          order.productName.toLowerCase().includes(query) ||
          (order.alias && order.alias.toLowerCase().includes(query))),
    );
  }, [orders, searchQuery]);

  const openOrderGroups = useMemo<PickingOrderGroup[]>(() => {
    const map = new Map<number, PickingOrderGroup>();

    openOrders.forEach((order) => {
      const existing = map.get(order.salesOrderId);
      if (existing) {
        existing.items.push(order);
        existing.totalQuantity += order.quantity;
        existing.totalPickedQuantity += order.pickedQuantity;
        existing.pendingQuantity += order.pendingQuantity;
        existing.status =
          existing.items.every((item) => item.pendingQuantity === 0 || item.status === "Packed")
            ? "Packed"
            : existing.items.some((item) => item.pickedQuantity > 0 || item.status === "Picking")
              ? "Picking"
              : "Open";
        return;
      }

      map.set(order.salesOrderId, {
        salesOrderId: order.salesOrderId,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        customerName: order.customerName,
        status: order.pendingQuantity === 0 || order.status === "Packed" ? "Packed" : order.status,
        items: [order],
        totalQuantity: order.quantity,
        totalPickedQuantity: order.pickedQuantity,
        pendingQuantity: order.pendingQuantity,
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateDiff = new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
      return dateDiff || b.orderNumber.localeCompare(a.orderNumber);
    });
  }, [openOrders]);

  useEffect(() => {
    if (!isMobile && !selectedSalesOrderId && openOrderGroups.length > 0) {
      setSelectedSalesOrderId(openOrderGroups[0].salesOrderId);
    }

    if (
      selectedSalesOrderId &&
      !openOrderGroups.some((row) => row.salesOrderId === selectedSalesOrderId)
    ) {
      setSelectedSalesOrderId(!isMobile ? (openOrderGroups[0]?.salesOrderId ?? null) : null);
    }
  }, [openOrderGroups, selectedSalesOrderId, isMobile]);

  const activeGroup =
    openOrderGroups.find((row) => row.salesOrderId === selectedSalesOrderId) ?? null;

  useEffect(() => {
    if (!activeGroup) {
      setActiveItemId(null);
      return;
    }

    const preferredItemId =
      activeGroup.items.find((item) => item.pendingQuantity > 0)?.id ??
      activeGroup.items[0]?.id ??
      null;

    setActiveItemId((current) => {
      const currentItem = activeGroup.items.find((item) => item.id === current);
      if (!currentItem) return preferredItemId;
      if (currentItem.pendingQuantity === 0 && preferredItemId && preferredItemId !== current) {
        return preferredItemId;
      }
      return current;
    });
  }, [activeGroup]);

  const activeItem =
    activeGroup?.items.find((row) => row.id === activeItemId) ??
    activeGroup?.items[0] ??
    null;

  const getLocationSummary = useCallback(
    (productId: number) => {
      const locationRow =
        locations.find((row) => row.productId === productId) ?? null;
      if (!locationRow) return "Not mapped";
      const entries = Object.entries(locationRow.locationJson || {});
      if (entries.length === 0) return "Not mapped";
      return entries
        .map(([code, quantity]) => `${code} (${quantity})`)
        .join(", ");
    },
    [locations],
  );

  const locationSummary = activeItem
    ? getLocationSummary(activeItem.productId)
    : "Not mapped";

  const readyOrders = openOrderGroups.filter(
    (row) => row.status === "Packed",
  ).length;
  const pickedOrders = openOrderGroups.filter(
    (row) => row.pendingQuantity === 0,
  ).length;
  const progress =
    openOrderGroups.length > 0
      ? Math.round((pickedOrders / openOrderGroups.length) * 100)
      : 0;
  const isFullyPicked = activeGroup ? activeGroup.pendingQuantity === 0 : false;

  useEffect(() => {
    if (!activeGroup) return;
    setLastScanMessage("Scan location first.");
    setScanTone("idle");
    setScanCode("");
    setLocationScanCode("");
    setIsLocationLocked(false);
    window.setTimeout(() => locationInputRef.current?.focus(), 0);
  }, [activeGroup?.salesOrderId]);

  const handlePick = useCallback(
    async (orderItem: OutwardOrder, scannedSku: string) => {
      const normalizedLocation = locationScanCode.trim();

      try {
        setIsPicking(true);
        const updated = await outwardOrdersApi.pick(orderItem.id, {
          quantity: 1,
          skuCode: scannedSku,
          locationCode: normalizedLocation,
        });
        setOrders((current) =>
          current.map((row) => (row.id === updated.id ? updated : row)),
        );
        setSelectedSalesOrderId(updated.salesOrderId);
        setActiveItemId(updated.id);
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
    if (!activeGroup) {
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

    const scanVal = normalizedScan.toLowerCase();
    const matchedItem =
      activeGroup.items.find(
        (item) =>
          item.pendingQuantity > 0 &&
          (item.skuCode.toLowerCase() === scanVal ||
            item.alias?.toLowerCase() === scanVal),
      ) ?? null;

    if (!matchedItem) {
      setScanTone("error");
      setLastScanMessage(
        `SKU/Alias mismatch. Expected one of: ${activeGroup.items
          .map((item) => `${item.skuCode}${item.alias ? ` / ${item.alias}` : ""}`)
          .join(", ")}`,
      );
      toast.error("SKU/Alias mismatch");
      setScanCode("");
      window.setTimeout(() => scanInputRef.current?.focus(), 0);
      return;
    }

    setActiveItemId(matchedItem.id);
    await handlePick(matchedItem, normalizedScan);
  };

  const handleDirectPickSubmit = async () => {
    if (!directProductId) {
      toast.error("Select product first");
      return;
    }

    if (!directLocationCode.trim()) {
      toast.error("Scan or enter location");
      return;
    }

    if (directQuantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    if (!directRemark.trim()) {
      toast.error("Remark is required for direct outward");
      return;
    }

    try {
      setIsDirectPicking(true);
      const created = await outwardOrdersApi.directPick({
        productId: directProductId,
        quantity: directQuantity,
        skuCode: directSkuCode.trim() || undefined,
        locationCode: directLocationCode.trim(),
        remark: directRemark.trim(),
        customerName: directCustomerName.trim() || null,
      });
      setOrders((current) => [created, ...current]);
      setSelectedSalesOrderId(created.salesOrderId);
      setActiveItemId(created.id);
      setDirectProductId(null);
      setDirectSkuCode("");
      setDirectLocationCode("");
      setDirectQuantity(1);
      setDirectRemark("");
      setDirectCustomerName("");
      setIsDirectPickModalOpen(false);
      toast.success(`${created.orderNumber} direct picked and ready for packing`);
    } catch (error: any) {
      toast.error(error.message || "Direct pick failed");
    } finally {
      setIsDirectPicking(false);
    }
  };

  return (
    <OperationsPage
      title="Picking"
      description="Pick sales orders, or direct-pick stock with a remark when no sales order exists."
      icon={Package}
      hideHeader
    >
      <Modal
        isOpen={isDirectPickModalOpen}
        onClose={() => setIsDirectPickModalOpen(false)}
        title="Direct Outward Pick"
        size="xl"
      >
        <Stack gap="md">
          <Text size="xs" c="dimmed">
            Use this when there is no sales order. Pick stock with a mandatory remark, then continue packing.
          </Text>
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Product"
              placeholder="Search SKU or product"
              searchable
              data={productOptions}
              searchValue={directProductSearch}
              onSearchChange={setDirectProductSearch}
              value={directProductId ? String(directProductId) : null}
              onChange={(value) => {
                const productId = value ? Number(value) : null;
                const selected = products.find((product) => product.id === productId);
                setDirectProductId(productId);
                setDirectSkuCode(selected?.sku || "");
              }}
            />
            <TextInput
              label="SKU Scan"
              placeholder="Optional SKU scan"
              value={directSkuCode}
              onChange={(event) => setDirectSkuCode(event.currentTarget.value)}
            />
            <TextInput
              label="Location / Bin"
              placeholder="Scan location"
              value={directLocationCode}
              onChange={(event) => setDirectLocationCode(event.currentTarget.value)}
            />
            <NumberInput
              label="Quantity"
              min={1}
              value={directQuantity}
              onChange={(value) => setDirectQuantity(Number(value) || 1)}
            />
            <TextInput
              label="Party / Customer"
              placeholder="Optional"
              value={directCustomerName}
              onChange={(event) => setDirectCustomerName(event.currentTarget.value)}
              className="md:col-span-2"
            />
            <Textarea
              label="Remark"
              placeholder="Required reason for direct outward"
              autosize
              minRows={2}
              value={directRemark}
              onChange={(event) => setDirectRemark(event.currentTarget.value)}
              className="md:col-span-2"
            />
          </div>
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setIsDirectPickModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleDirectPickSubmit()}
              loading={isDirectPicking}
              leftIcon={<Package className="h-3.5 w-3.5" />}
            >
              Direct Pick
            </Button>
          </Group>
        </Stack>
      </Modal>

      <div className={isMobile ? "space-y-4" : "grid gap-4 xl:grid-cols-[0.82fr_1.18fr]"}>
        {(!isMobile || !activeGroup) && (
          <OperationsPanel
            title="Orders"
            icon={ClipboardList}
            description="Select order to pick."
            hideHeader={isMobile}
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  onClick={() => setIsDirectPickModalOpen(true)}
                  leftIcon={<Plus className="h-3 w-3" />}
                  className="h-7 text-[10px] px-3 font-bold uppercase tracking-wider"
                >
                  Direct Pick
                </Button>
                <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-neutral-300">
                  {openOrderGroups.length} Active
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
            {isMobile && (
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex-1 text-center rounded-md bg-white/[0.05] px-2.5 py-1.5 text-xs font-semibold text-neutral-300">
                    {openOrderGroups.length} Active
                  </span>
                  <span className="flex-1 text-center rounded-md bg-white/[0.05] px-2.5 py-1.5 text-xs font-semibold text-neutral-300">
                    {readyOrders} Ready
                  </span>
                  <span className="flex-1 text-center rounded-md bg-white/[0.05] px-2.5 py-1.5 text-xs font-semibold text-neutral-300">
                    {progress}% Done
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsDirectPickModalOpen(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                  fullWidth
                >
                  Direct Outward Pick
                </Button>
              </div>
            )}

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order, customer, SKU..."
              className="mb-3 h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />

            {openOrderGroups.length > 0 ? (
              <div className="max-h-[580px] space-y-2 overflow-y-auto scrollbar-thin">
                {openOrderGroups.map((order) => {
                  const done = order.pendingQuantity === 0;
                  const active = order.salesOrderId === selectedSalesOrderId;

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
                          {done ? "Ready" : order.status}
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
                            Picked
                          </p>
                          <p className="mt-1 font-bold text-white">
                            {order.totalPickedQuantity} / {order.totalQuantity}
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
        )}

        {(!isMobile || activeGroup) && (
          <OperationsPanel
            title="Scan to Pick"
            icon={ScanLine}
            description="Select one sales order, review all items and locations, then scan location and SKU."
            hideHeader={isMobile}
          >
            {activeGroup && activeItem ? (
              <div className="space-y-3">
                {isMobile && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setSelectedSalesOrderId(null)}
                    leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                    className="mb-3 w-full"
                  >
                    Back to Orders
                  </Button>
                )}

                {/* Compact Order Header */}
                <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {activeGroup.orderNumber}
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        {activeGroup.customerName}
                      </p>
                    </div>
                    <Badge
                      variant={isFullyPicked ? "success" : "warning"}
                      shape="pill"
                      className="border-none"
                    >
                      {isFullyPicked ? "Packed" : activeGroup.status}
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
                        {activeItem.productName}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                      SKU
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-brand-300">
                        {activeItem.skuCode}
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
                        {activeGroup.totalPickedQuantity} / {activeGroup.totalQuantity}
                      </p>
                    </div>
                  </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="h-3.5 w-3.5 text-brand-400" />
                    <p className="text-xs font-semibold text-white">Order Items</p>
                  </div>
                  <div className="space-y-2">
                    {activeGroup.items.map((item) => {
                      const isActiveItem = item.id === activeItem.id;
                      const itemDone = item.pendingQuantity === 0;
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
                              variant={itemDone ? "success" : "warning"}
                              shape="pill"
                              className="border-none"
                            >
                              {itemDone ? "Done" : `${item.pickedQuantity}/${item.quantity}`}
                            </Badge>
                          </div>
                          <p className="mt-1.5 text-[11px] text-neutral-400">
                            Location: {getLocationSummary(item.productId)}
                          </p>
                        </button>
                      );
                    })}
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
                            ? `Scan ${activeItem.skuCode}${activeItem.alias ? ` or ${activeItem.alias}` : ""}`
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
                        onClick={() => navigate("/packing")}
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                        className="h-9 w-full"
                      >
                        Move to Packing
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
                description="Select one sales order from the left to start picking its items."
              />
            )}
          </OperationsPanel>
        )}
      </div>
    </OperationsPage>
  );
});

export default Picking;
