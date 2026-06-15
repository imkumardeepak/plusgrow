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
  SegmentedControl,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
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
  ProductAllottedLocationRecord,
  ProductQuantityRecord,
  ProductStockMovementRecord,
  productAllottedLocationsApi,
  productQuantitiesApi,
  productsApi,
} from "../services/masterApi";
import { toast } from "../lib/toast";

type StockLedgerRow = {
  productId: number;
  skuCode: string;
  alias: string;
  productName: string;
  currentQuantity: number;
  updatedAt: string | null;
  hasQuantityRow: boolean;
};

const formatStockProductLabel = (row: StockLedgerRow) =>
  row.alias
    ? `${row.skuCode} / ${row.alias} - ${row.productName}`
    : `${row.skuCode} - ${row.productName}`;

const normalizeScanCode = (value: string) => value.trim().toUpperCase();

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
  locationCode: "",
  quantityChange: 0,
  reason: "Manual Reconciliation",
  notes: "",
};

export const StockMovement = memo(function StockMovement() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [activeTab, setActiveTab] = useState<"adjust" | "ledger" | "history">(
    "adjust",
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [allottedLocations, setAllottedLocations] = useState<
    ProductAllottedLocationRecord[]
  >([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [movements, setMovements] = useState<ProductStockMovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [adjustmentForm, setAdjustmentForm] =
    useState<CreateStockAdjustmentDto>(emptyAdjustmentForm);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [productsData, allottedData, quantityData, movementData] =
        await Promise.all([
          productsApi.getAll(),
          productAllottedLocationsApi.getAll(),
          productQuantitiesApi.getAll(),
          productQuantitiesApi.getMovements(),
        ]);

      setProducts(productsData);
      setAllottedLocations(allottedData);
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
          alias: product.alias || "",
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
        row.alias.toLowerCase().includes(normalized) ||
        row.productName.toLowerCase().includes(normalized),
    );
  }, [ledgerRows, searchTerm]);

  const selectedLedgerRow = useMemo(
    () =>
      ledgerRows.find((row) => row.productId === adjustmentForm.productId) ?? null,
    [adjustmentForm.productId, ledgerRows],
  );

  const selectedAllottedLocation = useMemo(
    () =>
      allottedLocations.find(
        (row) => row.productId === adjustmentForm.productId,
      ) ?? null,
    [adjustmentForm.productId, allottedLocations],
  );

  const selectedLocationQuantity = useMemo(() => {
    if (!adjustmentForm.locationCode || !selectedAllottedLocation) {
      return 0;
    }

    return selectedAllottedLocation.locationJson[adjustmentForm.locationCode] ?? 0;
  }, [adjustmentForm.locationCode, selectedAllottedLocation]);

  const projectedQuantity = useMemo(() => {
    if (!selectedLedgerRow) {
      return null;
    }

    return selectedLedgerRow.currentQuantity + adjustmentForm.quantityChange;
  }, [adjustmentForm.quantityChange, selectedLedgerRow]);

  const projectedLocationQuantity = useMemo(() => {
    if (!adjustmentForm.locationCode) {
      return null;
    }

    return selectedLocationQuantity + adjustmentForm.quantityChange;
  }, [
    adjustmentForm.locationCode,
    adjustmentForm.quantityChange,
    selectedLocationQuantity,
  ]);

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
        label: formatStockProductLabel(row),
      })),
    [ledgerRows],
  );

  const selectAdjustmentProduct = useCallback(
    (productId: number) => {
      const row = ledgerRows.find((item) => item.productId === productId) ?? null;

      setAdjustmentForm((current) => ({
        ...current,
        productId: row ? productId : 0,
        locationCode: "",
      }));
      setProductSearch(row ? formatStockProductLabel(row) : "");
    },
    [ledgerRows],
  );

  const handleProductSearchChange = useCallback(
    (value: string) => {
      setProductSearch(value);

      const normalized = normalizeScanCode(value.split("#")[0]);
      if (!normalized) return;

      const matchedRow = ledgerRows.find(
        (row) =>
          normalizeScanCode(row.skuCode) === normalized ||
          normalizeScanCode(row.alias) === normalized ||
          normalizeScanCode(row.productName) === normalized,
      );

      if (matchedRow) {
        selectAdjustmentProduct(matchedRow.productId);
      }
    },
    [ledgerRows, selectAdjustmentProduct],
  );

  const locationOptions = useMemo(
    () => {
      if (!selectedAllottedLocation) {
        return [];
      }

      return Object.entries(selectedAllottedLocation.locationJson || {})
        .sort(([firstLocation], [secondLocation]) =>
          firstLocation.localeCompare(secondLocation),
        )
        .map(([locationCode, quantity]) => ({
          value: locationCode,
          label: `${locationCode} - Qty ${quantity}`,
        }));
    },
    [selectedAllottedLocation],
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

    if (!adjustmentForm.locationCode.trim()) {
      toast.error("Select location first");
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

    if (
      projectedLocationQuantity !== null &&
      projectedLocationQuantity < 0
    ) {
      toast.error(
        `This adjustment would reduce ${adjustmentForm.locationCode} below zero`,
      );
      return;
    }

    try {
      setIsSaving(true);
      const result = await productQuantitiesApi.adjust({
        productId: adjustmentForm.productId,
        locationCode: adjustmentForm.locationCode,
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
      setProductSearch("");
    } catch (error: any) {
      toast.error(error.message || "Failed to post stock adjustment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OperationsPage
      title="Stock Movements"
      description="Post quantity adjustments, review on-hand stock, and keep a clean movement trail."
      icon={ArrowRightLeft}
      hideHeader
      metrics={[
        { label: "Live Quantity Rows", value: quantityRows.length, tone: "brand" },
        { label: "Total On Hand", value: movementStats.totalOnHand, tone: "success" },
        { label: "Movement Entries", value: movements.length, tone: "default" },
      ]}
    >
      {isMobile && (
        <div className="mb-2">
          <SegmentedControl
            fullWidth
            value={activeTab}
            onChange={(value) => setActiveTab(value as any)}
            data={[
              { label: "Adjust Stock", value: "adjust" },
              { label: "Stock Ledger", value: "ledger" },
              { label: "History", value: "history" },
            ]}
            color="cyan"
            radius="md"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {(!isMobile || activeTab === "adjust") && (
          <OperationsPanel
            title="Filters"
            icon={Move}
            description="Select product, location, and quantity delta to post a movement."
            hideHeader={isMobile}
          >
            <form onSubmit={handleAdjust} className="space-y-4">
              <SimpleGrid cols={{ base: 1, md: 2, xl: 5 }} spacing="md">
                <Box>
                  <Text size="10px" fw={800} c="dimmed" mb={5}>
                    PRODUCT
                  </Text>
                  <Select
                    size="sm"
                    radius="md"
                    searchable
                    placeholder="Select SKU / Product"
                    data={productOptions}
                    searchValue={productSearch}
                    onSearchChange={handleProductSearchChange}
                    value={
                      adjustmentForm.productId > 0
                        ? String(adjustmentForm.productId)
                        : null
                    }
                    onChange={(value) =>
                      selectAdjustmentProduct(value ? Number(value) : 0)
                    }
                    nothingFoundMessage="No product found"
                  />
                </Box>

                <Box>
                  <Text size="10px" fw={800} c="dimmed" mb={5}>
                    LOCATION
                  </Text>
                  <Select
                    size="sm"
                    radius="md"
                    searchable
                    placeholder={
                      adjustmentForm.productId > 0
                        ? "Select allotted location"
                        : "Select product first"
                    }
                    data={locationOptions}
                    value={adjustmentForm.locationCode || null}
                    onChange={(value) =>
                      setAdjustmentForm((current) => ({
                        ...current,
                        locationCode: value || "",
                      }))
                    }
                    disabled={
                      adjustmentForm.productId <= 0 || locationOptions.length === 0
                    }
                    nothingFoundMessage="No allotted location found"
                  />
                </Box>

                <Box>
                  <Text size="10px" fw={800} c="dimmed" mb={5}>
                    QUANTITY DELTA
                  </Text>
                  <Input
                    type="number"
                    size="sm"
                    placeholder="Use + or -"
                    value={
                      adjustmentForm.quantityChange === 0
                        ? ""
                        : adjustmentForm.quantityChange
                    }
                    onChange={(event) => {
                      const quantityValue = event.target.value;
                      setAdjustmentForm((current) => ({
                        ...current,
                        quantityChange: quantityValue ? Number(quantityValue) : 0,
                      }));
                    }}
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
                </Box>

                <Box>
                  <Text size="10px" fw={800} c="dimmed" mb={5}>
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
                </Box>

                <Box>
                  <Text size="10px" fw={800} c="dimmed" mb={5}>
                    NOTES
                  </Text>
                  <TextInput
                    size="sm"
                    radius="md"
                    placeholder="Optional remark"
                    value={adjustmentForm.notes || ""}
                    onChange={(event) => {
                      const notes = event.currentTarget.value;
                      setAdjustmentForm((current) => ({
                        ...current,
                        notes,
                      }));
                    }}
                  />
                </Box>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
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
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed">
                    LOCATION QTY.
                  </Text>
                  <Text mt={6} size="lg" fw={800} ff="monospace">
                    {adjustmentForm.locationCode ? selectedLocationQuantity : "-"}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed">
                    LOCATION AFTER
                  </Text>
                  <Text
                    mt={6}
                    size="lg"
                    fw={800}
                    ff="monospace"
                    c={
                      projectedLocationQuantity == null
                        ? "white"
                        : projectedLocationQuantity < 0
                          ? "red.3"
                          : "green.3"
                    }
                  >
                    {projectedLocationQuantity ?? "-"}
                  </Text>
                </Paper>
              </SimpleGrid>

              <div className={isMobile ? "space-y-3" : "flex items-center justify-between gap-4"}>
                <Paper
                  radius="lg"
                  p="sm"
                  withBorder
                  bg="rgba(245, 158, 11, 0.06)"
                  style={{ borderColor: "rgba(245, 158, 11, 0.16)", flex: 1 }}
                >
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <AlertCircle size={16} color="var(--mantine-color-yellow-4)" />
                    <Text size="xs" c="dimmed">
                      Manual adjustments update live quantity immediately and create an audit entry.
                    </Text>
                  </Group>
                </Paper>
                <div className={`flex gap-2 ${isMobile ? "justify-stretch" : "justify-end"}`}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAdjustmentForm(emptyAdjustmentForm);
                      setProductSearch("");
                    }}
                    className={isMobile ? "flex-1" : ""}
                  >
                    Clear
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    loading={isSaving}
                    className={isMobile ? "flex-1" : ""}
                  >
                    Post Adjustment
                  </Button>
                </div>
              </div>
            </form>
          </OperationsPanel>
        )}

        {(!isMobile || activeTab === "ledger") && (
          <OperationsPanel
            title="Stock Ledger"
            icon={RefreshCw}
            description="Compact live quantity view by SKU with current stock and row status."
            hideHeader={isMobile}
            action={
              <Group gap="xs" wrap="nowrap">
                <Badge size="sm" radius="md" variant="default">
                  {filteredLedgerRows.length} Rows
                </Badge>
                <Badge size="sm" radius="md" variant="success">
                  {quantityRows.length} Live
                </Badge>
                <Badge size="sm" radius="md" variant="info">
                  {movementStats.totalOnHand} On Hand
                </Badge>
                <TextInput
                  size="xs"
                  radius="md"
                  w={240}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  placeholder="Search SKU or product..."
                  leftSection={<Search size={14} />}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadData()}
                  loading={isLoading}
                >
                  Refresh
                </Button>
              </Group>
            }
            contentClassName="p-0"
          >
            {isMobile && (
              <div className="p-3 border-b border-white/5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge size="sm" radius="md" variant="default">
                    {filteredLedgerRows.length} Rows
                  </Badge>
                  <Badge size="sm" radius="md" variant="success">
                    {quantityRows.length} Live
                  </Badge>
                  <Badge size="sm" radius="md" variant="info">
                    {movementStats.totalOnHand} On Hand
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <TextInput
                    size="xs"
                    radius="md"
                    className="flex-1"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.currentTarget.value)}
                    placeholder="Search SKU or product..."
                    leftSection={<Search size={14} />}
                  />
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => void loadData()}
                    loading={isLoading}
                    className="h-8"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            )}

            <MantineDataTable
              data={filteredLedgerRows}
              columns={ledgerColumns}
              rowKey={(row) => row.productId}
              isLoading={isLoading}
              pageSize={10}
              itemLabel="products"
              resetPageKey={searchTerm}
              emptyIcon={RefreshCw}
              emptyTitle="No stock rows"
              emptyDescription="Products and quantity rows will appear here once inventory is available."
            />
          </OperationsPanel>
        )}

        {(!isMobile || activeTab === "history") && (
          <OperationsPanel
            title="Movement History"
            icon={History}
            description="Compact audit trail for stock increases and decreases."
            hideHeader={isMobile}
            action={
              <Group gap="xs" wrap="nowrap">
                <Badge size="sm" radius="md" variant="success">
                  {movementStats.increases} Increases
                </Badge>
                <Badge size="sm" radius="md" variant="danger">
                  {movementStats.decreases} Decreases
                </Badge>
                <Badge size="sm" radius="md" variant="default">
                  {movements.length} Entries
                </Badge>
                <TextInput
                  size="xs"
                  radius="md"
                  w={240}
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.currentTarget.value)}
                  placeholder="Search history..."
                  leftSection={<Search size={14} />}
                />
              </Group>
            }
            contentClassName="p-0"
          >
            {isMobile && (
              <div className="p-3 border-b border-white/5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge size="sm" radius="md" variant="success">
                    {movementStats.increases} Increases
                  </Badge>
                  <Badge size="sm" radius="md" variant="danger">
                    {movementStats.decreases} Decreases
                  </Badge>
                  <Badge size="sm" radius="md" variant="default">
                    {movements.length} Entries
                  </Badge>
                </div>
                <TextInput
                  size="xs"
                  radius="md"
                  fullWidth
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.currentTarget.value)}
                  placeholder="Search history..."
                  leftSection={<Search size={14} />}
                />
              </div>
            )}

            <MantineDataTable
              data={movements}
              columns={movementColumns}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              pageSize={10}
              itemLabel="movements"
              resetPageKey={historySearch}
              minWidth={isMobile ? 700 : 920}
              emptyIcon={History}
              emptyTitle="No movement history"
              emptyDescription="Stock adjustments will create audit entries here."
            />
          </OperationsPanel>
        )}
      </div>
    </OperationsPage>
  );
});

export default StockMovement;
