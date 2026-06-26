import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Box,
  ScrollArea,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  AlertTriangle,
  Download,
  Edit2,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "../components/atoms/Button";
import { Modal } from "../components/atoms/Modal";
import {
  DataTableColumn,
  MantineDataTable,
} from "../components/molecules/MantineDataTable";
import {
  CreateOutwardOrderDto,
  CreateOutwardOrderItemDto,
  outwardOrdersApi,
  Product,
  productsApi,
  SalesOrderRecord,
  tallySyncApi,
  TallySyncSkippedOrder,
} from "../services/masterApi";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { toast } from "../lib/toast";
import { exportToExcel, formatExcelDate, formatExcelNumber } from "../hooks/useExcelExport";

type OutwardStatusFilter = "all" | "open" | "picking" | "packed" | "dispatched" | "canceled";

type OrderItemInput = {
  id: string;
  productId: number;
  quantity: number;
  mrp: number | "";
};

type OrderForm = Omit<CreateOutwardOrderDto, "items"> & {
  items: OrderItemInput[];
};

const normalizeProductScan = (value: string) => value.trim().toUpperCase();

const formatProductOptionLabel = (product: Product) => {
  const sku = product.sku || "NO-SKU";
  return product.alias
    ? `${sku} / ${product.alias} - ${product.name}`
    : `${sku} - ${product.name}`;
};

const createOrderItemInput = (): OrderItemInput => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  productId: 0,
  quantity: 1,
  mrp: "",
});

const emptyOrderForm = (): OrderForm => ({
  orderDate: new Date().toISOString().slice(0, 10),
  customerName: "",
  notes: "",
  items: [createOrderItemInput()],
});

const statusTone = (status: SalesOrderRecord["status"]) => {
  switch (status) {
    case "Dispatched":
      return { color: "green", label: "Dispatched" };
    case "Packed":
      return { color: "blue", label: "Packed" };
    case "Picking":
      return { color: "yellow", label: "Picking" };
    case "Canceled":
      return { color: "red", label: "Canceled" };
    default:
      return { color: "orange", label: "Open" };
  }
};

export const Outward = memo(function Outward() {
  const isLargeScreen = useMediaQuery("(min-width: 90em)");
  const [orders, setOrders] = useState<SalesOrderRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OutwardStatusFilter>("open");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SalesOrderRecord | null>(null);
  const [cancelGroup, setCancelGroup] = useState<SalesOrderRecord | null>(null);
  const [cancelRemark, setCancelRemark] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSkippedErrors, setUploadSkippedErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrderForm());
  const [productSearchByItemId, setProductSearchByItemId] = useState<Record<string, string>>({});

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    customerName: string;
    orderDate: string;
    notes: string;
    referenceNumber: string;
  }>({
    customerName: "",
    orderDate: "",
    notes: "",
    referenceNumber: "",
  });

  // Skipped Orders state
  const [isSkippedModalOpen, setIsSkippedModalOpen] = useState(false);
  const [skippedOrders, setSkippedOrders] = useState<TallySyncSkippedOrder[]>([]);
  const [isLoadingSkipped, setIsLoadingSkipped] = useState(false);

  const loadSkippedOrders = useCallback(async () => {
    try {
      setIsLoadingSkipped(true);
      const data = await tallySyncApi.getSkippedOrders(false);
      setSkippedOrders(data);
    } catch {
      toast.error("Failed to load skipped Tally orders");
    } finally {
      setIsLoadingSkipped(false);
    }
  }, []);

  const handleRetrySkipped = async (id: number) => {
    try {
      await tallySyncApi.retrySkippedOrder(id);
      toast.success("Order retried and imported successfully!");
      loadSkippedOrders();
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to retry order");
    }
  };

  const handleDismissSkipped = async (id: number) => {
    if (!confirm("Are you sure you want to dismiss this skipped order?")) return;
    try {
      await tallySyncApi.dismissSkippedOrder(id);
      toast.success("Order dismissed");
      loadSkippedOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to dismiss order");
    }
  };

  const loadProducts = useCallback(async () => {
    try {
      // Load all products once so Mantine can filter them locally per-dropdown
      const productsData = await productsApi.getAll();
      setProducts(productsData);
    } catch {
      toast.error("Failed to load product lookup");
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const ordersData = await outwardOrdersApi.getSalesOrders();
      setOrders(ordersData);
    } catch {
      toast.error("Failed to load outward orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredGroups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((group) => {
      const matchesStatus =
        statusFilter === "all" ||
        group.status.toLowerCase() === statusFilter;

      const matchesSearch =
        !query ||
        group.orderNumber.toLowerCase().includes(query) ||
        group.customerName.toLowerCase().includes(query) ||
        group.items.some((item) =>
          item.productName.toLowerCase().includes(query) ||
          item.skuCode.toLowerCase().includes(query) ||
          (item.alias && item.alias.toLowerCase().includes(query)),
        );

      return matchesStatus && matchesSearch;
    }).sort((a, b) => {
      const getStatusWeight = (status: string) => {
        switch (status) {
          case "Open": return 0;
          case "Picking": return 1;
          case "Packed": return 2;
          case "Dispatched": return 3;
          case "Canceled": return 4;
          default: return 5;
        }
      };
      const weightDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    });
  }, [orders, searchTerm, statusFilter]);

  const metrics = useMemo(() => {
    const total = orders.length;
    const open = orders.filter((row) => row.status === "Open").length;
    const picking = orders.filter((row) => row.status === "Picking").length;
    const packed = orders.filter((row) => row.status === "Packed").length;
    const dispatched = orders.filter((row) => row.status === "Dispatched").length;
    const canceled = orders.filter((row) => row.status === "Canceled").length;
    return { total, open, picking, packed, dispatched, canceled };
  }, [orders]);

  const columns: DataTableColumn<SalesOrderRecord>[] = [
    {
      key: "orderNumber",
      header: "Order / Ref No.",
      sortable: true,
      sortAccessor: (row) => row.orderNumber,
      render: (row) => (
        <Stack gap={2}>
          <Text size={isLargeScreen ? "sm" : "11px"} ff="monospace" c="cyan.2" fw={700}>
            {row.orderNumber}
          </Text>
          <Text size="10px" ff="monospace" c="dimmed" lineClamp={1}>
            {row.referenceNumber || "-"}
          </Text>
        </Stack>
      ),
      width: 150,
    },
    {
      key: "orderDate",
      header: "Order Date",
      sortable: true,
      sortAccessor: (row) => row.orderDate,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"}>{format(new Date(row.orderDate), "dd MMM yyyy")}</Text>
      ),
      width: 120,
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      sortAccessor: (row) => row.customerName,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"} fw={600}>
          {row.customerName}
        </Text>
      ),
      width: 170,
    },
    {
      key: "items",
      header: "Items",
      sortable: true,
      sortAccessor: (row) => row.itemCount,
      render: (row) => (
        <Stack gap={2}>
          <Text size={isLargeScreen ? "sm" : "xs"} fw={700}>
            {row.itemCount} item{row.itemCount > 1 ? "s" : ""}
          </Text>
          <Text size={isLargeScreen ? "xs" : "10px"} c="dimmed" lineClamp={1}>
            {row.items.map((item) => item.skuCode).join(", ")}
          </Text>
        </Stack>
      ),
      width: 220,
    },
    {
      key: "quantity",
      header: "Order Qty.",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.totalQuantity,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"} fw={800}>
          {row.totalQuantity}
        </Text>
      ),
      width: 90,
    },
    {
      key: "pickedQuantity",
      header: "Picked",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.totalPickedQuantity,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"} fw={800} c={row.pendingQuantity === 0 ? "green.3" : "orange.3"}>
          {row.totalPickedQuantity} / {row.totalQuantity}
        </Text>
      ),
      width: 110,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortAccessor: (row) => row.status,
      render: (row) => {
        const tone = statusTone(row.status);
        return (
          <Stack gap={2} align="flex-start">
            <Badge size="sm" radius="md" variant="light" color={tone.color}>
              {tone.label}
            </Badge>
            {row.status === "Canceled" && row.cancelRemark && (
              <Text size="10px" c="dimmed" lineClamp={2} title={row.cancelRemark}>
                {row.cancelRemark}
              </Text>
            )}
          </Stack>
        );
      },
      width: 140,
    },
    {
      key: "remarks",
      header: "Remarks",
      sortable: false,
      render: (row) => (
        <Text size={isLargeScreen ? "xs" : "10px"} c={row.status === "Canceled" ? "red.4" : "dimmed"} lineClamp={2} title={row.status === "Canceled" ? row.cancelRemark ?? "" : row.notes ?? ""}>
          {row.status === "Canceled" ? row.cancelRemark : row.notes || "-"}
        </Text>
      ),
      width: 180,
    },
  ];

  const detailColumns: DataTableColumn<SalesOrderRecord["items"][number]>[] = [
    {
      key: "product",
      header: "Product",
      sortable: true,
      sortAccessor: (row) => row.productName,
      render: (row) => (
        <Stack gap={2}>
          <Text size="xs" fw={700}>{row.productName}</Text>
          <Text size="10px" ff="monospace" c="dimmed">
            {row.skuCode}
            {row.alias ? ` • ${row.alias}` : ""}
          </Text>
        </Stack>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.quantity,
      render: (row) => (
        <Text size="xs" fw={700}>
          {row.quantity}
        </Text>
      ),
      width: 80,
    },
    {
      key: "mrp",
      header: "MRP",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.mrp ?? 0,
      render: (row) => (
        <Text size="xs" fw={700}>
          {row.mrp ? `Rs ${Number(row.mrp).toFixed(2)}` : "-"}
        </Text>
      ),
      width: 100,
    },
    {
      key: "picked",
      header: "Picked",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.pickedQuantity,
      render: (row) => (
        <Text size="xs" fw={700}>
          {row.pickedQuantity} / {row.quantity}
        </Text>
      ),
      width: 100,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortAccessor: (row) => row.status,
      render: (row) => {
        const tone = statusTone(row.status);
        return (
          <Badge size="sm" radius="md" variant="light" color={tone.color}>
            {tone.label}
          </Badge>
        );
      },
      width: 110,
    },
  ];

  const updateOrderItem = (
    itemId: string,
    patch: Partial<OrderItemInput>,
  ) => {
    setOrderForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    }));
  };

  const selectOrderProduct = (itemId: string, product: Product | null) => {
    updateOrderItem(itemId, {
      productId: product?.id ?? 0,
      mrp: product?.mrp ?? "",
    });
    setProductSearchByItemId((current) => ({
      ...current,
      [itemId]: product ? formatProductOptionLabel(product) : "",
    }));
  };

  const handleOrderProductSearchChange = (itemId: string, value: string) => {
    setProductSearchByItemId((current) => ({ ...current, [itemId]: value }));
  };

  const handleOrderProductSearchEnter = (itemId: string, value: string) => {
    const normalized = normalizeProductScan(value.split("#")[0]);
    if (!normalized) {
      updateOrderItem(itemId, { productId: 0, mrp: "" });
      return;
    }

    const product = products.find(
      (row) =>
        normalizeProductScan(row.sku || "") === normalized ||
        normalizeProductScan(row.alias || "") === normalized,
    );

    if (product) {
      selectOrderProduct(itemId, product);
      return;
    }

    updateOrderItem(itemId, { productId: 0, mrp: "" });
  };

  const addOrderItem = () => {
    setOrderForm((current) => ({
      ...current,
      items: [...current.items, createOrderItemInput()],
    }));
  };

  const removeOrderItem = (itemId: string) => {
    setOrderForm((current) => ({
      ...current,
      items:
        current.items.length > 1
          ? current.items.filter((item) => item.id !== itemId)
          : current.items,
    }));
    setProductSearchByItemId((current) => {
      const { [itemId]: _removed, ...rest } = current;
      return rest;
    });
  };

  const handleCreateOrder = async () => {
    if (!orderForm.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (orderForm.items.some((item) => item.productId <= 0)) {
      toast.error("Scan valid SKU or alias for every item");
      return;
    }

    if (orderForm.items.some((item) => item.quantity <= 0)) {
      toast.error("Each item quantity must be greater than zero");
      return;
    }

    // Frontend stock check before submission
    const stockErrors: string[] = [];
    for (const item of orderForm.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product && product.stockQty !== undefined) {
        const available = product.stockQty ?? 0;
        if (item.quantity > available) {
          const label = product.sku ? `${product.sku} - ${product.name}` : product.name;
          stockErrors.push(`"${label}": requested ${item.quantity}, available ${available}`);
        }
      }
    }
    if (stockErrors.length > 0) {
      toast.error(`Insufficient stock:\n${stockErrors.join("\n")}`);
      return;
    }

    const mergedItems = Array.from(
      orderForm.items.reduce((map, item) => {
        const key = `${item.productId}:${Number(item.mrp || 0).toFixed(2)}`;
        const current = map.get(key);
        map.set(key, {
          productId: item.productId,
          quantity: (current?.quantity || 0) + item.quantity,
          mrp: item.mrp === "" ? null : Number(item.mrp),
        });
        return map;
      }, new Map<string, CreateOutwardOrderItemDto>()),
    ).map(([, item]) => item) satisfies CreateOutwardOrderItemDto[];

    try {
      setIsSaving(true);
      await outwardOrdersApi.create({
        orderDate: orderForm.orderDate,
        customerName: orderForm.customerName.trim(),
        notes: orderForm.notes?.trim() || null,
        items: mergedItems,
      });
      toast.success(
        mergedItems.length > 1
          ? "Sales order created with multiple items"
          : "Sales order created",
      );
      setIsCreateOpen(false);
      setOrderForm(emptyOrderForm());
      setProductSearchByItemId({});
      await loadOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to create outward order");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelGroup) return;

    if (!cancelRemark.trim()) {
      toast.error("Cancel reason is required");
      return;
    }

    try {
      setIsCanceling(true);
      await outwardOrdersApi.cancelSalesOrder(cancelGroup.id, cancelRemark.trim());
      toast.success(`${cancelGroup.orderNumber} canceled`);
      setCancelGroup(null);
      setCancelRemark("");
      setIsDetailsOpen(false);
      setSelectedGroup(null);
      await loadOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel sales order");
    } finally {
      setIsCanceling(false);
    }
  };

  const openEditModal = (order: SalesOrderRecord) => {
    setEditForm({
      customerName: order.customerName,
      orderDate: order.orderDate.slice(0, 10),
      notes: order.notes ?? "",
      referenceNumber: order.referenceNumber ?? "",
    });
    setIsEditOpen(true);
  };

  const handleEditOrder = async () => {
    if (!selectedGroup) return;
    if (!editForm.customerName.trim() && selectedGroup.status !== "Canceled") {
      toast.error("Customer name is required");
      return;
    }
    try {
      setIsEditing(true);
      const isCanceled = selectedGroup.status === "Canceled";
      const updated = await outwardOrdersApi.updateSalesOrder(selectedGroup.id, {
        customerName: isCanceled ? undefined : editForm.customerName.trim() || undefined,
        orderDate: isCanceled ? undefined : editForm.orderDate || undefined,
        notes: isCanceled ? undefined : editForm.notes.trim() || null,
        referenceNumber: editForm.referenceNumber.trim() || null,
      });
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setSelectedGroup(updated);
      toast.success("Sales order updated");
      setIsEditOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setIsEditing(false);
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportToExcel({
        fileName: "Sales_Orders",
        sheets: [{
          sheetName: "Sales Orders",
          data: filteredGroups,
          columns: [
            { header: "Order No.", accessor: (row) => row.orderNumber },
            { header: "Order Date", accessor: (row) => formatExcelDate(row.orderDate) },
            { header: "Customer", accessor: (row) => row.customerName },
            { header: "Item Count", accessor: (row) => row.itemCount, format: "number" },
            { header: "Order Qty", accessor: (row) => row.totalQuantity, format: "number" },
            { header: "Picked Qty", accessor: (row) => row.totalPickedQuantity, format: "number" },
            { header: "Pending Qty", accessor: (row) => row.pendingQuantity, format: "number" },
            { header: "Status", accessor: (row) => row.status },
            { header: "Notes", accessor: (row) => row.notes || "" },
          ],
        }],
      });
      toast.success("Sales orders exported successfully");
    } catch {
      toast.error("Failed to export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadUploadTemplate = () => {
    outwardOrdersApi.downloadSalesOrderTemplate();
    toast.success("Sales order template downloaded");
  };

  const handleUploadFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload a valid Excel file");
      return;
    }

    setUploadFile(file);
    setUploadSkippedErrors([]);
  };

  const handleSalesOrderUpload = async () => {
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      const result = await outwardOrdersApi.uploadSalesOrdersExcel(uploadFile);
      const errors = result.errors || [];
      setUploadSkippedErrors(errors);

      if (result.importedCount > 0) {
        toast.success(
          errors.length > 0
            ? `Imported ${result.importedCount} rows, skipped ${errors.length}`
            : `Imported ${result.importedCount} sales order rows`,
        );
        setUploadFile(null);
        setIsUploadOpen(errors.length > 0);
        await loadOrders();
      } else if (errors.length > 0) {
        toast.warning(`No rows imported. ${errors.length} rows skipped.`);
      } else {
        toast.warning("No valid rows found in uploaded file");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload sales order file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <OperationsPage
      title="Outward Orders"
      description="Create sales orders with multiple items, review header and item details, and move work into picking, packing, and dispatch."
      icon={FileText}
      hideHeader
    >
      <OperationsPanel
        title="Sales Order Ledger"
        icon={FileText}
        description="Sales order headers with line items under each order number."
        contentClassName="p-0"
        action={
          <Group gap="xs" wrap="nowrap">
            <Badge size="sm" radius="md" variant="light" color="gray">
              {metrics.total} Orders
            </Badge>
            <SegmentedControl
              size="xs"
              radius="md"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as OutwardStatusFilter)}
              data={[
                { value: "open", label: "Open" },
                { value: "picking", label: "Picking" },
                { value: "packed", label: "Packed" },
                { value: "dispatched", label: "Done" },
                { value: "canceled", label: "Canceled" },
                { value: "all", label: "All" },
              ]}
            />
            <TextInput
              size="xs"
              radius="md"
              w={240}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              placeholder="Search order, customer, SKU..."
              leftSection={<Search size={14} />}
            />
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="gray"
              onClick={() => void loadOrders()}
              loading={isLoading}
              aria-label="Refresh outward orders"
            >
              <RefreshCw size={14} />
            </ActionIcon>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<AlertTriangle className="h-3.5 w-3.5" />}
              onClick={() => {
                setIsSkippedModalOpen(true);
                loadSkippedOrders();
              }}
            >
              Skipped Tally
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportExcel}
              loading={isExporting}
            >
              Export Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => setIsUploadOpen(true)}
            >
              Import Excel
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setOrderForm(emptyOrderForm());
                setProductSearchByItemId({});
                setIsCreateOpen(true);
              }}
            >
              New Order
            </Button>
          </Group>
        }
      >
        {orders.length >= 200 && (
          <Box px="md" pt="xs">
            <Group gap="xs" align="center" p="xs" style={{ background: "rgba(250,176,5,0.08)", borderRadius: 8, border: "1px solid rgba(250,176,5,0.25)" }}>
              <AlertTriangle size={14} color="#f59f00" />
              <Text size="xs" c="yellow.5">
                Showing the latest <strong>{orders.length}</strong> orders. Older orders are not displayed.
                Use the <strong>Search</strong> box or <strong>Status</strong> filter to find specific orders.
              </Text>
            </Group>
          </Box>
        )}
        <MantineDataTable
          data={filteredGroups}
          columns={columns}
          rowKey={(row) => row.orderNumber}
          onRowClick={(row) => {
            setSelectedGroup(row);
            setIsDetailsOpen(true);
          }}
          isLoading={isLoading}
          fontSize={isLargeScreen ? 14 : 12}
          itemLabel="orders"
          resetPageKey={`${searchTerm}-${statusFilter}`}
          emptyIcon={FileText}
          emptyTitle="No outward orders"
          emptyDescription="Create a sales order to start the outward workflow."
        />
      </OperationsPanel>

      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Import Sales Orders from Excel"
        size="lg"
      >
        <Stack gap="md">
          <Paper radius="md" p="md" withBorder bg="transparent">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text fw={700}>Sales Order Import Template</Text>
                <Text size="sm" c="dimmed">
                  Invoice No. is saved as Ref No. Repeated invoice numbers become one sales order with multiple items.
                </Text>
              </Stack>
              <Button
                variant="outline"
                leftIcon={<Download size={14} />}
                onClick={handleDownloadUploadTemplate}
              >
                Download Template
              </Button>
            </Group>
          </Paper>

          <Paper radius="md" p="md" withBorder bg="transparent">
            <Stack gap="sm">
              <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                Excel File
              </Text>
              <input type="file" accept=".xlsx,.xls" onChange={handleUploadFileSelect} />
              {uploadFile ? (
                <Text size="sm" fw={700}>
                  {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  Required columns: Invoice No., Inv. Date, Party Name, Part No., MRP, Item Name, Billed Qty.
                </Text>
              )}
            </Stack>
          </Paper>

          {uploadSkippedErrors.length > 0 ? (
            <Paper radius="md" p="sm" withBorder bg="rgba(239, 68, 68, 0.08)">
              <Stack gap="xs" mah={220} style={{ overflowY: "auto" }}>
                <Text size="xs" fw={800} c="red.3">
                  Skipped rows ({uploadSkippedErrors.length})
                </Text>
                {uploadSkippedErrors.map((error, index) => (
                  <Text key={`${error}-${index}`} size="xs" c="red.3">
                    {error}
                  </Text>
                ))}
              </Stack>
            </Paper>
          ) : null}

          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              leftIcon={<Upload size={14} />}
              disabled={!uploadFile}
              loading={isUploading}
              onClick={() => void handleSalesOrderUpload()}
            >
              Import Sales Orders
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Sales Order"
        size="xl"
        footer={
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateOrder()} loading={isSaving}>
              Save Order
            </Button>
          </Group>
        }
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <TextInput
              label="Order Date"
              type="date"
              value={orderForm.orderDate}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setOrderForm((current) => ({
                  ...current,
                  orderDate: value,
                }));
              }}
            />
            <TextInput
              label="Customer Name"
              placeholder="e.g. Acme Corp"
              value={orderForm.customerName}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setOrderForm((current) => ({
                  ...current,
                  customerName: value,
                }));
              }}
              size="sm"
            />
            <TextInput
              label="Notes"
              placeholder="Optional remarks"
              value={orderForm.notes || ""}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setOrderForm((current) => ({
                  ...current,
                  notes: value,
                }));
              }}
            />
          </SimpleGrid>

            <Box bg="rgba(15, 23, 42, 0.4)" p="md" radius="md" style={{ border: "1px solid rgba(148, 163, 184, 0.1)" }}>
            <Group justify="space-between" mb="md">
              <Text size="md" fw={700} c="white">
                Order Items
              </Text>
              <Button
                size="sm"
                variant="light"
                color="cyan"
                leftSection={<Plus size={14} />}
                onClick={addOrderItem}
              >
                Add Item
              </Button>
            </Group>

            <ScrollArea type="auto" offsetScrollbars="y" style={{ maxHeight: "500px", paddingRight: "8px" }}>
              <Stack gap="md">
                {orderForm.items.map((item, index) => {
                  const selectedProduct = products.find((p) => p.id === item.productId);
                  const availableStock = selectedProduct?.stockQty ?? null;
                  const stockExceeded = availableStock !== null && item.quantity > availableStock;

                  return (
                  <Stack key={item.id} gap={4}>
                    <Group wrap="nowrap" align="flex-end" gap="sm">
                      <TextInput
                        label={index === 0 ? "Scan SKU / Alias" : undefined}
                        placeholder="Scan SKU or alias"
                        value={productSearchByItemId[item.id] || ""}
                        onChange={(event) =>
                          handleOrderProductSearchChange(item.id, event.currentTarget.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handleOrderProductSearchEnter(item.id, event.currentTarget.value);
                          }
                        }}
                        error={
                          productSearchByItemId[item.id] && item.productId <= 0
                            ? "SKU or alias not found"
                            : undefined
                        }
                        style={{ flex: 1 }}
                      />
                      <Stack gap={2} align="center">
                        {index === 0 && <Text size="xs" c="dimmed" mb={2}>Qty</Text>}
                        <Tooltip
                          label={stockExceeded ? `Max available: ${availableStock}` : availableStock !== null ? `In stock: ${availableStock}` : ""}
                          disabled={availableStock === null}
                          position="top"
                        >
                          <NumberInput
                            placeholder="1"
                            w={100}
                            min={1}
                            max={availableStock ?? undefined}
                            value={item.quantity}
                            error={stockExceeded}
                            styles={stockExceeded ? { input: { borderColor: "var(--mantine-color-red-5)", color: "var(--mantine-color-red-4)" } } : undefined}
                            onChange={(value) =>
                              updateOrderItem(item.id, {
                                quantity: typeof value === "number" ? value : 1,
                              })
                            }
                          />
                        </Tooltip>
                      </Stack>
                      <NumberInput
                        label={index === 0 ? "MRP" : undefined}
                        placeholder="0.00"
                        w={130}
                        min={0}
                        decimalScale={2}
                        value={item.mrp}
                        onChange={(value) =>
                          updateOrderItem(item.id, {
                            mrp: typeof value === "number" ? value : "",
                          })
                        }
                      />
                      <ActionIcon
                        size={36}
                        radius="md"
                        variant="subtle"
                        color="red"
                        disabled={orderForm.items.length === 1}
                        onClick={() => removeOrderItem(item.id)}
                        aria-label="Remove item"
                        style={{ marginBottom: stockExceeded ? 20 : 0 }}
                      >
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                    {selectedProduct ? (
                      <Group gap={6} pl={4}>
                        <Text size="10px" c="cyan.3" fw={700}>
                          {selectedProduct.sku || "-"}
                          {selectedProduct.alias ? ` / ${selectedProduct.alias}` : ""}
                        </Text>
                        <Text size="10px" c="dimmed" lineClamp={1}>
                          {selectedProduct.name}
                        </Text>
                        {availableStock !== null && stockExceeded ? (
                          <>
                            <AlertTriangle size={12} color="var(--mantine-color-red-5)" />
                            <Text size="10px" c="red.4">
                              Only {availableStock} in stock, reduce quantity
                            </Text>
                          </>
                        ) : availableStock !== null ? (
                          <Text size="10px" c="dimmed">
                            In stock: <Text component="span" fw={700} c={availableStock === 0 ? "red.4" : availableStock <= 5 ? "yellow.4" : "green.4"}>{availableStock}</Text>
                          </Text>
                        ) : null}
                      </Group>
                    ) : null}
                  </Stack>
                  );
                })}
              </Stack>
            </ScrollArea>
          </Box>
        </Stack>
      </Modal>

      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedGroup ? `Order ${selectedGroup.orderNumber}` : "Order Items"}
        size="xl"
        footer={
          <Group justify="space-between">
            <Button
              variant="outline"
              color="red"
              disabled={
                !selectedGroup ||
                selectedGroup.status === "Canceled" ||
                selectedGroup.status === "Dispatched"
              }
              onClick={() => {
                setCancelGroup(selectedGroup);
                setCancelRemark("");
              }}
            >
              Cancel Sales Order
            </Button>
            <Group gap="xs">
              <Button
                variant="light"
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                onClick={() => selectedGroup && openEditModal(selectedGroup)}
                disabled={!selectedGroup}
              >
                {selectedGroup?.status === "Canceled" ? "Edit Ref. No." : "Edit Order"}
              </Button>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </Group>
          </Group>
        }
      >
        {selectedGroup ? (
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
              <Text size="sm" fw={700}>
                Customer: <Text component="span" fw={500}>{selectedGroup.customerName}</Text>
              </Text>
              <Text size="sm" fw={700}>
                Date: <Text component="span" fw={500}>{format(new Date(selectedGroup.orderDate), "dd MMM yyyy")}</Text>
              </Text>
              <Text size="sm" fw={700}>
                Items: <Text component="span" fw={500}>{selectedGroup.itemCount}</Text>
              </Text>
              <Text size="sm" fw={700}>
                Qty: <Text component="span" fw={500}>{selectedGroup.totalPickedQuantity} / {selectedGroup.totalQuantity}</Text>
              </Text>
              {selectedGroup.status === "Canceled" ? (
                <Text size="sm" fw={700} c="red.3">
                  Reason: <Text component="span" fw={500}>{selectedGroup.cancelRemark || "-"}</Text>
                </Text>
              ) : null}
              {selectedGroup.referenceNumber ? (
                <Text size="sm" fw={700} c="cyan.3">
                  Ref No: <Text component="span" fw={500}>{selectedGroup.referenceNumber}</Text>
                </Text>
              ) : null}
            </SimpleGrid>

            <MantineDataTable
              data={selectedGroup.items}
              columns={detailColumns}
              rowKey={(row) => row.id}
              itemLabel="items"
              emptyIcon={FileText}
              emptyTitle="No order items"
              emptyDescription="This order has no line items."
            />
          </Stack>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(cancelGroup)}
        onClose={() => {
          setCancelGroup(null);
          setCancelRemark("");
        }}
        title="Cancel Sales Order"
        size="md"
        footer={
          <Group justify="flex-end">
            <Button
              variant="outline"
              onClick={() => {
                setCancelGroup(null);
                setCancelRemark("");
              }}
            >
              Close
            </Button>
            <Button
              color="red"
              onClick={() => void handleCancelOrder()}
              loading={isCanceling}
            >
              Cancel Sales Order
            </Button>
          </Group>
        }
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Cancel sales order{" "}
            <Text component="span" fw={800} c="red.3">
              {cancelGroup?.orderNumber}
            </Text>
            . Reason is required.
          </Text>
          <Textarea
            label="Cancel Reason"
            minRows={3}
            autosize
            value={cancelRemark}
            onChange={(event) => setCancelRemark(event.currentTarget.value)}
            placeholder="Enter reason for canceling this sales order"
          />
        </Stack>
      </Modal>

      {/* Edit Sales Order Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={
          selectedGroup?.status === "Canceled"
            ? `Edit Reference — ${selectedGroup.orderNumber}`
            : `Edit Order — ${selectedGroup?.orderNumber ?? ""}`
        }
        size="md"
        footer={
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleEditOrder()} loading={isEditing}>
              Save Changes
            </Button>
          </Group>
        }
      >
        <Stack gap="md">
          {selectedGroup?.status === "Canceled" ? (
            <>
              <Text size="sm" c="dimmed">
                This order is canceled. Only the reference number can be updated.
              </Text>
              <TextInput
                label="Reference Number"
                placeholder="e.g. PO-12345 or customer ref"
                value={editForm.referenceNumber}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  setEditForm((f) => ({ ...f, referenceNumber: val }));
                }}
              />
            </>
          ) : (
            <>
              <TextInput
                label="Order Number"
                value={selectedGroup?.orderNumber ?? ""}
                disabled
                description="Order number cannot be changed"
              />
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <TextInput
                  label="Customer Name"
                  placeholder="e.g. Acme Corp"
                  value={editForm.customerName}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    setEditForm((f) => ({ ...f, customerName: val }));
                  }}
                />
                <TextInput
                  label="Order Date"
                  type="date"
                  value={editForm.orderDate}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    setEditForm((f) => ({ ...f, orderDate: val }));
                  }}
                />
              </SimpleGrid>
              <TextInput
                label="Reference Number"
                placeholder="e.g. PO-12345 or customer ref"
                value={editForm.referenceNumber}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  setEditForm((f) => ({ ...f, referenceNumber: val }));
                }}
              />
              <TextInput
                label="Notes"
                placeholder="Optional remarks"
                value={editForm.notes}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  setEditForm((f) => ({ ...f, notes: val }));
                }}
              />
            </>
          )}
        </Stack>
      </Modal>

      <Modal
        isOpen={isSkippedModalOpen}
        onClose={() => setIsSkippedModalOpen(false)}
        title="Skipped Tally Orders"
        size="xl"
      >
        <MantineDataTable
          data={skippedOrders}
          isLoading={isLoadingSkipped}
          rowKey={(r: TallySyncSkippedOrder) => r.id}
          columns={[
            { key: "tallyReference", header: "Reference", render: (r: TallySyncSkippedOrder) => r.tallyReference },
            { key: "partyName", header: "Party Name", render: (r: TallySyncSkippedOrder) => r.partyName || "-" },
            { 
              key: "skipReason", 
              header: "Reason",
              render: (r: TallySyncSkippedOrder) => <Badge color="red" variant="light">{r.skipReason}</Badge>
            },
            { 
              key: "details", 
              header: "Details",
              render: (r: TallySyncSkippedOrder) => (
                <Text size="sm" lineClamp={2} title={r.details}>
                  {r.details}
                </Text>
              )
            },
            {
              key: "actions",
              header: "Actions",
              width: 150,
              render: (record: TallySyncSkippedOrder) => (
                <Group gap="xs" wrap="nowrap">
                  <Button size="xs" variant="outline" onClick={() => handleRetrySkipped(record.id)}>Retry</Button>
                  <Button size="xs" variant="subtle" color="red" onClick={() => handleDismissSkipped(record.id)}>Dismiss</Button>
                </Group>
              )
            }
          ]}
        />
      </Modal>
    </OperationsPage>
  );
});

export default Outward;
