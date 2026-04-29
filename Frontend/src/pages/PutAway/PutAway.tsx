import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge,
  Box,
  Grid,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  ArrowRight,
  CircleAlert,
  CheckCircle2,
  Eraser,
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
  DataTable,
  createTableColumns,
} from "../../components/molecules/DataTable";
import {
  OperationsPage,
  OperationsPanel,
} from "../../components/organisms/Operations/OperationsShell";
import {
  ProductAllottedLocationRecord,
  ProductQuantityRecord,
  PutAwayScanAssignmentResult,
  productAllottedLocationsApi,
  productQuantitiesApi,
  productsApi,
  Product,
  PoInvoice,
  poInvoicesApi,
} from "../../services/masterApi";

type PutAwayTask = {
  productId: number;
  skuCode: string;
  productName: string;
  currentQuantity: number;
  allocatedQuantity: number;
  remainingQuantity: number;
  updatedAt: string;
};

const emptyResult: PutAwayScanAssignmentResult | null = null;

export const PutAway = () => {
  const [productQuantities, setProductQuantities] = useState<
    ProductQuantityRecord[]
  >([]);
  const [allocations, setAllocations] = useState<
    ProductAllottedLocationRecord[]
  >([]);
  const [poInvoices, setPoInvoices] = useState<PoInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [productScanCode, setProductScanCode] = useState("");
  const [locationScanCode, setLocationScanCode] = useState("");
  const [assignQuantity, setAssignQuantity] = useState<number | "">("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [lastAssignment, setLastAssignment] =
    useState<PutAwayScanAssignmentResult | null>(emptyResult);
  const [productError, setProductError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [quantitiesData, allocationsData, invoicesData] = await Promise.all(
        [
          productQuantitiesApi.getAll(),
          productAllottedLocationsApi.getAll(),
          poInvoicesApi.getAll(),
        ],
      );

      setProductQuantities(quantitiesData);
      setAllocations(allocationsData);
      setPoInvoices(invoicesData);
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
    return productQuantities
      .map((quantityRow) => {
        // Get remaining allocation from PO invoices for this product
        const productInvoices = poInvoices.filter(
          (inv) => inv.productId === quantityRow.productId,
        );
        const remainingAllocation = productInvoices.reduce(
          (sum, inv) => sum + inv.remainingAllocation,
          0,
        );

        const allocationRow = allocations.find(
          (entry) => entry.productId === quantityRow.productId,
        );
        const allocatedQuantity = Object.values(
          (allocationRow?.locationJson || {}) as Record<string, number>,
        ).reduce((sum, qty) => sum + Number(qty), 0);

        // Use remainingAllocation from invoices if available, otherwise fall back to calculation
        const remainingQuantity =
          remainingAllocation > 0
            ? remainingAllocation
            : Math.max(quantityRow.currentQuantity - allocatedQuantity, 0);

        return {
          productId: quantityRow.productId,
          skuCode: quantityRow.skuCode,
          productName: quantityRow.productName,
          currentQuantity: quantityRow.currentQuantity,
          allocatedQuantity,
          remainingQuantity,
          updatedAt: quantityRow.updatedAt,
        };
      })
      .filter((task) => task.remainingQuantity > 0)
      .sort((a, b) => b.remainingQuantity - a.remainingQuantity);
  }, [allocations, productQuantities, poInvoices]);

  const tasks = useMemo<PutAwayTask[]>(() => {
    return allTasks.filter((task) => {
      const query = searchQuery.toLowerCase();
      return (
        task.skuCode.toLowerCase().includes(query) ||
        task.productName.toLowerCase().includes(query)
      );
    });
  }, [allTasks, searchQuery]);

  const selectedTask = useMemo(() => {
    if (!productScanCode.trim()) return null;

    const scan = productScanCode.trim().toLowerCase();
    return (
      allTasks.find(
        (task) =>
          task.skuCode.toLowerCase() === scan ||
          task.productName.toLowerCase() === scan,
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

      const scan = productScanCode.trim();

      // First check in put-away tasks
      const task = allTasks.find(
        (t) =>
          t.skuCode.toLowerCase() === scan.toLowerCase() ||
          t.productName.toLowerCase() === scan.toLowerCase(),
      );

      if (task) {
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
        const allProducts = await productsApi.getAll();
        const product = allProducts.find(
          (p) =>
            p.sku?.toLowerCase() === scan.toLowerCase() ||
            p.name.toLowerCase() === scan.toLowerCase(),
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

  const handleChooseTask = (task: PutAwayTask) => {
    setProductScanCode(task.skuCode);
    setAssignQuantity(task.remainingQuantity > 0 ? task.remainingQuantity : "");
    setLastAssignment(null);
    setProductError(null);
    setLocationError(null);
    setScannedProduct(null);

    window.setTimeout(() => {
      const locationInput = document.getElementById("location-scan-input");
      if (locationInput) {
        locationInput.focus();
      }
    }, 0);
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
        productScanCode: productScanCode.trim(),
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

  const allocationColumns = createTableColumns<ProductAllottedLocationRecord>([
    {
      accessorKey: "skuCode",
      header: "SKU Code",
      cell: (row) => (
        <Text ff="monospace" size="11px" c="cyan.3" fw={700}>
          {row.skuCode}
        </Text>
      ),
    },
    {
      accessorKey: "productName",
      header: "Product Name",
      cell: (row) => (
        <Text fw={700} c="white" size="sm">
          {row.productName}
        </Text>
      ),
    },
    {
      accessorKey: "locationJson",
      header: "Stored Locations",
      cell: (row) => (
        <Group gap="xs" wrap="wrap">
          {Object.entries(row.locationJson || {}).length > 0 ? (
            Object.entries(row.locationJson).map(([key, value]) => (
              <Badge
                key={key}
                variant="light"
                color="gray"
                size="sm"
                radius="md"
              >
                {key}: {value}
              </Badge>
            ))
          ) : (
            <Text size="xs" c="dimmed">
              No locations mapped
            </Text>
          )}
        </Group>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: (row) => (
        <Text size="11px" c="dimmed">
          {format(new Date(row.updatedAt), "dd-MMM-yy hh:mm a")}
        </Text>
      ),
    },
  ]);

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
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, xl: 7 }}>
          <OperationsPanel
            title="Scan Workflow"
            icon={ScanLine}
            description="Scan SKU first, scan location second, then enter quantity and save."
            action={
              <Group gap="xs" wrap="nowrap">
                <Badge size="sm" radius="md" variant="light" color="gray">
                  {totalCurrent} stock
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="cyan">
                  {totalAllocated} stored
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="orange">
                  {totalRemaining} pending
                </Badge>
              </Group>
            }
          >
            <Stack gap="sm">
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

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed" mb={6}>
                    STEP 1
                  </Text>
                  <Input
                    id="product-scan-input"
                    size="sm"
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

                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed" mb={6}>
                    STEP 2
                  </Text>
                  <Input
                    size="sm"
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

                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed" mb={6}>
                    STEP 3
                  </Text>
                  <Input
                    id="putaway-qty-input"
                    size="sm"
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

              {scannedProduct && !selectedTask && (
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
                  p="sm"
                  style={{
                    background: "rgba(30, 192, 243, 0.1)",
                    border: "1px solid rgba(30, 192, 243, 0.2)",
                  }}
                >
                  <Group
                    align="flex-start"
                    justify="space-between"
                    wrap="nowrap"
                    gap="md"
                  >
                    <Stack gap={4}>
                      <Text ff="monospace" size="xs" c="cyan.3" fw={700}>
                        {selectedTask.skuCode}
                      </Text>
                      <Text size="11px" c="white">
                        {selectedTask.productName}
                      </Text>
                    </Stack>
                    <SimpleGrid cols={3} spacing="xs">
                      <Stack gap={2} align="center">
                        <Text
                          size="8px"
                          tt="uppercase"
                          c="dimmed"
                          style={{ letterSpacing: "0.2em" }}
                        >
                          Actual
                        </Text>
                        <Text size="md" fw={700} c="white">
                          {selectedTask.currentQuantity}
                        </Text>
                      </Stack>
                      <Stack gap={2} align="center">
                        <Text
                          size="8px"
                          tt="uppercase"
                          c="dimmed"
                          style={{ letterSpacing: "0.2em" }}
                        >
                          Allocated
                        </Text>
                        <Text size="md" fw={700} c="cyan.3">
                          {selectedTask.allocatedQuantity}
                        </Text>
                      </Stack>
                      <Stack gap={2} align="center">
                        <Text
                          size="8px"
                          tt="uppercase"
                          c="dimmed"
                          style={{ letterSpacing: "0.2em" }}
                        >
                          Pending
                        </Text>
                        <Text size="md" fw={700} c="yellow.4">
                          {selectedTask.remainingQuantity}
                        </Text>
                      </Stack>
                    </SimpleGrid>
                  </Group>
                </Paper>
              ) : (
                <Paper
                  radius="lg"
                  p="sm"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Text size="11px" c="dimmed">
                    Scan SKU to load pending quantity details.
                  </Text>
                </Paper>
              )}

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
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
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

              <Group grow>
                <Button
                  variant="outline"
                  onClick={clearProductOnly}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                >
                  Next SKU
                </Button>
                <Button
                  variant="outline"
                  onClick={clearLocationOnly}
                  leftIcon={<MapPin className="h-4 w-4" />}
                >
                  Change Location
                </Button>
                <Button
                  variant="outline"
                  onClick={resetAllScans}
                  leftIcon={<Eraser className="h-4 w-4" />}
                >
                  Clear All
                </Button>
                <Button
                  onClick={handleAssign}
                  loading={isAssigning}
                  disabled={!canAssign}
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
              </Group>

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
                        <Text
                          component="span"
                          ff="monospace"
                          c="cyan.3"
                          fw={700}
                        >
                          {lastAssignment.skuCode}
                        </Text>{" "}
                        stored in{" "}
                        <Text component="span" fw={600} c="green.4">
                          {lastAssignment.resolvedLocationCode}
                        </Text>
                        . Scan next SKU if same location continues.
                      </Text>
                      <Group gap="xs">
                        <Badge
                          variant="light"
                          color="gray"
                          size="xs"
                          radius="xl"
                        >
                          Assigned: {lastAssignment.assignedQuantity}
                        </Badge>
                        <Badge
                          variant="light"
                          color="gray"
                          size="xs"
                          radius="xl"
                        >
                          Remaining:{" "}
                          {lastAssignment.remainingUnassignedQuantity}
                        </Badge>
                      </Group>
                    </Stack>
                  </Group>
                </Paper>
              )}
            </Stack>
          </OperationsPanel>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 5 }}>
        </Grid.Col>
      </Grid>
    </OperationsPage>
  );
};

export default PutAway;
