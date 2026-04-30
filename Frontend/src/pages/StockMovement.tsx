import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  History,
  Move,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Box,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import confetti from "canvas-confetti";

import { Button } from "../components/atoms/Button";
import { Badge } from "../components/atoms/Badge";
import { Input } from "../components/atoms/Input";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  DataTableColumn,
  MantineDataTable,
} from "../components/molecules/MantineDataTable";
import {
  CreateStockAdjustmentDto,
  Product,
  ProductQuantityRecord,
  ProductStockMovementRecord,
  productQuantitiesApi,
  productsApi,
} from "../services/masterApi";
import { toast } from "../lib/toast";

type StockLedgerRow = {
  productId: number;
  skuCode: string;
  productName: string;
  currentQuantity: number;
  updatedAt: string | null;
  hasQuantityRow: boolean;
};

const adjustmentReasonOptions = [
  { value: "Manual Reconciliation", label: "Manual Reconciliation" },
  { value: "Damage / Spoilage", label: "Damage / Spoilage" },
  { value: "Loss / Theft", label: "Loss / Theft" },
  { value: "Found Inventory", label: "Found Inventory" },
  { value: "Cycle Count Correction", label: "Cycle Count Correction" },
  { value: "Warehouse Correction", label: "Warehouse Correction" },
];

const emptyAdjustmentForm: CreateStockAdjustmentDto = {
  productId: 0,
  quantityChange: 0,
  reason: "Manual Reconciliation",
  notes: "",
};

export const StockMovement = memo(function StockMovement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [movements, setMovements] = useState<ProductStockMovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [adjustmentForm, setAdjustmentForm] =
    useState<CreateStockAdjustmentDto>(emptyAdjustmentForm);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [productsData, quantityData, movementData] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
        productQuantitiesApi.getMovements(),
      ]);

      setProducts(productsData);
      setQuantityRows(quantityData);
      setMovements(movementData);
    } catch {
      toast.error("Failed to load stock movement data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refreshMovements = useCallback(async () => {
    try {
      const movementData = await productQuantitiesApi.getMovements(historySearch);
      setMovements(movementData);
    } catch {
      toast.error("Failed to refresh movement history");
    }
  }, [historySearch]);

  useEffect(() => {
    void refreshMovements();
  }, [refreshMovements]);

  const ledgerRows = useMemo<StockLedgerRow[]>(() => {
    return products
      .map((product) => {
        const quantityRow =
          quantityRows.find((row) => row.productId === product.id) ?? null;

        return {
          productId: product.id,
          skuCode: product.sku || "NO-SKU",
          productName: product.name,
          currentQuantity: quantityRow?.currentQuantity ?? 0,
          updatedAt: quantityRow?.updatedAt ?? null,
          hasQuantityRow: Boolean(quantityRow),
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [products, quantityRows]);

  const filteredLedgerRows = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return ledgerRows;
    }

    return ledgerRows.filter(
      (row) =>
        row.skuCode.toLowerCase().includes(normalized) ||
        row.productName.toLowerCase().includes(normalized),
    );
  }, [ledgerRows, searchTerm]);

  const selectedLedgerRow = useMemo(
    () =>
      ledgerRows.find((row) => row.productId === adjustmentForm.productId) ?? null,
    [adjustmentForm.productId, ledgerRows],
  );

  const projectedQuantity = useMemo(() => {
    if (!selectedLedgerRow) {
      return null;
    }

    return selectedLedgerRow.currentQuantity + adjustmentForm.quantityChange;
  }, [adjustmentForm.quantityChange, selectedLedgerRow]);

  const movementStats = useMemo(() => {
    const increases = movements.filter((row) => row.quantityChange > 0).length;
    const decreases = movements.filter((row) => row.quantityChange < 0).length;
    const totalOnHand = quantityRows.reduce(
      (sum, row) => sum + row.currentQuantity,
      0,
    );

    return {
      increases,
      decreases,
      totalOnHand,
    };
  }, [movements, quantityRows]);

  const productOptions = useMemo(
    () =>
      ledgerRows.map((row) => ({
        value: String(row.productId),
        label: `${row.skuCode} - ${row.productName}`,
      })),
    [ledgerRows],
  );

  const ledgerColumns: DataTableColumn<StockLedgerRow>[] = [
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      sortAccessor: (row) => row.skuCode,
      render: (row) => (
        <Text size="11px" ff="monospace" fw={700} c="cyan.2">
          {row.skuCode}
        </Text>
      ),
      width: 140,
    },
    {
      key: "product",
      header: "Product",
      sortable: true,
      sortAccessor: (row) => row.productName,
      render: (row) => (
        <Text size="xs" fw={600} lineClamp={1}>
          {row.productName}
        </Text>
      ),
      width: 220,
    },
    {
      key: "qty",
      header: "Current Qty.",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.currentQuantity,
      render: (row) => (
        <Text size="xs" fw={800} c={row.currentQuantity > 0 ? "green.3" : "gray.4"}>
          {row.currentQuantity}
        </Text>
      ),
      width: 110,
    },
    {
      key: "row",
      header: "Quantity Row",
      sortable: true,
      sortAccessor: (row) => (row.hasQuantityRow ? "1" : "0"),
      render: (row) => (
        <Badge size="sm" radius="md" variant={row.hasQuantityRow ? "success" : "default"}>
          {row.hasQuantityRow ? "Live" : "Pending"}
        </Badge>
      ),
      width: 120,
    },
    {
      key: "updated",
      header: "Last Updated",
      sortable: true,
      sortAccessor: (row) => row.updatedAt ?? "",
      render: (row) => (
        <Text size="xs" c="dimmed">
          {row.updatedAt
            ? format(new Date(row.updatedAt), "dd MMM yyyy HH:mm")
            : "Not created"}
        </Text>
      ),
      width: 150,
    },
  ];

  const movementColumns: DataTableColumn<ProductStockMovementRecord>[] = [
    {
      key: "time",
      header: "Posted At",
      sortable: true,
      sortAccessor: (row) => row.createdAt,
      render: (row) => (
        <Text size="xs" fw={600}>
          {format(new Date(row.createdAt), "dd MMM yyyy HH:mm")}
        </Text>
      ),
      width: 150,
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      sortAccessor: (row) => row.skuCode,
      render: (row) => (
        <Text size="11px" ff="monospace" fw={700} c="cyan.2">
          {row.skuCode}
        </Text>
      ),
      width: 140,
    },
    {
      key: "product",
      header: "Product",
      sortable: true,
      sortAccessor: (row) => row.productName,
      render: (row) => (
        <Text size="xs" fw={600} lineClamp={1}>
          {row.productName}
        </Text>
      ),
      width: 220,
    },
    {
      key: "change",
      header: "Delta",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.quantityChange,
      render: (row) => (
        <Text
          size="xs"
          fw={800}
          c={row.quantityChange > 0 ? "green.3" : "red.3"}
        >
          {row.quantityChange > 0 ? "+" : ""}
          {row.quantityChange}
        </Text>
      ),
      width: 90,
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.quantityAfter,
      render: (row) => (
        <Text size="xs" fw={700}>
          {row.quantityBefore} {"->"} {row.quantityAfter}
        </Text>
      ),
      width: 110,
    },
    {
      key: "reason",
      header: "Reason",
      sortable: true,
      sortAccessor: (row) => row.reason,
      render: (row) => (
        <Text size="xs" lineClamp={1}>
          {row.reason}
        </Text>
      ),
      width: 160,
    },
    {
      key: "by",
      header: "Posted By",
      sortable: true,
      sortAccessor: (row) => row.performedByName ?? "",
      render: (row) => (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {row.performedByName || "System User"}
        </Text>
      ),
      width: 140,
    },
  ];

  const handleAdjust = async (event: React.FormEvent) => {
    event.preventDefault();

    if (adjustmentForm.productId <= 0) {
      toast.error("Select a product first");
      return;
    }

    if (adjustmentForm.quantityChange === 0) {
      toast.error("Quantity change cannot be zero");
      return;
    }

    if (!adjustmentForm.reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    if (projectedQuantity !== null && projectedQuantity < 0) {
      toast.error("This adjustment would reduce stock below zero");
      return;
    }

    try {
      setIsSaving(true);
      const result = await productQuantitiesApi.adjust({
        productId: adjustmentForm.productId,
        quantityChange: adjustmentForm.quantityChange,
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes?.trim() || null,
      });

      await loadData();
      await refreshMovements();

      confetti({
        particleCount: 80,
        spread: 45,
        origin: { y: 0.65, x: 0.25 },
        colors:
          result.movement.quantityChange > 0
            ? ["#10b981", "#4E8EA2"]
            : ["#ef4444", "#f59e0b"],
      });

      toast.success(
        `Stock updated for ${result.movement.skuCode} (${result.movement.quantityChange > 0 ? "+" : ""}${result.movement.quantityChange})`,
      );

      setAdjustmentForm(emptyAdjustmentForm);
    } catch (error: any) {
      toast.error(error.message || "Failed to post stock adjustment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OperationsPage
      title="Stock Movements"
      description="Post live quantity adjustments, review current on-hand stock, and keep a clean movement trail from the warehouse floor."
      icon={ArrowRightLeft}
      hideHeader
      metrics={[
        { label: "Live Quantity Rows", value: quantityRows.length, tone: "brand" },
        { label: "Total On Hand", value: movementStats.totalOnHand, tone: "success" },
        { label: "Movement Entries", value: movements.length, tone: "default" },
      ]}
    >
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        <OperationsPanel
          title="Post Adjustment"
          icon={Move}
          className="lg:col-span-4 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin space-y-4"
        >
          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="space-y-1.5">
              <Text size="10px" fw={800} c="dimmed">
                PRODUCT
              </Text>
              <Select
                size="sm"
                radius="md"
                searchable
                placeholder="Select SKU / Product"
                data={productOptions}
                value={
                  adjustmentForm.productId > 0
                    ? String(adjustmentForm.productId)
                    : null
                }
                onChange={(value) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    productId: value ? Number(value) : 0,
                  }))
                }
                nothingFoundMessage="No product found"
              />
            </div>

            <div className="space-y-1.5">
              <Text size="10px" fw={800} c="dimmed">
                QUANTITY DELTA
              </Text>
              <Input
                type="number"
                size="sm"
                placeholder="Use + for increase, - for decrease"
                value={
                  adjustmentForm.quantityChange === 0
                    ? ""
                    : adjustmentForm.quantityChange
                }
                onChange={(event) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    quantityChange: event.target.value
                      ? Number(event.target.value)
                      : 0,
                  }))
                }
                leftElement={
                  adjustmentForm.quantityChange > 0 ? (
                    <ArrowUpRight size={14} />
                  ) : adjustmentForm.quantityChange < 0 ? (
                    <ArrowDownRight size={14} />
                  ) : undefined
                }
                className="font-mono font-bold"
                fullWidth
              />
            </div>

            <div className="space-y-1.5">
              <Text size="10px" fw={800} c="dimmed">
                REASON
              </Text>
              <Select
                size="sm"
                radius="md"
                data={adjustmentReasonOptions}
                value={adjustmentForm.reason}
                onChange={(value) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    reason: value || current.reason,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Text size="10px" fw={800} c="dimmed">
                NOTES
              </Text>
              <TextInput
                size="sm"
                radius="md"
                placeholder="Optional remark for audit trail"
                value={adjustmentForm.notes || ""}
                onChange={(event) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    notes: event.currentTarget.value,
                  }))
                }
              />
            </div>

            <SimpleGrid cols={2} spacing="sm">
              <Paper radius="lg" p="sm" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed">
                  CURRENT QTY.
                </Text>
                <Text mt={6} size="lg" fw={800} ff="monospace">
                  {selectedLedgerRow?.currentQuantity ?? "-"}
                </Text>
              </Paper>
              <Paper radius="lg" p="sm" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed">
                  PROJECTED QTY.
                </Text>
                <Text
                  mt={6}
                  size="lg"
                  fw={800}
                  ff="monospace"
                  c={
                    projectedQuantity == null
                      ? "white"
                      : projectedQuantity < 0
                        ? "red.3"
                        : "green.3"
                  }
                >
                  {projectedQuantity ?? "-"}
                </Text>
              </Paper>
            </SimpleGrid>

            <Group gap="xs" wrap="nowrap">
              <Button type="submit" size="sm" className="flex-1" loading={isSaving}>
                Post Adjustment
              </Button>
              <Button
                type="button"
                size="sm"
                variant="subtle"
                onClick={() => setAdjustmentForm(emptyAdjustmentForm)}
              >
                Clear
              </Button>
            </Group>
          </form>

          <Paper
            radius="lg"
            p="sm"
            withBorder
            bg="rgba(245, 158, 11, 0.06)"
            style={{ borderColor: "rgba(245, 158, 11, 0.16)" }}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <AlertCircle size={16} color="var(--mantine-color-yellow-4)" />
              <Text size="xs" c="dimmed">
                Manual adjustments update the live quantity row immediately and write a movement entry for audit.
              </Text>
            </Group>
          </Paper>
        </OperationsPanel>

        <div className="lg:col-span-8 grid grid-cols-1 gap-3 min-h-0">
          <OperationsPanel
            title="Live Quantity Ledger"
            icon={RefreshCw}
            className="flex flex-col overflow-hidden"
            contentClassName="overflow-y-auto scrollbar-thin p-0"
            action={
              <Group gap="xs" wrap="nowrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500" />
                  <Input
                    type="text"
                    placeholder="Filter SKU or product"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 h-7 w-52 text-[10px] rounded-md"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[10px]"
                  onClick={() => void loadData()}
                  loading={isLoading}
                >
                  Refresh
                </Button>
              </Group>
            }
          >
            <MantineDataTable
              data={filteredLedgerRows}
              columns={ledgerColumns}
              rowKey={(row) => row.productId}
              isLoading={isLoading}
              pageSize={8}
              itemLabel="products"
              resetPageKey={searchTerm}
              minWidth={760}
              emptyIcon={RefreshCw}
              emptyTitle="No stock rows"
              emptyDescription="Products and quantity rows will appear here once inventory is available."
            />
          </OperationsPanel>

          <OperationsPanel
            title="Movement History"
            icon={History}
            className="flex flex-col overflow-hidden"
            contentClassName="overflow-y-auto scrollbar-thin p-0"
            action={
              <Box style={{ minWidth: 220 }}>
                <Input
                  type="text"
                  placeholder="Search history"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  leftElement={<Search size={12} />}
                  className="h-7 text-[10px] rounded-md"
                  fullWidth
                />
              </Box>
            }
          >
            <SimpleGrid cols={3} spacing="sm" className="p-3 pb-0">
              <Paper radius="lg" p="sm" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed">
                  INCREASES
                </Text>
                <Text mt={6} size="lg" fw={800} c="green.3">
                  {movementStats.increases}
                </Text>
              </Paper>
              <Paper radius="lg" p="sm" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed">
                  DECREASES
                </Text>
                <Text mt={6} size="lg" fw={800} c="red.3">
                  {movementStats.decreases}
                </Text>
              </Paper>
              <Paper radius="lg" p="sm" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed">
                  ENTRIES
                </Text>
                <Text mt={6} size="lg" fw={800}>
                  {movements.length}
                </Text>
              </Paper>
            </SimpleGrid>

            <MantineDataTable
              data={movements}
              columns={movementColumns}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              pageSize={8}
              itemLabel="movements"
              resetPageKey={historySearch}
              minWidth={920}
              emptyIcon={History}
              emptyTitle="No movement history"
              emptyDescription="Stock adjustments will create audit entries here."
            />
          </OperationsPanel>
        </div>
      </div>
    </OperationsPage>
  );
});

export default StockMovement;
