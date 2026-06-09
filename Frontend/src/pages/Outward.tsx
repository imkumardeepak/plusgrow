import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge,
  Group,
  NumberInput,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  Download,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
  const [statusFilter, setStatusFilter] = useState<OutwardStatusFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SalesOrderRecord | null>(null);
  const [cancelGroup, setCancelGroup] = useState<SalesOrderRecord | null>(null);
  const [cancelRemark, setCancelRemark] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrderForm());
  const [productSearch, setProductSearch] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const productsData = await productsApi.search(productSearch);
      setProducts(productsData);
    } catch {
      toast.error("Failed to load product lookup");
    }
  }, [productSearch]);

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
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.id),
        label: product.alias ? `${product.sku || "NO-SKU"} - ${product.name} (${product.alias})` : `${product.sku || "NO-SKU"} - ${product.name}`,
      })),
    [products],
  );

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
      header: "Order No.",
      sortable: true,
      sortAccessor: (row) => row.orderNumber,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "11px"} ff="monospace" c="cyan.2" fw={700}>
          {row.orderNumber}
        </Text>
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
  };

  const handleCreateOrder = async () => {
    if (!orderForm.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (orderForm.items.some((item) => item.productId <= 0)) {
      toast.error("Select product for every item");
      return;
    }

    if (orderForm.items.some((item) => item.quantity <= 0)) {
      toast.error("Each item quantity must be greater than zero");
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
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "picking", label: "Picking" },
                { value: "packed", label: "Packed" },
                { value: "dispatched", label: "Done" },
                { value: "canceled", label: "Canceled" },
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
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportExcel}
              loading={isExporting}
            >
              Export Excel
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsCreateOpen(true)}
            >
              New Order
            </Button>
          </Group>
        }
      >
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
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
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
              value={orderForm.customerName}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setOrderForm((current) => ({
                  ...current,
                  customerName: value,
                }));
              }}
            />
            <TextInput
              label="Notes"
              value={orderForm.notes || ""}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setOrderForm((current) => ({
                  ...current,
                  notes: value,
                }));
              }}
              className="md:col-span-2"
            />
          </SimpleGrid>

          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={700}>
                Order Items
              </Text>
              <Button
                size="xs"
                variant="outline"
                leftIcon={<Plus size={14} />}
                onClick={addOrderItem}
              >
                Add Item
              </Button>
            </Group>

            {orderForm.items.map((item, index) => (
              <SimpleGrid key={item.id} cols={{ base: 1, md: 12 }} spacing="sm">
                <Select
                  label={`Product ${index + 1}`}
                  searchable
                  data={productOptions}
                  searchValue={productSearch}
                  onSearchChange={setProductSearch}
                  value={item.productId > 0 ? String(item.productId) : null}
                  onChange={(value) => {
                    const product = products.find((row) => row.id === Number(value));
                    updateOrderItem(item.id, {
                      productId: value ? Number(value) : 0,
                      mrp: product?.mrp ?? "",
                    });
                  }}
                  className="md:col-span-6"
                />
                <NumberInput
                  label="Quantity"
                  min={1}
                  value={item.quantity}
                  onChange={(value) =>
                    updateOrderItem(item.id, {
                      quantity: typeof value === "number" ? value : 1,
                    })
                  }
                  className="md:col-span-2"
                />
                <NumberInput
                  label="MRP"
                  min={0}
                  decimalScale={2}
                  value={item.mrp}
                  onChange={(value) =>
                    updateOrderItem(item.id, {
                      mrp: typeof value === "number" ? value : "",
                    })
                  }
                  className="md:col-span-3"
                />
                <Group align="end" className="md:col-span-1">
                  <ActionIcon
                    size="lg"
                    radius="md"
                    variant="light"
                    color="red"
                    disabled={orderForm.items.length === 1}
                    onClick={() => removeOrderItem(item.id)}
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              </SimpleGrid>
            ))}
          </Stack>
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
                selectedGroup.totalPickedQuantity > 0 ||
                selectedGroup.status !== "Open"
              }
              onClick={() => {
                setCancelGroup(selectedGroup);
                setCancelRemark("");
              }}
            >
              Cancel Sales Order
            </Button>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
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
    </OperationsPage>
  );
});

export default Outward;
