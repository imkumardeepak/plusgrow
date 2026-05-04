import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge,
  Group,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  ArrowUpFromLine,
  FileText,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import { Button } from "../components/atoms/Button";
import { Modal } from "../components/atoms/Modal";
import {
  DataTableColumn,
  MantineDataTable,
} from "../components/molecules/MantineDataTable";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  CreateOutwardOrderDto,
  OutwardOrder,
  PaginationInfo,
  outwardOrdersApi,
  Product,
  productsApi,
} from "../services/masterApi";
import { toast } from "../lib/toast";

type OutwardStatusFilter = "all" | "open" | "picking" | "packed" | "dispatched";

const emptyOrderForm = (): CreateOutwardOrderDto => ({
  orderDate: new Date().toISOString().slice(0, 10),
  customerName: "",
  productId: 0,
  quantity: 1,
  notes: "",
});

const statusTone = (status: OutwardOrder["status"]) => {
  switch (status) {
    case "Dispatched":
      return { color: "green", label: "Dispatched" };
    case "Packed":
      return { color: "blue", label: "Packed" };
    case "Picking":
      return { color: "yellow", label: "Picking" };
    default:
      return { color: "orange", label: "Open" };
  }
};

export const Outward = memo(function Outward() {
  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OutwardStatusFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [orderForm, setOrderForm] = useState<CreateOutwardOrderDto>(emptyOrderForm());
  const [productSearch, setProductSearch] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const productsData = await productsApi.search(productSearch);
      setProducts(productsData);
    } catch {
      toast.error("Failed to load product lookup");
    } finally {
      setIsLoading(false);
    }
  }, [productSearch]);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const ordersResult = await outwardOrdersApi.getPaged({
        search: searchTerm,
        status: statusFilter,
        page,
        pageSize: 25,
      });
      setOrders(ordersResult.data);
      setPagination(ordersResult.pagination);
    } catch {
      toast.error("Failed to load outward orders");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.id),
        label: `${product.sku || "NO-SKU"} - ${product.name}`,
      })),
    [products],
  );

  const metrics = useMemo(() => {
    const total = pagination?.total ?? orders.length;
    const open = orders.filter((row) => row.status === "Open").length;
    const packed = orders.filter((row) => row.status === "Packed").length;
    const dispatched = orders.filter((row) => row.status === "Dispatched").length;
    return { total, open, packed, dispatched };
  }, [orders]);

  const columns: DataTableColumn<OutwardOrder>[] = [
    {
      key: "orderNumber",
      header: "Order No.",
      sortable: true,
      sortAccessor: (row) => row.orderNumber,
      render: (row) => (
        <Text size="11px" ff="monospace" c="cyan.2" fw={700}>
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
      render: (row) => <Text size="xs">{format(new Date(row.orderDate), "dd MMM yyyy")}</Text>,
      width: 120,
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      sortAccessor: (row) => row.customerName,
      render: (row) => <Text size="xs" fw={600}>{row.customerName}</Text>,
      width: 170,
    },
    {
      key: "product",
      header: "Product",
      sortable: true,
      sortAccessor: (row) => row.productName,
      render: (row) => (
        <Stack gap={2}>
          <Text size="xs" fw={600} lineClamp={1}>{row.productName}</Text>
          <Text size="10px" ff="monospace" c="dimmed">{row.skuCode}</Text>
        </Stack>
      ),
      width: 220,
    },
    {
      key: "quantity",
      header: "Order Qty.",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.quantity,
      render: (row) => <Text size="xs" fw={800}>{row.quantity}</Text>,
      width: 90,
    },
    {
      key: "pickedQuantity",
      header: "Picked",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.pickedQuantity,
      render: (row) => (
        <Text size="xs" fw={800} c={row.pendingQuantity === 0 ? "green.3" : "orange.3"}>
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

  const handleCreateOrder = async () => {
    if (!orderForm.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (orderForm.productId <= 0) {
      toast.error("Product is required");
      return;
    }

    if (orderForm.quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    try {
      setIsSaving(true);
      await outwardOrdersApi.create({
        ...orderForm,
        notes: orderForm.notes?.trim() || null,
      });
      toast.success("Outward order created");
      setIsCreateOpen(false);
      setOrderForm(emptyOrderForm());
      await loadOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to create outward order");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OperationsPage
      title="Outward Orders"
      description="Create outward orders, review the live order ledger, and move work into packing and dispatch."
      icon={ArrowUpFromLine}
      hideHeader
    >
      <OperationsPanel
        title="Sales Order Ledger"
        icon={FileText}
        description="Live outward orders."
        contentClassName="p-0"
        action={
          <Group gap="xs" wrap="nowrap">
            <Badge size="sm" radius="md" variant="light" color="gray">
              {metrics.total} Orders
            </Badge>
            <Badge size="sm" radius="md" variant="light" color="orange">
              {metrics.open} Open
            </Badge>
            <Badge size="sm" radius="md" variant="light" color="blue">
              {metrics.packed} Packed
            </Badge>
            <Badge size="sm" radius="md" variant="light" color="green">
              {metrics.dispatched} Dispatched
            </Badge>
            <SegmentedControl
              size="xs"
              radius="md"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as OutwardStatusFilter)}
              data={[
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "packed", label: "Packed" },
                { value: "dispatched", label: "Done" },
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
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsCreateOpen(true)}
            >
              New Order
            </Button>
          </Group>
        }
      >
        <MantineDataTable
          data={orders}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          pageSize={pagination?.pageSize ?? 25}
          currentPage={pagination?.page ?? page}
          totalItems={pagination?.total}
          onPageChange={setPage}
          itemLabel="orders"
          resetPageKey={`${searchTerm}-${statusFilter}`}
          emptyIcon={FileText}
          emptyTitle="No outward orders"
          emptyDescription="Create an outward order to start the outbound workflow."
        />
      </OperationsPanel>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Outward Order"
        size="lg"
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
          <Select
            label="Product"
            searchable
            data={productOptions}
            searchValue={productSearch}
            onSearchChange={setProductSearch}
            value={orderForm.productId > 0 ? String(orderForm.productId) : null}
            onChange={(value) =>
              setOrderForm((current) => ({
                ...current,
                productId: value ? Number(value) : 0,
              }))
            }
          />
          <TextInput
            label="Quantity"
            type="number"
            min={1}
            value={String(orderForm.quantity)}
            onChange={(event) => {
              const { value } = event.currentTarget;
              setOrderForm((current) => ({
                ...current,
                quantity: Number(value || 0),
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
      </Modal>
    </OperationsPage>
  );
});

export default Outward;
