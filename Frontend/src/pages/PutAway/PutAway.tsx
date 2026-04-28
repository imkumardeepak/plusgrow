import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Badge,
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
  CheckCircle2,
  MapPin,
  Package,
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [productScanCode, setProductScanCode] = useState("");
  const [locationScanCode, setLocationScanCode] = useState("");
  const [assignQuantity, setAssignQuantity] = useState<number | "">("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [lastAssignment, setLastAssignment] =
    useState<PutAwayScanAssignmentResult | null>(emptyResult);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [quantitiesData, allocationsData] = await Promise.all([
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);

      setProductQuantities(quantitiesData);
      setAllocations(allocationsData);
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
        const allocationRow = allocations.find(
          (entry) => entry.productId === quantityRow.productId,
        );
        const allocatedQuantity = Object.values(
          (allocationRow?.locationJson || {}) as Record<string, number>,
        ).reduce((sum, qty) => sum + Number(qty), 0);
        const remainingQuantity = Math.max(
          quantityRow.currentQuantity - allocatedQuantity,
          0,
        );

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
      .sort((a, b) => b.remainingQuantity - a.remainingQuantity);
  }, [allocations, productQuantities]);

  const tasks = useMemo<PutAwayTask[]>(() => {
    return allTasks
      .filter((task) => task.remainingQuantity > 0)
      .filter((task) => {
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
    if (selectedTask && assignQuantity === "") {
      setAssignQuantity(
        selectedTask.remainingQuantity > 0
          ? selectedTask.remainingQuantity
          : "",
      );
    }
  }, [assignQuantity, selectedTask]);

  const handleChooseTask = (task: PutAwayTask) => {
    setProductScanCode(task.skuCode);
    setAssignQuantity(task.remainingQuantity > 0 ? task.remainingQuantity : "");
    setLastAssignment(null);
  };

  const handleAssign = async () => {
    const quantity = Number(assignQuantity);

    if (!productScanCode.trim()) {
      toast.error("Scan or enter product code first");
      return;
    }

    if (!locationScanCode.trim()) {
      toast.error("Scan location or bin first");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter valid quantity");
      return;
    }

    if (!selectedTask) {
      toast.error("Scanned product was not found");
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
      setLocationScanCode("");
      setAssignQuantity(
        result.remainingUnassignedQuantity > 0
          ? result.remainingUnassignedQuantity
          : "",
      );
      if (result.remainingUnassignedQuantity <= 0) {
        setProductScanCode("");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save put-away assignment");
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

  return (
    <OperationsPage
      title="Put Away"
      description="Scan product, confirm pending quantity, then scan location or bin to store it under the parent location."
      icon={Warehouse}
      metrics={[
        { label: "Actual Qty", value: totalCurrent },
        { label: "Allocated", value: totalAllocated, tone: "brand" },
        { label: "Pending Put Away", value: totalRemaining, tone: "warning" },
      ]}
    >
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, xl: 7 }}>
          <OperationsPanel
            title="Scan Workflow"
            icon={ScanLine}
            description="Product first, then qty, then location or bin."
          >
            <Stack gap="md">
              <Paper
                radius="xl"
                p="md"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Text fw={600} c="white">
                  Put-away flow
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  1. Scan product SKU. 2. Check pending quantity. 3. Enter
                  quantity. 4. Scan location or bin. 5. Save.
                </Text>
              </Paper>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Input
                    size="sm"
                    label="Scan Product"
                    placeholder="Scan SKU or product code"
                    value={productScanCode}
                    onChange={(e) => setProductScanCode(e.target.value)}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Input
                    size="sm"
                    label="Scan Location or Bin"
                    placeholder="Scan location code or bin code"
                    value={locationScanCode}
                    onChange={(e) => setLocationScanCode(e.target.value)}
                  />
                </Grid.Col>
              </Grid>

              <Input
                size="sm"
                label="Quantity To Put Away"
                type="number"
                min="1"
                placeholder={
                  selectedTask
                    ? `Pending qty: ${selectedTask.remainingQuantity}`
                    : "Enter quantity"
                }
                value={assignQuantity}
                onChange={(e) =>
                  setAssignQuantity(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
              />

              {selectedTask ? (
                <Paper
                  radius="xl"
                  p="md"
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
                      <Text ff="monospace" size="sm" c="cyan.3" fw={700}>
                        {selectedTask.skuCode}
                      </Text>
                      <Text size="xs" c="white">
                        {selectedTask.productName}
                      </Text>
                    </Stack>
                    <SimpleGrid cols={3} spacing="xs">
                      <Stack gap={2} align="center">
                        <Text
                          size="9px"
                          tt="uppercase"
                          c="dimmed"
                          style={{ letterSpacing: "0.2em" }}
                        >
                          Actual
                        </Text>
                        <Text size="lg" fw={700} c="white">
                          {selectedTask.currentQuantity}
                        </Text>
                      </Stack>
                      <Stack gap={2} align="center">
                        <Text
                          size="9px"
                          tt="uppercase"
                          c="dimmed"
                          style={{ letterSpacing: "0.2em" }}
                        >
                          Allocated
                        </Text>
                        <Text size="lg" fw={700} c="cyan.3">
                          {selectedTask.allocatedQuantity}
                        </Text>
                      </Stack>
                      <Stack gap={2} align="center">
                        <Text
                          size="9px"
                          tt="uppercase"
                          c="dimmed"
                          style={{ letterSpacing: "0.2em" }}
                        >
                          Pending
                        </Text>
                        <Text size="lg" fw={700} c="yellow.4">
                          {selectedTask.remainingQuantity}
                        </Text>
                      </Stack>
                    </SimpleGrid>
                  </Group>
                </Paper>
              ) : (
                <Paper
                  radius="xl"
                  p="md"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Text size="sm" c="dimmed">
                    Scan product to load quantity details.
                  </Text>
                </Paper>
              )}

              <Group grow>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProductScanCode("");
                    setLocationScanCode("");
                    setAssignQuantity("");
                    setLastAssignment(null);
                  }}
                >
                  Reset Scan
                </Button>
                <Button
                  onClick={handleAssign}
                  loading={isAssigning}
                  leftIcon={
                    isAssigning ? (
                      <Package className="h-4 w-4 animate-pulse" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )
                  }
                >
                  {isAssigning ? "Saving..." : "Confirm Put Away"}
                </Button>
              </Group>

              {lastAssignment && (
                <Paper
                  radius="xl"
                  p="md"
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
                      <Text fw={600} c="white">
                        Stored successfully
                      </Text>
                      <Text size="xs" c="dimmed">
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
                        .
                      </Text>
                      <Group gap="xs">
                        <Badge
                          variant="light"
                          color="gray"
                          size="sm"
                          radius="xl"
                        >
                          Assigned: {lastAssignment.assignedQuantity}
                        </Badge>
                        <Badge
                          variant="light"
                          color="gray"
                          size="sm"
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
          <OperationsPanel
            title="Pending Put Away"
            icon={Package}
            description="Use quick pick list or review stored location ledger."
            action={
              <div style={{ width: 256 }}>
                <Input
                  placeholder="Search SKU or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            }
          >
            <Stack gap="md">
              <ScrollArea h={320} scrollbarSize={6}>
                <Stack gap="xs">
                  {tasks.map((task) => (
                    <Paper
                      key={task.productId}
                      radius="xl"
                      p="md"
                      onClick={() => handleChooseTask(task)}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.background = "rgba(30, 192, 243, 0.1)";
                        target.style.borderColor = "rgba(30, 192, 243, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.background = "rgba(255,255,255,0.04)";
                        target.style.borderColor = "rgba(255,255,255,0.1)";
                      }}
                    >
                      <Group
                        align="flex-start"
                        justify="space-between"
                        wrap="nowrap"
                        gap="md"
                      >
                        <Stack gap={4}>
                          <Text ff="monospace" size="sm" c="cyan.3" fw={700}>
                            {task.skuCode}
                          </Text>
                          <Text size="xs" c="gray.3">
                            {task.productName}
                          </Text>
                        </Stack>
                        <Badge
                          variant="light"
                          color={
                            task.remainingQuantity > 0 ? "yellow" : "green"
                          }
                          size="sm"
                          radius="xl"
                        >
                          {task.remainingQuantity > 0 ? "Pending" : "Complete"}
                        </Badge>
                      </Group>

                      <SimpleGrid cols={3} spacing="xs" mt="sm">
                        <Stack gap={2} align="center">
                          <Text
                            size="10px"
                            tt="uppercase"
                            c="dimmed"
                            style={{ letterSpacing: "0.2em" }}
                          >
                            Actual
                          </Text>
                          <Text size="sm" fw={700} c="white">
                            {task.currentQuantity}
                          </Text>
                        </Stack>
                        <Stack gap={2} align="center">
                          <Text
                            size="10px"
                            tt="uppercase"
                            c="dimmed"
                            style={{ letterSpacing: "0.2em" }}
                          >
                            Allocated
                          </Text>
                          <Text size="sm" fw={700} c="cyan.3">
                            {task.allocatedQuantity}
                          </Text>
                        </Stack>
                        <Stack gap={2} align="center">
                          <Text
                            size="10px"
                            tt="uppercase"
                            c="dimmed"
                            style={{ letterSpacing: "0.2em" }}
                          >
                            Pending
                          </Text>
                          <Text size="sm" fw={700} c="yellow.4">
                            {task.remainingQuantity}
                          </Text>
                        </Stack>
                      </SimpleGrid>
                    </Paper>
                  ))}
                </Stack>
              </ScrollArea>

              <Paper
                radius="xl"
                p="md"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Group align="center" gap="xs" mb="sm">
                  <ThemeIcon variant="light" color="cyan" radius="xl" size={28}>
                    <MapPin size={14} />
                  </ThemeIcon>
                  <Text fw={600} size="sm" c="white">
                    Stored Location Ledger
                  </Text>
                </Group>
                <DataTable
                  columns={allocationColumns}
                  data={allocations}
                  loading={isLoading}
                  searchPlaceholder="Search stored locations..."
                />
              </Paper>
            </Stack>
          </OperationsPanel>
        </Grid.Col>
      </Grid>
    </OperationsPage>
  );
};

export default PutAway;
