import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  ActionIcon,
  Badge,
  Box,
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
  Download,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Search,
  Truck,
  Users,
} from "lucide-react";

import { Button } from "../components/atoms/Button";
import { Modal } from "../components/atoms/Modal";
import {
  DataTableColumn,
  MantineDataTable,
} from "../components/molecules/MantineDataTable";
import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  CreateOutwardOrderDto,
  OutwardOrder,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OutwardStatusFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [orderForm, setOrderForm] = useState<CreateOutwardOrderDto>(emptyOrderForm());
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersData, productsData] = await Promise.all([
        outwardOrdersApi.getAll({
          search: searchTerm,
          status: statusFilter,
        }),
        productsApi.getAll(),
      ]);
      setOrders(ordersData);
      setProducts(productsData);
    } catch {
      toast.error("Failed to load outward orders");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.id),
        label: `${product.sku || "NO-SKU"} - ${product.name}`,
      })),
    [products],
  );

  const metrics = useMemo(() => {
    const total = orders.length;
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
      await loadData();
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
      actions={
        <Group gap="xs">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadData()}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            New Order
          </Button>
        </Group>
      }
      metrics={[
        { label: "Total Orders", value: metrics.total },
        { label: "Open Orders", value: metrics.open, tone: "warning" },
        { label: "Packed Orders", value: metrics.packed, tone: "brand" },
        { label: "Dispatched", value: metrics.dispatched, tone: "success" },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <OperationsPanel
          title="Sales Order Ledger"
          icon={FileText}
          description="Live outward orders stored in the database."
          contentClassName="p-0"
          action={
            <Group gap="xs" wrap="nowrap">
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
            </Group>
          }
        >
          <MantineDataTable
            data={orders}
            columns={columns}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            itemLabel="orders"
            resetPageKey={`${searchTerm}-${statusFilter}`}
            emptyIcon={FileText}
            emptyTitle="No outward orders"
            emptyDescription="Create an outward order to start the outbound workflow."
          />
        </OperationsPanel>

        <div className="grid gap-4">
          <OperationsPanel
            title="Workflow"
            icon={Package}
            description="Move live outward work into the next operation stage."
          >
            <div className="space-y-3">
              <button
                onClick={() => navigate("/packing")}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-brand-500/30 hover:bg-brand-500/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Picking & Packing</p>
                    <p className="mt-1 text-xs text-neutral-400">Pick open orders and prepare packed cartons.</p>
                  </div>
                  <Package className="h-4 w-4 text-brand-400" />
                </div>
              </button>

              <button
                onClick={() => navigate("/dispatch")}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-brand-500/30 hover:bg-brand-500/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Dispatch</p>
                    <p className="mt-1 text-xs text-neutral-400">Dispatch packed orders and deduct stock from the DB.</p>
                  </div>
                  <Truck className="h-4 w-4 text-brand-400" />
                </div>
              </button>
            </div>
          </OperationsPanel>

          <OperationsPanel
            title="Queue Snapshot"
            icon={Users}
            description="Latest outward activity from the live order queue."
          >
            {orders.length > 0 ? (
              <div className="space-y-3">
                {orders.slice(0, 5).map((row) => {
                  const tone = statusTone(row.status);
                  return (
                    <div key={row.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{row.customerName}</p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {row.orderNumber} · {row.skuCode}
                          </p>
                        </div>
                        <Badge variant="light" color={tone.color}>
                          {tone.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <OperationsEmptyState
                icon={Download}
                title="No outward orders"
                description="Create a new order to start outward processing."
                action={
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setIsCreateOpen(true)}
                  >
                    New Order
                  </Button>
                }
              />
            )}
          </OperationsPanel>
        </div>
      </div>

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
            onChange={(event) =>
              setOrderForm((current) => ({
                ...current,
                orderDate: event.currentTarget.value,
              }))
            }
          />
          <TextInput
            label="Customer Name"
            value={orderForm.customerName}
            onChange={(event) =>
              setOrderForm((current) => ({
                ...current,
                customerName: event.currentTarget.value,
              }))
            }
          />
          <Select
            label="Product"
            searchable
            data={productOptions}
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
            onChange={(event) =>
              setOrderForm((current) => ({
                ...current,
                quantity: Number(event.currentTarget.value || 0),
              }))
            }
          />
          <TextInput
            label="Notes"
            value={orderForm.notes || ""}
            onChange={(event) =>
              setOrderForm((current) => ({
                ...current,
                notes: event.currentTarget.value,
              }))
            }
            className="md:col-span-2"
          />
        </SimpleGrid>
      </Modal>
    </OperationsPage>
  );
});

export default Outward;
