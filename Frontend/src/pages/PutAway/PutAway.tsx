import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  ArrowRight,
  CheckCircle2,
  Eraser,
  Eye,
  MapPin,
  Package,
  RotateCcw,
  ScanLine,
  Warehouse,
} from "lucide-react";
import { toast } from "../../lib/toast";

import { Button } from "../../components/atoms/Button";
import { Input } from "../../components/atoms/Input";
import {
  OperationsPage,
  OperationsPanel,
} from "../../components/organisms/Operations/OperationsShell";
import {
  ProductAllottedLocationRecord,
  PoInvoice,
  ProductQuantityRecord,
  PutAwayScanAssignmentResult,
  poInvoicesApi,
  productAllottedLocationsApi,
  productQuantitiesApi,
  productsApi,
  Product,
  StockCheckReport,
  stockCheckReportsApi,
} from "../../services/masterApi";

type PutAwayTask = {
  productId: number;
  skuCode: string;
  productName: string;
  alias?: string;
  cartonQr?: string | null;
  cartonPerItem?: number | null;
  currentQuantity: number;
  allocatedQuantity: number;
  remainingQuantity: number;
  updatedAt: string;
};

const emptyResult: PutAwayScanAssignmentResult | null = null;
const normalizeScanCode = (value: string) =>
  value.trim().split("#")[0].trim().toLowerCase();
const getCartonScanQuantity = (
  scan: string,
  cartonQr?: string | null,
  cartonPerItem?: number | null,
) => {
  const normalizedCartonQr = cartonQr ? normalizeScanCode(cartonQr) : "";
  if (!normalizedCartonQr || normalizeScanCode(scan) !== normalizedCartonQr) return 0;

  return cartonPerItem && cartonPerItem > 0 ? cartonPerItem : 1;
};

const normalizeDateText = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.trim() : parsed.toISOString().slice(0, 10);
};

const isVerificationForInvoice = (report: StockCheckReport, invoice: PoInvoice) => {
  if (report.notes) {
    try {
      const notes = JSON.parse(report.notes) as {
        referenceName?: string;
        partyName?: string;
        invoiceDate?: string;
      };
      if (notes.referenceName && notes.partyName && notes.invoiceDate) {
        return (
          notes.referenceName.trim().toLowerCase() === invoice.invoiceNumber.trim().toLowerCase() &&
          notes.partyName.trim().toLowerCase() === invoice.partyName.trim().toLowerCase() &&
          normalizeDateText(notes.invoiceDate) === normalizeDateText(invoice.invoiceDate)
        );
      }
    } catch {
      // Fall back to legacy referenceName matching.
    }
  }

  return (report.referenceName || "")
    .trim()
    .toLowerCase()
    .startsWith(`${invoice.invoiceNumber} - ${invoice.partyName}`.trim().toLowerCase());
};

const getVerifiedQtyForSku = (report: StockCheckReport, sku?: string | null) => {
  if (!sku) return 0;
  try {
    const items = JSON.parse(report.itemsJson || "[]") as Array<{
      sku?: string;
      scannedQty?: number;
      isUnexpected?: boolean;
    }>;
    const normalizedSku = sku.trim().toUpperCase();
    return items.reduce((sum, item) => {
      if (item.isUnexpected || item.sku?.trim().toUpperCase() !== normalizedSku) return sum;
      return sum + Number(item.scannedQty || 0);
    }, 0);
  } catch {
    return 0;
  }
};

export const PutAway = () => {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuantities, setProductQuantities] = useState<
    ProductQuantityRecord[]
  >([]);
  const [activeInwardRows, setActiveInwardRows] = useState<PoInvoice[]>([]);
  const [inwardVerifyReports, setInwardVerifyReports] = useState<StockCheckReport[]>([]);
  const [allocations, setAllocations] = useState<
    ProductAllottedLocationRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productScanCode, setProductScanCode] = useState("");
  const [locationScanCode, setLocationScanCode] = useState("");
  const [assignQuantity, setAssignQuantity] = useState<number | "">("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [lastAssignment, setLastAssignment] =
    useState<PutAwayScanAssignmentResult | null>(emptyResult);
  const [productError, setProductError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [productsData, quantitiesData, allocationsData, inwardRowsData, verifyReportsData] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
        poInvoicesApi.getAll({ pageSize: 1000 }),
        stockCheckReportsApi.getAll({ checkType: "INWARD_VERIFY", page: 1, pageSize: 1000 }),
      ]);

      setProducts(productsData);
      setProductQuantities(quantitiesData);
      setAllocations(allocationsData);
      setActiveInwardRows(inwardRowsData.filter((row) => row.remainingAllocation > 0));
      setInwardVerifyReports(
        verifyReportsData.data.filter((report) => report.status === "COMPLETED"),
      );
    } catch (error) {
      toast.error("Failed to load put-away data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allTasks = useMemo<PutAwayTask[]>(() => {
    const activeRemainingByProduct = activeInwardRows.reduce((map, row) => {
      map.set(row.productId, (map.get(row.productId) || 0) + Number(row.remainingAllocation || 0));
      return map;
    }, new Map<number, number>());

    const putAwayByProduct = activeInwardRows.reduce((map, row) => {
      const verifiedBaseline = row.verifiedQuantity ?? row.billedQty;
      map.set(row.productId, (map.get(row.productId) || 0) + Math.max(Number(verifiedBaseline || 0) - Number(row.remainingAllocation || 0), 0));
      return map;
    }, new Map<number, number>());

    const verifiedByProduct = activeInwardRows.reduce((map, row) => {
      if (row.verifiedQuantity !== null && row.verifiedQuantity !== undefined) {
        map.set(row.productId, (map.get(row.productId) || 0) + Number(row.verifiedQuantity || 0));
        return map;
      }

      const report = inwardVerifyReports.find((candidate) => isVerificationForInvoice(candidate, row));
      if (!report) return map;
      map.set(row.productId, (map.get(row.productId) || 0) + getVerifiedQtyForSku(report, row.skuCode));
      return map;
    }, new Map<number, number>());

    return productQuantities
      .map((quantityRow) => {
        const product = products.find((item) => item.id === quantityRow.productId);
        const allocationRow = allocations.find(
          (entry) => entry.productId === quantityRow.productId,
        );
        const allocatedQuantity = Object.values(
          (allocationRow?.locationJson || {}) as Record<string, number>,
        ).reduce((sum, qty) => sum + Number(qty), 0);

        const activeInwardRemainingQuantity = activeRemainingByProduct.get(quantityRow.productId) || 0;
        const verifiedRemainingQuantity = Math.max((verifiedByProduct.get(quantityRow.productId) || 0) - (putAwayByProduct.get(quantityRow.productId) || 0), 0);
        const remainingQuantity = Math.max(
          Math.min(quantityRow.currentQuantity - allocatedQuantity, activeInwardRemainingQuantity, verifiedRemainingQuantity),
          0,
        );

        return {
          productId: quantityRow.productId,
          skuCode: product?.sku?.trim() || quantityRow.skuCode,
          productName: product?.name?.trim() || quantityRow.productName,
          alias: product?.alias?.trim() || quantityRow.alias,
          cartonQr: product?.cartonQr?.trim() || null,
          cartonPerItem: product?.cartonPerItem ?? null,
          currentQuantity: quantityRow.currentQuantity,
          allocatedQuantity,
          remainingQuantity,
          updatedAt: quantityRow.updatedAt,
        };
      })
      .filter((task) => task.remainingQuantity > 0)
      .sort((a, b) => b.remainingQuantity - a.remainingQuantity);
  }, [activeInwardRows, allocations, inwardVerifyReports, productQuantities, products]);

  const tasks = allTasks;

  const selectedTask = useMemo(() => {
    if (!productScanCode.trim()) return null;

    const scan = normalizeScanCode(productScanCode);
    return (
      allTasks.find(
        (task) =>
          task.skuCode.trim().toLowerCase() === scan ||
          (task.alias && task.alias.trim().toLowerCase() === scan) ||
          (task.cartonQr && normalizeScanCode(task.cartonQr) === scan) ||
          task.productName.trim().toLowerCase() === scan,
      ) ?? null
    );
  }, [allTasks, productScanCode]);

  useEffect(() => {
    if (!productScanCode.trim()) {
      setProductError(null);
      return;
    }

    if (selectedTask || scannedProduct) {
      setProductError(null);
      return;
    }

    setProductError(
      "SKU not in put-away queue. If product exists in master, stock not ready for put-away yet.",
    );
  }, [productScanCode, scannedProduct, selectedTask]);

  useEffect(() => {
    if (selectedTask && assignQuantity === "") {
      setAssignQuantity(
        selectedTask.remainingQuantity > 0
          ? selectedTask.remainingQuantity
          : "",
      );
    }
  }, [selectedTask]);

  const handleProductScan = async (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter" && productScanCode.trim()) {
      e.preventDefault();

      const scan = normalizeScanCode(productScanCode);
      setProductScanCode(scan);

      // First check in put-away tasks
      const task = allTasks.find(
        (t) =>
          t.skuCode.trim().toLowerCase() === scan ||
          (t.alias && t.alias.trim().toLowerCase() === scan) ||
          (t.cartonQr && normalizeScanCode(t.cartonQr) === scan) ||
          t.productName.trim().toLowerCase() === scan,
      );

      if (task) {
        const cartonQuantity = getCartonScanQuantity(
          productScanCode,
          task.cartonQr,
          task.cartonPerItem,
        );
        setAssignQuantity(
          Math.min(
            cartonQuantity > 0 ? cartonQuantity : task.remainingQuantity,
            task.remainingQuantity,
          ),
        );
        // Found in put-away queue
        setProductError(null);
        setScannedProduct(null);
        // Auto-focus location input
        const locationInput = document.getElementById("location-scan-input");
        if (locationInput) {
          locationInput.focus();
        }
        return;
      }

      // Not in put-away queue, fetch from Product Master
      setIsFetchingProduct(true);
      try {
        const product = products.find(
          (p) =>
            p.sku?.trim().toLowerCase() === scan ||
            p.alias?.trim().toLowerCase() === scan ||
            (p.cartonQr && normalizeScanCode(p.cartonQr) === scan) ||
            p.name.trim().toLowerCase() === scan,
        );

        if (product) {
          setScannedProduct(product);
          setProductError(null);
          toast.success(
            `Found product: ${product.name} (Not in put-away queue)`,
          );
        } else {
          setScannedProduct(null);
          setProductError("Product not found in Product Master");
          toast.error("Product not found in Product Master");
        }
      } catch (error) {
        setProductError("Failed to fetch product details");
        toast.error("Failed to fetch product from master");
      } finally {
        setIsFetchingProduct(false);
      }
    }
  };

  const handleLocationScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && locationScanCode.trim()) {
      e.preventDefault();
      const quantityInput = document.getElementById("putaway-qty-input");
      if (quantityInput) {
        quantityInput.focus();
      }
    }
  };

  const handleAssign = async () => {
    const quantity = Number(assignQuantity);

    if (!productScanCode.trim()) {
      toast.error("Scan or enter product code first");
      return;
    }

    if (!selectedTask) {
      toast.error("Scanned product was not found");
      setProductError("Product not found");
      return;
    }

    if (!locationScanCode.trim()) {
      toast.error("Scan location or bin first");
      setLocationError("Location code required");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter valid quantity");
      return;
    }

    if (selectedTask.remainingQuantity <= 0) {
      toast.error("This product has no pending quantity left for put away");
      return;
    }

    if (quantity > selectedTask.remainingQuantity) {
      toast.error(
        `Only ${selectedTask.remainingQuantity} units are pending for put away`,
      );
      return;
    }

    setIsAssigning(true);
    try {
      const result = await productAllottedLocationsApi.assignScan({
        productScanCode: normalizeScanCode(productScanCode),
        locationOrBinScanCode: locationScanCode.trim(),
        quantity,
      });

      setLastAssignment(result);
      toast.success(
        `Stored ${result.assignedQuantity} units in ${result.resolvedLocationCode}`,
      );
      await loadData();

      setLocationError(null);
      setProductScanCode("");
      setProductError(null);
      setScannedProduct(null);
      setAssignQuantity("");

      window.setTimeout(() => {
        const productInput = document.getElementById("product-scan-input");
        if (productInput) {
          productInput.focus();
        }
      }, 0);
    } catch (error: any) {
      toast.error(error.message || "Failed to save put-away assignment");
      setLocationError(error.message || "Assignment failed");
    } finally {
      setIsAssigning(false);
    }
  };

  const totalCurrent = tasks.reduce(
    (sum, task) => sum + task.currentQuantity,
    0,
  );
  const totalAllocated = tasks.reduce(
    (sum, task) => sum + task.allocatedQuantity,
    0,
  );
  const totalRemaining = tasks.reduce(
    (sum, task) => sum + task.remainingQuantity,
    0,
  );

  const canAssign =
    Boolean(productScanCode.trim()) &&
    Boolean(selectedTask) &&
    Boolean(locationScanCode.trim()) &&
    Number(assignQuantity) > 0;

  const resetAllScans = () => {
    setProductScanCode("");
    setLocationScanCode("");
    setAssignQuantity("");
    setLastAssignment(null);
    setProductError(null);
    setLocationError(null);
    setScannedProduct(null);
  };

  const clearProductOnly = () => {
    setProductScanCode("");
    setAssignQuantity("");
    setProductError(null);
    setScannedProduct(null);
    const productInput = document.getElementById("product-scan-input");
    if (productInput) {
      productInput.focus();
    }
  };

  const clearLocationOnly = () => {
    setLocationScanCode("");
    setLocationError(null);
    const locationInput = document.getElementById("location-scan-input");
    if (locationInput) {
      locationInput.focus();
    }
  };

  return (
    <OperationsPage
      title="Put Away"
      description="Scan product, confirm pending quantity, then scan location or bin to store it under the parent location."
      icon={Warehouse}
      hideHeader
    >
      <Box maw={1220}>
        <OperationsPanel
          title="Scan Workflow"
          icon={ScanLine}
          description="Scan SKU first, scan location second, then enter quantity and save."
          hideHeader={isMobile}
          action={
            <Group gap={isMobile ? 4 : "xs"} wrap="nowrap">
              <Badge size={isMobile ? "xs" : "sm"} radius="md" variant="light" color="gray">
                {isMobile ? `S: ${totalCurrent}` : `${totalCurrent} stock`}
              </Badge>
              <Badge size={isMobile ? "xs" : "sm"} radius="md" variant="light" color="cyan">
                {isMobile ? `D: ${totalAllocated}` : `${totalAllocated} stored`}
              </Badge>
              <Badge size={isMobile ? "xs" : "sm"} radius="md" variant="light" color="orange">
                {isMobile ? `P: ${totalRemaining}` : `${totalRemaining} pending`}
              </Badge>
              <Button
                size="xs"
                variant="light"
                color="yellow"
                leftIcon={<Eye size={14} />}
                onClick={() => setIsPendingModalOpen(true)}
                disabled={tasks.length === 0}
              >
                View
              </Button>
            </Group>
          }
        >
          <Stack gap={isMobile ? "xs" : "sm"}>
            {isMobile && (
              <Group gap="xs" justify="center" mb={4}>
                <Badge size="xs" radius="md" variant="light" color="gray">
                  Stock: {totalCurrent}
                </Badge>
                <Badge size="xs" radius="md" variant="light" color="cyan">
                  Stored: {totalAllocated}
                </Badge>
                <Badge size="xs" radius="md" variant="light" color="orange">
                  Pending: {totalRemaining}
                </Badge>
                <Button
                  size="xs"
                  variant="light"
                  color="yellow"
                  leftIcon={<Eye size={13} />}
                  onClick={() => setIsPendingModalOpen(true)}
                  disabled={tasks.length === 0}
                >
                  View
                </Button>
              </Group>
            )}
            {!isMobile && (
              <Paper
                radius="lg"
                p="sm"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Text fw={700} c="white" size="sm">
                  Simple flow
                </Text>
                <Text size="11px" c="dimmed" mt={4}>
                  1. Scan SKU. 2. Scan location QR. 3. Enter quantity. 4. Save.
                  Location stays filled so next SKU can go to same place.
                </Text>
              </Paper>
            )}

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={isMobile ? "xs" : "sm"}>
              <Paper radius="lg" p={isMobile ? "xs" : "sm"} withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed" mb={isMobile ? 4 : 6}>
                  STEP 1
                </Text>
                <Input
                  id="product-scan-input"
                  size={isMobile ? "xs" : "sm"}
                  label="Scan SKU"
                  placeholder="Scan SKU QR code"
                  value={productScanCode}
                  onChange={(e) => {
                    setProductScanCode(e.target.value);
                    setProductError(null);
                    setScannedProduct(null);
                  }}
                  onKeyDown={handleProductScan}
                  error={productError}
                  leftElement={<Package size={15} />}
                  rightElement={
                    isFetchingProduct ? (
                      <div className="animate-spin">
                        <Package size={15} />
                      </div>
                    ) : null
                  }
                  autoFocus
                />
              </Paper>

              <Paper radius="lg" p={isMobile ? "xs" : "sm"} withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed" mb={isMobile ? 4 : 6}>
                  STEP 2
                </Text>
                <Input
                  size={isMobile ? "xs" : "sm"}
                  label="Scan Location"
                  placeholder="Scan location or bin QR"
                  value={locationScanCode}
                  onChange={(e) => {
                    setLocationScanCode(e.target.value);
                    setLocationError(null);
                  }}
                  onKeyDown={handleLocationScan}
                  error={locationError}
                  leftElement={<MapPin size={15} />}
                  id="location-scan-input"
                  disabled={!selectedTask}
                />
              </Paper>

              <Paper radius="lg" p={isMobile ? "xs" : "sm"} withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed" mb={isMobile ? 4 : 6}>
                  STEP 3
                </Text>
                <Input
                  id="putaway-qty-input"
                  size={isMobile ? "xs" : "sm"}
                  label="Quantity"
                  type="number"
                  min="1"
                  placeholder={
                    selectedTask
                      ? `Pending ${selectedTask.remainingQuantity}`
                      : "Enter quantity"
                  }
                  value={assignQuantity}
                  onChange={(e) =>
                    setAssignQuantity(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  disabled={!selectedTask || !locationScanCode.trim()}
                />
              </Paper>
            </SimpleGrid>

            {!isMobile && scannedProduct && !selectedTask && (
              <Paper
                radius="lg"
                p="sm"
                style={{
                  background: "rgba(255, 165, 0, 0.1)",
                  border: "1px solid rgba(255, 165, 0, 0.2)",
                }}
              >
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Text fw={600} c="orange.3" size="xs">
                      Product Found in Master Only
                    </Text>
                    <Badge variant="light" color="orange" size="xs">
                      No Stock Qty
                    </Badge>
                  </Group>
                  <Text ff="monospace" size="xs" c="orange.2" fw={700}>
                    {scannedProduct.sku || "N/A"}
                  </Text>
                  <Text size="11px" c="white">
                    {scannedProduct.name}
                  </Text>
                  <Text size="11px" c="dimmed" mt={4}>
                    Product exists, but no inward stock is ready for put-away.
                  </Text>
                </Stack>
              </Paper>
            )}

            {selectedTask ? (
              <Paper
                radius="lg"
                p={isMobile ? "xs" : "sm"}
                style={{
                  background: "rgba(30, 192, 243, 0.1)",
                  border: "1px solid rgba(30, 192, 243, 0.2)",
                }}
              >
                <Group
                  align="center"
                  justify="space-between"
                  wrap={isMobile ? "wrap" : "nowrap"}
                  gap={isMobile ? "xs" : "md"}
                >
                  <Stack gap={2} style={{ flex: 1, minWidth: isMobile ? "100%" : "auto" }}>
                    <Text ff="monospace" size="xs" c="cyan.3" fw={700}>
                      {selectedTask.skuCode}
                    </Text>
                    <Text size="11px" c="white" lineClamp={1}>
                      {selectedTask.productName}
                    </Text>
                  </Stack>
                  <SimpleGrid cols={3} spacing="xs" style={{ flex: isMobile ? 1 : "auto" }}>
                    <Stack gap={1} align="center">
                      <Text
                        size="8px"
                        tt="uppercase"
                        c="dimmed"
                        style={{ letterSpacing: "0.15em" }}
                      >
                        Actual
                      </Text>
                      <Text size={isMobile ? "sm" : "md"} fw={700} c="white">
                        {selectedTask.currentQuantity}
                      </Text>
                    </Stack>
                    <Stack gap={1} align="center">
                      <Text
                        size="8px"
                        tt="uppercase"
                        c="dimmed"
                        style={{ letterSpacing: "0.15em" }}
                      >
                        Allocated
                      </Text>
                      <Text size={isMobile ? "sm" : "md"} fw={700} c="cyan.3">
                        {selectedTask.allocatedQuantity}
                      </Text>
                    </Stack>
                    <Stack gap={1} align="center">
                      <Text
                        size="8px"
                        tt="uppercase"
                        c="dimmed"
                        style={{ letterSpacing: "0.15em" }}
                      >
                        Pending
                      </Text>
                      <Text size={isMobile ? "sm" : "md"} fw={700} c="yellow.4">
                        {selectedTask.remainingQuantity}
                      </Text>
                    </Stack>
                  </SimpleGrid>
                </Group>
              </Paper>
            ) : (
              <Paper
                radius="lg"
                p="xs"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Text size="xs" c="dimmed" ta="center">
                  Scan SKU to load pending details.
                </Text>
              </Paper>
            )}

            {!isMobile && (
              <Paper radius="lg" p="sm" withBorder bg="transparent">
                <Group justify="space-between" align="center" mb="xs">
                  <Text size="11px" fw={700}>
                    Current scan state
                  </Text>
                  <Badge
                    size="xs"
                    radius="sm"
                    color={canAssign ? "green" : "gray"}
                    variant={canAssign ? "filled" : "light"}
                  >
                    {canAssign ? "Ready to save" : "Waiting for scan"}
                  </Badge>
                </Group>
                <SimpleGrid cols={3} spacing="xs">
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      SKU
                    </Text>
                    <Text size="11px" fw={700} mt={4} lineClamp={1}>
                      {productScanCode || "Not scanned"}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      LOCATION
                    </Text>
                    <Text size="11px" fw={700} mt={4} lineClamp={1}>
                      {locationScanCode || "Not scanned"}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      QUANTITY
                    </Text>
                    <Text size="11px" fw={700} mt={4}>
                      {assignQuantity || "Not entered"}
                    </Text>
                  </Box>
                </SimpleGrid>
              </Paper>
            )}

            {isMobile ? (
              <Stack gap="xs">
                <Button
                  onClick={handleAssign}
                  loading={isAssigning}
                  disabled={!canAssign}
                  size="md"
                  fullWidth
                  leftIcon={
                    isAssigning ? (
                      <Package className="h-4 w-4 animate-pulse" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )
                  }
                >
                  {isAssigning ? "Saving..." : "Save Put Away"}
                </Button>
                <SimpleGrid cols={3} spacing="xs">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={clearProductOnly}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    styles={{
                      label: { fontSize: "11px" }
                    }}
                  >
                    Next SKU
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={clearLocationOnly}
                    leftIcon={<MapPin className="h-3.5 w-3.5" />}
                    styles={{
                      label: { fontSize: "11px" }
                    }}
                  >
                    Location
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={resetAllScans}
                    leftIcon={<Eraser className="h-3.5 w-3.5" />}
                    styles={{
                      label: { fontSize: "11px" }
                    }}
                  >
                    Clear
                  </Button>
                </SimpleGrid>
              </Stack>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
                <Button
                  variant="outline"
                  onClick={clearProductOnly}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  className="min-h-11 whitespace-normal px-3 text-center"
                >
                  Next SKU
                </Button>
                <Button
                  variant="outline"
                  onClick={clearLocationOnly}
                  leftIcon={<MapPin className="h-4 w-4" />}
                  className="min-h-11 whitespace-normal px-3 text-center"
                >
                  Change Location
                </Button>
                <Button
                  variant="outline"
                  onClick={resetAllScans}
                  leftIcon={<Eraser className="h-4 w-4" />}
                  className="min-h-11 whitespace-normal px-3 text-center"
                >
                  Clear All
                </Button>
                <Button
                  onClick={handleAssign}
                  loading={isAssigning}
                  disabled={!canAssign}
                  className="min-h-11 whitespace-normal px-3 text-center"
                  leftIcon={
                    isAssigning ? (
                      <Package className="h-4 w-4 animate-pulse" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )
                  }
                >
                  {isAssigning ? "Saving..." : "Save Put Away"}
                </Button>
              </SimpleGrid>
            )}

            {isMobile && scannedProduct && !selectedTask && (
              <Paper
                radius="lg"
                p="xs"
                style={{
                  background: "rgba(255, 165, 0, 0.1)",
                  border: "1px solid rgba(255, 165, 0, 0.2)",
                }}
              >
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Text fw={600} c="orange.3" size="xs">
                      Product Found in Master Only
                    </Text>
                    <Badge variant="light" color="orange" size="xs">
                      No Stock Qty
                    </Badge>
                  </Group>
                  <Text ff="monospace" size="xs" c="orange.2" fw={700}>
                    {scannedProduct.sku || "N/A"}
                  </Text>
                  <Text size="11px" c="white">
                    {scannedProduct.name}
                  </Text>
                  <Text size="11px" c="dimmed" mt={4}>
                    Product exists, but no inward stock is ready for put-away.
                  </Text>
                </Stack>
              </Paper>
            )}

            {lastAssignment && (
              <Paper
                radius="lg"
                p="sm"
                style={{
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                }}
              >
                <Group align="flex-start" gap="sm" wrap="nowrap">
                  <ThemeIcon
                    variant="light"
                    color="green"
                    radius="xl"
                    size={36}
                    style={{ marginTop: 2 }}
                  >
                    <CheckCircle2 size={18} />
                  </ThemeIcon>
                  <Stack gap={6}>
                    <Text fw={600} c="white" size="sm">
                      Stored successfully
                    </Text>
                    <Text size="11px" c="dimmed">
                      Product{" "}
                      <Text component="span" ff="monospace" c="cyan.3" fw={700}>
                        {lastAssignment.skuCode}
                      </Text>{" "}
                      stored in{" "}
                      <Text component="span" fw={600} c="green.4">
                        {lastAssignment.resolvedLocationCode}
                      </Text>
                      . Scan next SKU if same location continues.
                    </Text>
                    <Group gap="xs">
                      <Badge variant="light" color="gray" size="xs" radius="xl">
                        Assigned: {lastAssignment.assignedQuantity}
                      </Badge>
                      <Badge variant="light" color="gray" size="xs" radius="xl">
                        Remaining: {lastAssignment.remainingUnassignedQuantity}
                      </Badge>
                    </Group>
                  </Stack>
                </Group>
              </Paper>
            )}
          </Stack>
        </OperationsPanel>
      </Box>

      <Modal
        opened={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        title={`Pending Put Away · ${totalRemaining} units`}
        centered
        size="lg"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {tasks.length > 0 ? (
          <Stack gap="xs">
            <Group justify="space-between" gap="xs">
              <Text size="xs" c="dimmed">
                {tasks.length} SKU{tasks.length === 1 ? "" : "s"} ready for put away
              </Text>
              <Badge color="orange" variant="light">
                {totalRemaining} pending
              </Badge>
            </Group>

            {tasks.map((task) => (
              <Paper
                key={task.productId}
                radius="lg"
                p="sm"
                withBorder
                style={{ background: "rgba(255,255,255,0.025)" }}
              >
                <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text ff="monospace" size="xs" fw={800} c="cyan.3">
                      {task.skuCode}
                    </Text>
                    <Text size="sm" fw={700} mt={2} lineClamp={2}>
                      {task.productName}
                    </Text>
                    {task.alias ? (
                      <Text size="10px" c="dimmed" mt={3}>
                        Alias: {task.alias}
                      </Text>
                    ) : null}
                  </Box>

                  <Stack gap={1} align="flex-end">
                    <Text size="9px" fw={800} c="dimmed" tt="uppercase">
                      Pending
                    </Text>
                    <Text ff="monospace" size="lg" fw={900} c="yellow.4">
                      {task.remainingQuantity}
                    </Text>
                  </Stack>
                </Group>

                <SimpleGrid cols={2} spacing="xs" mt="sm">
                  <Paper radius="md" p="xs" bg="rgba(255,255,255,0.025)">
                    <Text size="9px" c="dimmed" tt="uppercase" fw={800}>
                      Current Stock
                    </Text>
                    <Text size="xs" fw={700} mt={2}>
                      {task.currentQuantity}
                    </Text>
                  </Paper>
                  <Paper radius="md" p="xs" bg="rgba(255,255,255,0.025)">
                    <Text size="9px" c="dimmed" tt="uppercase" fw={800}>
                      Stored in Locations
                    </Text>
                    <Text size="xs" fw={700} c="cyan.3" mt={2}>
                      {task.allocatedQuantity}
                    </Text>
                  </Paper>
                </SimpleGrid>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Stack align="center" gap="xs" py="xl">
            <CheckCircle2 size={32} color="var(--mantine-color-green-5)" />
            <Text fw={700}>No pending items</Text>
            <Text size="xs" c="dimmed">
              All verified inward stock has been put away.
            </Text>
          </Stack>
        )}
      </Modal>
    </OperationsPage>
  );
};

export default PutAway;
