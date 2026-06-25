import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Text, TextInput, Select, SegmentedControl, ActionIcon, Table, ScrollArea, Modal, Textarea } from "@mantine/core";
import {
  ArrowLeft,
  ArrowRight,
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
  CompactItemRow,
  CompactItems,
  ExceptionNotice,
  OutboundQueue,
  OutboundQueueRow,
  OutboundSplitLayout,
  OutboundStageNav,
  ScannerDock,
  TaskInstruction,
  TaskWorkspace,
} from "../components/organisms/Operations/OutboundTaskUI";
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
  
  // Format: <SKUCODE>#<QNTY>#<DATEOFIMPORT>#<PRICE>
  // Example: 50-32150-41#1#JAN/2026#Rs.4,200.00
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

  const [mrpMismatchScan, setMrpMismatchScan] = useState<{
    matchedItem: OutwardOrder;
    effectiveScan: StickerScan;
  } | null>(null);

  const [isShortCloseModalOpen, setIsShortCloseModalOpen] = useState(false);
  const [shortCloseRemark, setShortCloseRemark] = useState("");
  const [isShortClosing, setIsShortClosing] = useState(false);

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
  const completedItemCount = activeGroup
    ? activeGroup.items.filter((item) => item.pendingQuantity === 0).length
    : 0;
  const activeItemIndex = activeGroup && activeItem
    ? activeGroup.items.findIndex((item) => item.id === activeItem.id)
    : -1;
  const activeOrderProgress = activeGroup && activeGroup.totalQuantity > 0
    ? Math.round((activeGroup.totalPickedQuantity / activeGroup.totalQuantity) * 100)
    : 0;

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
    async (
      orderItem: OutwardOrder,
      scan: StickerScan,
      mrpMismatchConfirmed = false,
    ) => {
      const normalizedLocation = locationScanCode.trim();

      try {
        setIsPicking(true);
        const updated = await outwardOrdersApi.pick(orderItem.id, {
          quantity: scan.quantity,
          skuCode: orderItem.skuCode,
          locationCode: normalizedLocation,
          mrp: scan.mrp,
          importDate: scan.importDate,
          mrpMismatchConfirmed,
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
      setMrpMismatchScan({ matchedItem, effectiveScan });
      return;
    }

    setActiveItemId(matchedItem.id);
    await handlePick(matchedItem, effectiveScan);
  };

  const handleMrpConfirm = async () => {
    if (!mrpMismatchScan) return;
    const { matchedItem, effectiveScan } = mrpMismatchScan;
    setMrpMismatchScan(null);
    setActiveItemId(matchedItem.id);
    await handlePick(matchedItem, effectiveScan, true);
  };

  const handleMrpReject = () => {
    setMrpMismatchScan(null);
    setScanCode("");
    window.setTimeout(() => scanInputRef.current?.focus(), 0);
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

  const handleShortCloseSubmit = async () => {
    if (!activeGroup) return;
    if (!shortCloseRemark.trim()) {
      toast.error("Please enter a reason for not picking all items");
      return;
    }

    try {
      setIsShortClosing(true);
      await outwardOrdersApi.shortCloseSalesOrder(
        activeGroup.salesOrderId,
        shortCloseRemark
      );

      await loadData();
      setIsShortCloseModalOpen(false);
      setShortCloseRemark("");
      toast.success(`${activeGroup.orderNumber} finished and saved successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to finish order");
    } finally {
      setIsShortClosing(false);
    }
  };

  return (
    <OperationsPage
      title="Picking"
      description="Pick sales orders, or direct-pick stock with a remark when no sales order exists."
      icon={Package}
      hideHeader
    >
      <div className="flex h-[calc(100dvh-105px)] lg:h-[calc(100dvh-175px)] flex-col gap-1 lg:gap-2 overflow-hidden">
        <OutboundStageNav active="picking" queueCount={openOrderGroups.length} compactLabel="Active" />
        <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.025] p-0.5 sm:mb-2 sm:p-1">
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
          radius="lg"
          classNames={{
            root: "text-xs",
            label: "min-h-7 px-1.5 sm:min-h-8 sm:px-2",
          }}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
      {pickingMode === "consolidated" ? (
        <ConsolidatedPick />
      ) : pickingMode === "direct_pick" ? (
        <OperationsPanel
          title="Direct Pick"
          icon={Package}
          description="Scan to instantly pick and dispatch stock without a sales order."
          className="h-full min-h-0"
          contentClassName="flex flex-col h-full min-h-0"
        >
          <div className="mb-1.5 flex flex-col gap-2 sm:mb-2 sm:gap-2.5">
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
              size={isMobile ? "sm" : "md"}
              radius="md"
            />

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
              size="sm"
              radius="md"
              autoFocus
              className="[&_input]:text-sm [&_input]:font-mono [&_input]:font-bold"
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
                      <X size={16} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    onClick={() => void handleDirectPickScan()}
                    loading={isDirectProductLoading}
                    variant="filled"
                    color="brand"
                    size="sm"
                    radius="md"
                  >
                    <ScanLine size={20} />
                  </ActionIcon>
                </div>
              }
              rightSectionWidth={directPickSkuInput ? 80 : 50}
            />
          </div>

          {directPickItems.length > 0 && (
            <div className="mt-1.5 flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] sm:mt-2">
              <div className="border-b border-white/10 bg-white/[0.05] p-2 sm:p-2.5 shrink-0">
                <Text size={isMobile ? "sm" : "md"} weight={600}>Scanned Items ({directPickItems.length})</Text>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <Table striped highlightOnHover verticalSpacing={isMobile ? "xs" : "md"} className="text-xs sm:text-sm">
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
                          <Badge variant="outline" size="sm">{item.skuCode}</Badge>
                        </td>
                        <td>
                          <Badge color="blue" size="sm">{item.locationCode}</Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <ActionIcon
                              size={isMobile ? "sm" : "md"}
                              variant="light"
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
                              <span style={{ fontSize: 18, lineHeight: 1 }}>−</span>
                            </ActionIcon>
                            <span className="min-w-[24px] text-center text-xs font-bold sm:min-w-[32px] sm:text-sm">
                              {item.quantity}
                            </span>
                            <ActionIcon
                              size={isMobile ? "sm" : "md"}
                              variant="light"
                              color="brand"
                              onClick={() =>
                                setDirectPickItems((current) =>
                                  current.map((i) =>
                                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                                  )
                                )
                              }
                            >
                              <Plus size={16} />
                            </ActionIcon>
                          </div>
                        </td>
                        <td>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            size={isMobile ? "sm" : "md"}
                            onClick={() =>
                              setDirectPickItems((current) =>
                                current.filter((i) => i.id !== item.id)
                              )
                            }
                          >
                            <X size={18} />
                          </ActionIcon>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>

              <div className="flex flex-row justify-end gap-1.5 border-t border-white/10 bg-white/[0.03] p-2 sm:gap-2 sm:p-2.5 shrink-0">
                <Button
                  variant="outline"
                  color="red"
                  size={isMobile ? "sm" : "md"}
                  onClick={() => setDirectPickItems([])}
                  className="flex-1 sm:flex-none"
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => void handleBulkDirectPickSubmit()}
                  loading={isDirectPicking}
                  size={isMobile ? "sm" : "md"}
                  leftIcon={<ArrowRight size={20} />}
                  className="flex-1 sm:flex-none"
                >
                  {isMobile ? `Submit ${directPickItems.length}` : `Submit ${directPickItems.length} Pick(s)`}
                </Button>
              </div>
            </div>
          )}
        </OperationsPanel>
      ) : (
        <OutboundSplitLayout
          showQueueOnMobile={!activeGroup}
          queue={
            <OutboundQueue
              title="Sales Orders"
              count={openOrderGroups.length}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search order, customer, SKU…"
              emptyTitle="No orders waiting"
              emptyDescription="Open sales orders with pending quantity will appear here."
            >
              {openOrderGroups.map((order) => (
                <OutboundQueueRow
                  key={order.salesOrderId}
                  active={order.salesOrderId === selectedSalesOrderId}
                  orderNumber={order.orderNumber}
                  customerName={order.customerName}
                  status={order.status}
                  primaryMetric={`${order.totalPickedQuantity}/${order.totalQuantity}`}
                  secondaryMetric={`${order.items.length} lines`}
                  onClick={() => setSelectedSalesOrderId(order.salesOrderId)}
                />
              ))}
            </OutboundQueue>
          }
          workspace={
            activeGroup && activeItem ? (
              <TaskWorkspace
                backLabel="Back to picking queue"
                onBack={() => setSelectedSalesOrderId(null)}
                orderNumber={activeGroup.orderNumber}
                customerName={activeGroup.customerName}
                status={isFullyPicked ? "Picked" : "Picking"}
                progressLabel={
                  isMobile
                    ? `${completedItemCount}/${activeGroup.items.length} lines · ${activeGroup.totalPickedQuantity}/${activeGroup.totalQuantity}`
                    : `${completedItemCount} of ${activeGroup.items.length} lines · ${activeGroup.totalPickedQuantity} of ${activeGroup.totalQuantity} units`
                }
                progressValue={activeOrderProgress}
                meta={
                  <span className="font-mono text-[11px] font-black tabular-nums text-brand-200 sm:text-xs">
                    {activeItem.pendingQuantity} left
                  </span>
                }
                bottomDock={
                  isFullyPicked ? (
                    <Button size={isMobile ? "sm" : "md"} fullWidth color="green" onClick={() => navigate("/packing")}>
                      Continue to Packing
                    </Button>
                  ) : (
                    <ScannerDock
                      label={isLocationLocked ? "Scan Product" : "Scan Location"}
                      value={isLocationLocked ? scanCode : locationScanCode}
                      onChange={isLocationLocked ? setScanCode : setLocationScanCode}
                      onSubmit={() => {
                        if (isLocationLocked) void handleScanSubmit();
                        else handleLocationSubmit();
                      }}
                      actionLabel={isLocationLocked ? "Pick" : "Set"}
                      placeholder={isLocationLocked ? "Scan SKU, alias, or carton QR…" : "Scan bin or location…"}
                      disabled={isPicking}
                      loading={isPicking}
                      inputRef={isLocationLocked ? scanInputRef : locationInputRef}
                      secondaryAction={
                        isLocationLocked ? (
                          <button
                            type="button"
                            onClick={handleChangeLocation}
                            className="text-[10px] font-bold text-brand-300 hover:text-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                          >
                            Change {lastLocationCode}
                          </button>
                        ) : null
                      }
                    />
                  )
                }
              >
                <TaskInstruction
                  eyebrow={isLocationLocked ? "Next: Scan Product" : "Next: Confirm Location"}
                  title={isLocationLocked ? activeItem.productName : locationSummary}
                  description={
                    isLocationLocked
                      ? `${activeItem.skuCode}${activeItem.alias ? ` / ${activeItem.alias}` : ""}`
                      : `Go to the allotted location for ${activeItem.productName}.`
                  }
                  tone={scanTone === "error" ? "danger" : scanTone === "success" ? "success" : "brand"}
                  icon={isLocationLocked ? Package : ScanLine}
                  metrics={[
                    { label: "Location", value: isLocationLocked ? lastLocationCode : locationSummary, emphasis: true },
                    { label: "Need", value: activeItem.pendingQuantity, emphasis: true },
                    { label: "Picked", value: `${activeItem.pickedQuantity}/${activeItem.quantity}` },
                    { label: "SO MRP", value: formatMrp(activeItem.mrp) },
                  ]}
                />

                {scanTone === "error" ? (
                  <div className="mt-2">
                    <ExceptionNotice message={lastScanMessage} />
                  </div>
                ) : (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`mt-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] sm:mt-2 sm:px-3 sm:py-2 sm:text-xs ${
                      scanTone === "success"
                        ? "border-green-500/20 bg-green-500/[0.06] text-green-200"
                        : "border-white/10 bg-white/[0.025] text-neutral-400"
                    }`}
                  >
                    {lastScanMessage}
                    {lastScanCode ? <span className="ml-1 font-mono text-neutral-500">({lastScanCode})</span> : null}
                  </div>
                )}

                <div className="mt-1.5 flex justify-end sm:mt-2">
                  <Button
                    variant="subtle"
                    color="yellow"
                    size="xs"
                    onClick={() => setIsShortCloseModalOpen(true)}
                  >
                    Exception: Short Close
                  </Button>
                </div>

                <CompactItems title="Order Lines" count={activeGroup.items.length} defaultOpen={!isMobile}>
                  <div className="space-y-1">
                    {activeGroup.items.map((item) => (
                      <CompactItemRow
                        key={item.id}
                        active={item.id === activeItem.id}
                        done={item.pendingQuantity === 0}
                        productName={item.productName}
                        skuCode={`${item.skuCode}${item.alias ? ` / ${item.alias}` : ""}`}
                        quantity={item.pendingQuantity === 0 ? "Done" : `${item.pickedQuantity}/${item.quantity}`}
                        location={getLocationSummary(item.productId)}
                        onClick={() => setActiveItemId(item.id)}
                      />
                    ))}
                  </div>
                </CompactItems>
              </TaskWorkspace>
            ) : (
              <div className="hidden min-h-[560px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-neutral-500 xl:grid">
                Select an order to begin picking.
              </div>
            )
          }
        />
      )}
      </div>
      </div>

      <Modal
        opened={isShortCloseModalOpen}
        onClose={() => setIsShortCloseModalOpen(false)}
        title="Complete Picking"
        centered
        size="sm"
      >
        <Text size="md" mb="lg" color="dimmed">
          You are about to finish picking this order without fulfilling all items. 
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
          <Button variant="outline" color="gray" size="md" onClick={() => setIsShortCloseModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleShortCloseSubmit} loading={isShortClosing} color="yellow" size="md">
            Confirm & Save Order
          </Button>
        </div>
      </Modal>
      <Modal
        opened={!!mrpMismatchScan}
        onClose={handleMrpReject}
        title="Price Mismatch Alert"
        centered
        size="md"
      >
        {mrpMismatchScan && (
          <div className="space-y-2">
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-orange-400 mt-1" size={20} />
                <div>
                  <p className="text-sm text-neutral-300">
                    The scanned item has a different price than the sales order.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Scanned Price</p>
                      <p className="text-base font-bold text-white">Rs {mrpMismatchScan.effectiveScan.mrp}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Expected Price</p>
                      <p className="text-base font-bold text-white">Rs {mrpMismatchScan.matchedItem.mrp}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm font-semibold text-white mt-2">
              Do you want to proceed with picking this item?
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" color="gray" size="sm" onClick={handleMrpReject}>
                Reject
              </Button>
              <Button color="orange" size="sm" onClick={handleMrpConfirm}>
                OK, Pick Item
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </OperationsPage>
  );
});

export default Picking;
