import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Text, TextInput, Select, SegmentedControl, ActionIcon, Table, ScrollArea } from "@mantine/core";
import {
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  ClipboardList,
  Package,
  ScanLine,
  Plus,
  X,
} from "lucide-react";
import { useMediaQuery } from "@mantine/hooks";

import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  OutwardOrder,
  Product,
  ProductLookupResult,
  outwardOrdersApi,
  productAllottedLocationsApi,
  ProductAllottedLocationRecord,
  productsApi,
  Party,
  partiesApi,
} from "../services/masterApi";
import { toast } from "../lib/toast";
import ConsolidatedPick from "./ConsolidatedPick";

export type DirectPickCartItem = {
  id: string;
  product: Product;
  skuCode: string;
  locationCode: string;
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

const parseStickerScan = (value: string): StickerScan => {
  const raw = value.trim();
  const parts = raw.split("#").map((part) => part.trim());
  
  // Format is: <SKUCODE>#<QNTY>#<DATEOFIMPORT>#<INVOICENUMBER/PRICE>
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

const formatMrp = (value?: number | null) =>
  typeof value === "number" ? `Rs ${value.toFixed(2)}` : "-";

const isCanceledOrder = (order: OutwardOrder) =>
  order.status === "Canceled" || order.salesOrderStatus === "Canceled";

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
  const [lastScanMessage, setLastScanMessage] = useState("Scan location first.");
  const [scanTone, setScanTone] = useState<ScanTone>("idle");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPicking, setIsPicking] = useState(false);

  // --- DIRECT PICK STATES ---
  const [pickingMode, setPickingMode] = useState<"sales_orders" | "direct_pick" | "consolidated">("sales_orders");
  const [parties, setParties] = useState<Party[]>([]);
  const [directPickCustomer, setDirectPickCustomer] = useState<string>("Self");
  const [directPickItems, setDirectPickItems] = useState<DirectPickCartItem[]>([]);
  const [directPickSkuInput, setDirectPickSkuInput] = useState("");
  const [isDirectPicking, setIsDirectPicking] = useState(false);
  const [isDirectProductLoading, setIsDirectProductLoading] = useState(false);

  const navigate = useNavigate();
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const directSkuInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (pickingMode === "direct_pick") {
      window.setTimeout(() => directSkuInputRef.current?.focus(), 50);
    }
  }, [pickingMode]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersData, locationsData, partiesData] = await Promise.all([
        outwardOrdersApi.getAll(),
        productAllottedLocationsApi.getAll(),
        partiesApi.getPaged({ page: 1, pageSize: 1000 }),
      ]);
      setOrders(ordersData);
      setLocations(locationsData);
      setParties(partiesData.data);
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
        !isCanceledOrder(order) &&
        order.pendingQuantity > 0 &&
        (order.status === "Open" ||
          order.status === "Picking") &&
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
          existing.items.every((item) => item.pendingQuantity === 0 || item.status === "Picked")
            ? "Picked"
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
        status: order.pendingQuantity === 0 || order.status === "Picked" ? "Picked" : order.status,
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

  const readyOrders = useMemo(
    () =>
      new Set(
        orders
          .filter(
            (order) =>
              !isCanceledOrder(order) &&
              order.status === "Picked" &&
              order.pendingQuantity === 0,
          )
          .map((order) => order.salesOrderId),
      ).size,
    [orders],
  );
  const activeOrderCount = openOrderGroups.length;
  const progress =
    activeOrderCount + readyOrders > 0
      ? Math.round((readyOrders / (activeOrderCount + readyOrders)) * 100)
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
    async (orderItem: OutwardOrder, scan: StickerScan) => {
      const normalizedLocation = locationScanCode.trim();

      try {
        setIsPicking(true);
        const updated = await outwardOrdersApi.pick(orderItem.id, {
          quantity: scan.quantity,
          skuCode: orderItem.skuCode,
          locationCode: normalizedLocation,
          mrp: scan.mrp,
          importDate: scan.importDate,
        });
        setOrders((current) =>
          current.map((row) => (row.id === updated.id ? updated : row)),
        );
        setSelectedSalesOrderId(updated.salesOrderId);
        setActiveItemId(updated.id);
        setLastScanCode(scan.raw);
        setLastLocationCode(normalizedLocation);
        setScanTone("success");
        const remaining = updated.pendingQuantity;
        setLastScanMessage(
          remaining === 0
            ? `${updated.orderNumber} picked and ready for packing.`
            : `${remaining} left to pick.`,
        );
        toast.success(
          remaining === 0
            ? `${updated.orderNumber} ready for packing`
            : `Picked ${scan.quantity} for ${updated.orderNumber}`,
        );
        if (remaining > 0) {
          setScanCode("");
          window.setTimeout(() => scanInputRef.current?.focus(), 0);
        }
      } catch (error: any) {
        setScanTone("error");
        setLastScanCode(scan.raw);
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
    setLastScanMessage("Location set. Now scan SKU or Alias.");
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

    const parsedScan = parseStickerScan(scanCode);
    if (!parsedScan.sku) {
      toast.error("Scan SKU or Alias");
      return;
    }

    setLastScanCode(parsedScan.raw);

    if (isFullyPicked) {
      setScanTone("error");
      setLastScanMessage("Order fully picked.");
      setScanCode("");
      return;
    }

    const scanVal = normalizeProductScan(parsedScan.sku);
    const matchedItem =
      activeGroup.items.find(
        (item) =>
          item.pendingQuantity > 0 &&
          (normalizeProductScan(item.skuCode) === scanVal ||
            normalizeProductScan(item.alias) === scanVal ||
            normalizeProductScan(item.cartonQr) === scanVal),
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

    const cartonQuantity = getCartonQuantity(
      parsedScan.raw,
      matchedItem.cartonQr,
      matchedItem.cartonPerItem,
    );
    const effectiveScan = {
      ...parsedScan,
      sku: matchedItem.skuCode,
      quantity: Math.min(
        cartonQuantity > 0 ? cartonQuantity : 1,
        matchedItem.pendingQuantity,
      ),
    };

    if (
      effectiveScan.hasFullData &&
      effectiveScan.mrp !== null &&
      matchedItem.mrp !== null &&
      matchedItem.mrp !== undefined &&
      Number(effectiveScan.mrp.toFixed(2)) !== Number(Number(matchedItem.mrp).toFixed(2))
    ) {
      const message = `Price Mismatch Alert!\n\nSticker Price: Rs ${effectiveScan.mrp}\nSales Order Item Price: Rs ${matchedItem.mrp}\n\nDo you want to proceed with picking?`;
      
      if (!window.confirm(message)) {
        setScanCode("");
        window.setTimeout(() => scanInputRef.current?.focus(), 0);
        return;
      }
    }

    setActiveItemId(matchedItem.id);
    await handlePick(matchedItem, effectiveScan);
  };

  const handleDirectPickScan = useCallback(async () => {
    const parsedScan = parseStickerScan(directPickSkuInput);
    if (!parsedScan.sku) {
      toast.error("Scan SKU or Alias");
      return;
    }

    setIsDirectProductLoading(true);
    try {
      const result = await productsApi.lookup(parsedScan.sku);
      const cartonQuantity = getCartonQuantity(
        parsedScan.raw,
        result.product.cartonQr,
        result.product.cartonPerItem,
      );
      const pickQuantity = cartonQuantity > 0 ? cartonQuantity : 1;

      const firstLocation = result.locations.find((entry) => entry.quantity > 0);
      const locCode = firstLocation?.locationCode || "";
      if (!locCode) {
        toast.error("No allotted location stock found for this product");
      }

      setDirectPickItems((current) => {
        const existingIndex = current.findIndex(
          (item) =>
            item.product.sku?.toLowerCase() === result.product.sku?.toLowerCase() ||
            (item.product.alias && item.product.alias.toLowerCase() === result.product.alias?.toLowerCase())
        );

        if (existingIndex >= 0) {
          // Immutable update — avoids the double-increment bug from direct mutation
          return current.map((item, idx) =>
            idx === existingIndex ? { ...item, quantity: item.quantity + pickQuantity } : item
          );
        }

        return [
          {
            id: Math.random().toString(36).substring(7),
            product: result.product,
            skuCode: result.product.sku || result.product.alias || parsedScan.sku,
            locationCode: locCode,
            quantity: pickQuantity,
            mrp: parsedScan.mrp,
            importDate: parsedScan.importDate,
            lookupResult: result,
          },
          ...current,
        ];
      });

      setDirectPickSkuInput("");
    } catch (error: any) {
      toast.error(error.message || "Product not found for SKU/Alias");
    } finally {
      setIsDirectProductLoading(false);
      window.setTimeout(() => directSkuInputRef.current?.focus(), 50);
    }
  }, [directPickSkuInput]);

  const handleBulkDirectPickSubmit = async () => {
    if (directPickItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const customer = directPickCustomer === "Self" ? null : directPickCustomer;

    setIsDirectPicking(true);

    try {
      for (const item of directPickItems) {
        if (!item.locationCode) {
          throw new Error(`Location missing for ${item.product.name}`);
        }
      }

      const createdOrders = await outwardOrdersApi.bulkDirectPick({
        remark: "Direct Pick",
        customerName: customer,
        items: directPickItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          skuCode: item.skuCode,
          locationCode: item.locationCode,
          mrp: item.mrp,
          importDate: item.importDate,
        })),
      });

      setOrders((current) => [...createdOrders, ...current]);

      toast.success(`${createdOrders.length} item(s) direct picked successfully`);
      setDirectPickItems([]);
      setDirectPickCustomer("Self");
    } catch (error: any) {
      toast.error(error.message || "Direct pick failed. Check items and try again.");
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
      <div className="mb-4">
        <SegmentedControl
          value={pickingMode}
          onChange={(value) => setPickingMode(value as "sales_orders" | "direct_pick" | "consolidated")}
          data={[
            { label: "Sales Orders", value: "sales_orders" },
            { label: "Consolidated", value: "consolidated" },
            { label: "Direct Pick", value: "direct_pick" },
          ]}
          fullWidth
          size="sm"
        />
      </div>

      {pickingMode === "consolidated" ? (
        <ConsolidatedPick />
      ) : pickingMode === "direct_pick" ? (
        <OperationsPanel
          title="Direct Pick"
          icon={Package}
          description="Scan to instantly pick and dispatch stock without a sales order."
        >
          <div className="mb-4">
            <Select
              label="Party / Customer"
              placeholder="Select Party or Self"
              data={[
                { value: "Self", label: "Self" },
                ...parties.map((p) => ({ value: p.name, label: p.name }))
              ]}
              value={directPickCustomer}
              onChange={(val) => setDirectPickCustomer(val || "Self")}
              searchable
              clearable={false}
            />
          </div>

          <div className="mb-4">
            <TextInput
              ref={directSkuInputRef}
              label="Scan SKU or Alias"
              placeholder="Scan item here..."
              value={directPickSkuInput}
              onChange={(e) => setDirectPickSkuInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleDirectPickScan();
                }
              }}
              size="lg"
              autoFocus
              rightSection={
                <div className="flex items-center gap-1 pr-1">
                  {directPickSkuInput && (
                    <ActionIcon
                      onClick={() => {
                        setDirectPickSkuInput("");
                        directSkuInputRef.current?.focus();
                      }}
                      variant="transparent"
                      color="gray"
                      size="sm"
                    >
                      <X size={14} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    onClick={() => void handleDirectPickScan()}
                    loading={isDirectProductLoading}
                    variant="filled"
                    color="brand"
                  >
                    <ScanLine size={16} />
                  </ActionIcon>
                </div>
              }
              rightSectionWidth={directPickSkuInput ? 70 : 40}
            />
          </div>

          {directPickItems.length > 0 && (
            <div className="mt-6 border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
              <div className="bg-white/[0.05] p-3 border-b border-white/10">
                <Text size="sm" weight={600}>Scanned Items ({directPickItems.length})</Text>
              </div>
              <ScrollArea className="max-h-[400px]">
                <Table striped highlightOnHover verticalSpacing="sm" className="text-sm">
                  <thead>
                    <tr>
                      <th>SKU/Alias</th>
                      <th>Location</th>
                      <th>Qty</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {directPickItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Badge variant="outline">{item.skuCode}</Badge>
                        </td>
                        <td>
                          <Badge color="blue">{item.locationCode}</Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="gray"
                              onClick={() =>
                                setDirectPickItems((current) =>
                                  current.map((i) =>
                                    i.id === item.id
                                      ? { ...i, quantity: Math.max(1, i.quantity - 1) }
                                      : i
                                  )
                                )
                              }
                            >
                              <span style={{ fontSize: 14, lineHeight: 1 }}>−</span>
                            </ActionIcon>
                            <span className="min-w-[24px] text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="gray"
                              onClick={() =>
                                setDirectPickItems((current) =>
                                  current.map((i) =>
                                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                                  )
                                )
                              }
                            >
                              <Plus size={12} />
                            </ActionIcon>
                          </div>
                        </td>
                        <td>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            size="sm"
                            onClick={() =>
                              setDirectPickItems((current) =>
                                current.filter((i) => i.id !== item.id)
                              )
                            }
                          >
                            <X size={14} />
                          </ActionIcon>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>

              <div className="p-4 bg-white/[0.03] border-t border-white/10 flex justify-end gap-3">
                <Button
                  variant="outline"
                  color="red"
                  onClick={() => setDirectPickItems([])}
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => void handleBulkDirectPickSubmit()}
                  loading={isDirectPicking}
                  leftIcon={<ArrowRight size={16} />}
                >
                  Submit {directPickItems.length} Pick(s)
                </Button>
              </div>
            </div>
          )}
        </OperationsPanel>
      ) : (

        <div className={isMobile ? "space-y-4" : "grid gap-4 xl:grid-cols-[0.82fr_1.18fr]"}>
          {(!isMobile || !activeGroup) && (
            <OperationsPanel
              title="Orders"
              icon={ClipboardList}
              description="Select order to pick."
              hideHeader={isMobile}
              action={
                <div className="flex items-center gap-2">
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
                </div>
              )}

              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order, customer, SKU or alias..."
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
                        className={`w-full rounded-xl border p-3 text-left transition ${active
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
              description="Select one sales order, review all items and locations, then scan location and SKU or Alias."
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
                        {isFullyPicked ? "Picked" : activeGroup.status}
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
                        SKU / Alias
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-brand-300">
                        {activeItem.skuCode}
                        {activeItem.alias ? ` / ${activeItem.alias}` : ""}
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
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                        Sales MRP
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-white">
                        {formatMrp(activeItem.mrp)}
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
                            className={`w-full rounded-lg border p-2.5 text-left transition ${isActiveItem
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
                              Location: {getLocationSummary(item.productId)} · MRP: {formatMrp(item.mrp)}
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
                        <div className="relative flex-1">
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

                      {/* SKU or Alias Input */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
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
                            className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-2.5 pr-8 text-xs text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                          />
                          {scanCode && isLocationLocked && !isFullyPicked && (
                            <button
                              type="button"
                              onClick={() => {
                                setScanCode("");
                                scanInputRef.current?.focus();
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
                          Open Packing
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Status Message */}
                  <div
                    className={`rounded-xl border p-3 ${scanTone === "success"
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
                      {scanTone === "error" ? (
                        <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-red-300" />
                      ) : null}
                      {lastScanMessage}
                    </p>
                    {lastScanCode && (
                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        Code: {lastScanCode}
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
      )}
    </OperationsPage>
  );
});

export default Picking;
