import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "../components/atoms/Button";
import {
  OperationsPage,
} from "../components/organisms/Operations/OperationsShell";
import {
  OutwardOrder,
  PoInvoiceHeaderSummary,
  ProductStockMovementRecord,
  outwardOrdersApi,
  poInvoicesApi,
  productQuantitiesApi,
} from "../services/masterApi";
import { toast } from "../lib/toast";

// ── Helpers ────────────────────────────────────────────────────────────────────

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const isToday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  return dateStr.slice(0, 10) === todayStr();
};

const formatTime = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "hh:mm a");
  } catch {
    return "—";
  }
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const TodayOperations = memo(function TodayOperations() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [invoices, setInvoices] = useState<PoInvoiceHeaderSummary[]>([]);
  const [outwardOrders, setOutwardOrders] = useState<OutwardOrder[]>([]);
  const [movements, setMovements] = useState<ProductStockMovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const today = todayStr();
      const [invoiceResult, outwardResult, movementResult] = await Promise.all([
        poInvoicesApi.getHeaders({ fromDate: today, toDate: today, page: 1, pageSize: 200 }),
        outwardOrdersApi.getAll({ page: 1, pageSize: 500 }),
        productQuantitiesApi.getMovements(),
      ]);

      setInvoices(invoiceResult.data.filter((inv) => inv.status !== "Canceled"));
      setOutwardOrders(outwardResult);
      setMovements(movementResult);
    } catch {
      toast.error("Failed to load today's operations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ── Computed data ──────────────────────────────────────────────────────────

  const todayInvoices = invoices;
  const totalInwardQty = todayInvoices.reduce((sum, inv) => sum + inv.totalBilledQty, 0);
  const totalInwardProducts = todayInvoices.reduce((sum, inv) => sum + inv.productCount, 0);

  const todayOutward = useMemo(
    () => outwardOrders.filter((o) => isToday(o.createdAt) || isToday(o.pickedAt) || isToday(o.packedAt) || isToday(o.dispatchedAt)),
    [outwardOrders],
  );

  const todayPicked = useMemo(
    () => outwardOrders.filter((o) => isToday(o.pickedAt)),
    [outwardOrders],
  );
  const todayPacked = useMemo(
    () => outwardOrders.filter((o) => isToday(o.packedAt)),
    [outwardOrders],
  );
  const todayDispatched = useMemo(
    () => outwardOrders.filter((o) => isToday(o.dispatchedAt)),
    [outwardOrders],
  );

  const totalOutwardQty = todayOutward.reduce((sum, o) => sum + o.quantity, 0);
  const totalPickedQty = todayPicked.reduce((sum, o) => sum + o.pickedQuantity, 0);
  const totalPackedQty = todayPacked.reduce((sum, o) => sum + o.quantity, 0);
  const totalDispatchedQty = todayDispatched.reduce((sum, o) => sum + o.quantity, 0);

  const todayMovements = useMemo(
    () => movements.filter((m) => isToday(m.createdAt)).slice(0, 50),
    [movements],
  );
  const inwardMovements = todayMovements.filter((m) => m.quantityChange > 0);
  const outwardMovements = todayMovements.filter((m) => m.quantityChange < 0);

  // ── Progress for outward pipeline ─────────────────────────────────────────
  const pipelineTotal = todayOutward.length || 1;
  const pickedPct = Math.round((todayPicked.length / pipelineTotal) * 100);
  const packedPct = Math.round((todayPacked.length / pipelineTotal) * 100);
  const dispatchedPct = Math.round((todayDispatched.length / pipelineTotal) * 100);

  return (
    <OperationsPage
      title="Today's Operations"
      description={`Inward & outward activity for ${format(new Date(), "dd MMM yyyy")}`}
      icon={BarChart3}
      hideHeader
    >
      <Stack gap="xs">
        {/* Header Bar */}
        <Paper
          radius="sm"
          p="xs"
          withBorder
          style={{ background: "rgba(15,23,42,0.72)", borderColor: "rgba(14,165,233,0.16)" }}
        >
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <BarChart3 size={isMobile ? 18 : 20} color="var(--mantine-color-cyan-4)" />
              <Box className="min-w-0">
                <Text fw={900} size={isMobile ? "sm" : "md"} c="white">
                  Today's Operations Report
                </Text>
                <Text size="11px" c="dimmed">
                  {format(new Date(), "EEEE, dd MMMM yyyy")}
                </Text>
              </Box>
            </Group>
            <Button
              size="xs"
              variant="outline"
              leftIcon={<RefreshCw size={14} />}
              loading={isLoading}
              onClick={() => void loadData()}
            >
              Refresh
            </Button>
          </Group>
        </Paper>

        {/* Summary Stats */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
          <StatCard
            icon={ArrowDownLeft}
            label="Inward Qty"
            value={totalInwardQty}
            sublabel={`${todayInvoices.length} invoices`}
            color="blue"
          />
          <StatCard
            icon={ArrowUpRight}
            label="Outward Qty"
            value={totalOutwardQty}
            sublabel={`${todayOutward.length} items`}
            color="teal"
          />
          <StatCard
            icon={Package}
            label="Packed"
            value={totalPackedQty}
            sublabel={`${todayPacked.length} items`}
            color="violet"
          />
          <StatCard
            icon={Truck}
            label="Dispatched"
            value={totalDispatchedQty}
            sublabel={`${todayDispatched.length} items`}
            color="green"
          />
        </SimpleGrid>

        {/* Outward Pipeline Progress */}
        {todayOutward.length > 0 && (
          <Paper radius="sm" p="xs" withBorder style={{ background: "rgba(15,23,42,0.5)" }}>
            <Text size="11px" fw={700} c="white" mb={4} tt="uppercase">
              Outward Pipeline Progress
            </Text>
            <Group gap="xs" mb={4}>
              <Badge size="xs" variant="filled" color="cyan" c="slate.9" fw={900}>Picked {todayPicked.length}</Badge>
              <Badge size="xs" variant="filled" color="violet" c="slate.9" fw={900}>Packed {todayPacked.length}</Badge>
              <Badge size="xs" variant="filled" color="green" c="slate.9" fw={900}>Dispatched {todayDispatched.length}</Badge>
            </Group>
            <Progress.Root size="lg" radius="xl">
              <Tooltip label={`Picked: ${pickedPct}%`}>
                <Progress.Section value={pickedPct} color="cyan" />
              </Tooltip>
              <Tooltip label={`Packed: ${packedPct}%`}>
                <Progress.Section value={packedPct} color="violet" />
              </Tooltip>
              <Tooltip label={`Dispatched: ${dispatchedPct}%`}>
                <Progress.Section value={dispatchedPct} color="green" />
              </Tooltip>
            </Progress.Root>
          </Paper>
        )}

        {/* Tabs Section for Full-Width Data Display */}
        <Tabs
          defaultValue="inward"
          variant="pills"
          styles={{
            root: { display: "flex", flexDirection: "column", flex: 1 },
            panel: { flex: 1, display: "flex", flexDirection: "column" },
            list: { backgroundColor: "rgba(15,23,42,0.4)", padding: 4, borderRadius: 8 },
            tab: { fontWeight: 700, fontSize: "12px", padding: "6px 12px" },
          }}
        >
          <Tabs.List mb="xs">
            <Tabs.Tab value="inward" leftSection={<ArrowDownLeft size={14} />}>
              Inward Invoices
              <Badge size="xs" variant={todayInvoices.length > 0 ? "filled" : "outline"} color="cyan.5" c={todayInvoices.length > 0 ? "slate.9" : "gray.5"} fw={900} ml={6}>
                {todayInvoices.length}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="outward" leftSection={<ArrowUpRight size={14} />}>
              Outward Sales
              <Badge size="xs" variant={todayOutward.length > 0 ? "filled" : "outline"} color="teal.5" c={todayOutward.length > 0 ? "slate.9" : "gray.5"} fw={900} ml={6}>
                {todayOutward.length}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="movements" leftSection={<BarChart3 size={14} />}>
              Stock Movements
              <Badge size="xs" variant={todayMovements.length > 0 ? "filled" : "outline"} color="blue.5" c={todayMovements.length > 0 ? "slate.9" : "gray.5"} fw={900} ml={6}>
                {todayMovements.length}
              </Badge>
            </Tabs.Tab>
          </Tabs.List>

          {/* ── Inward Tab ── */}
          <Tabs.Panel value="inward">
            {todayInvoices.length > 0 ? (
              <ScrollArea type="auto" h="calc(100vh - 350px)" offsetScrollbars>
                {isMobile ? (
                  <Stack gap="xs">
                    {todayInvoices.map((inv) => (
                      <Paper key={inv.id} radius="md" p="xs" withBorder style={{ background: "rgba(15,23,42,0.5)" }}>
                        <Group justify="space-between" gap="xs" wrap="nowrap">
                          <Box className="min-w-0" style={{ flex: 1 }}>
                            <Text size="xs" fw={800} c="cyan.3" truncate>
                              {inv.invoiceNumber}
                            </Text>
                            <Text size="10px" c="dimmed" truncate>
                              {inv.partyName}
                            </Text>
                          </Box>
                          <Badge size="xs" variant="filled" color={inv.status === "Closed" ? "green" : inv.status === "Printed" ? "blue" : "yellow"} c="slate.9" fw={900}>
                            {inv.status}
                          </Badge>
                        </Group>
                        <Group gap="lg" mt={4}>
                          <Box>
                            <Text size="9px" c="dimmed" fw={700}>QTY</Text>
                            <Text size="sm" fw={900}>{inv.totalBilledQty}</Text>
                          </Box>
                          <Box>
                            <Text size="9px" c="dimmed" fw={700}>PRODUCTS</Text>
                            <Text size="sm" fw={900}>{inv.productCount}</Text>
                          </Box>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing={2} horizontalSpacing="xs" fz="xs" miw={800}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Invoice</Table.Th>
                        <Table.Th>Party</Table.Th>
                        <Table.Th style={{ textAlign: "right" }}>Qty</Table.Th>
                        <Table.Th style={{ textAlign: "right" }}>Products</Table.Th>
                        <Table.Th>Notes</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {todayInvoices.map((inv) => (
                        <Table.Tr key={inv.id}>
                          <Table.Td>
                            <Text size="11px" fw={900} ff="monospace" c="cyan.3">{inv.invoiceNumber}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="11px" truncate maw={140}>{inv.partyName}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Text size="11px" fw={900} ff="monospace">{inv.totalBilledQty}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Text size="11px" fw={900} ff="monospace">{inv.productCount}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="10px" c="dimmed" truncate maw={100}>{inv.cancelRemark || "-"}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" variant="filled" color={inv.status === "Closed" ? "green" : inv.status === "Printed" ? "blue" : "yellow"} c="slate.9" fw={900}>
                              {inv.status}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </ScrollArea>
            ) : (
              <Paper radius="md" p="md" withBorder style={{ background: "rgba(15,23,42,0.3)" }}>
                <Group gap="xs" justify="center">
                  <Clock size={16} className="text-neutral-500" />
                  <Text size="sm" c="dimmed">No inward invoices today</Text>
                </Group>
              </Paper>
            )}
            <Paper radius="md" p="xs" withBorder bg="transparent" mt="xs">
              <Group justify="space-between">
                <Text size="10px" fw={800} c="dimmed">TOTAL INWARD</Text>
                <Group gap="md">
                  <Box ta="center">
                    <Text size="9px" c="dimmed">INVOICES</Text>
                    <Text size="sm" fw={900} c="blue.3">{todayInvoices.length}</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="9px" c="dimmed">QTY</Text>
                    <Text size="sm" fw={900} c="white">{totalInwardQty}</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="9px" c="dimmed">PRODUCTS</Text>
                    <Text size="sm" fw={900} c="white">{totalInwardProducts}</Text>
                  </Box>
                </Group>
              </Group>
            </Paper>
          </Tabs.Panel>

          {/* ── Outward Tab ── */}
          <Tabs.Panel value="outward">
            {todayOutward.length > 0 ? (
              <ScrollArea type="auto" h="calc(100vh - 350px)" offsetScrollbars>
                {isMobile ? (
                  <Stack gap="xs">
                    {todayOutward.map((order) => (
                      <Paper key={order.id} radius="md" p="xs" withBorder style={{ background: "rgba(15,23,42,0.5)" }}>
                        <Group justify="space-between" gap="xs" wrap="nowrap">
                          <Box className="min-w-0" style={{ flex: 1 }}>
                            <Text size="xs" fw={800} c="teal.3" truncate>
                              {order.skuCode}
                            </Text>
                            <Text size="10px" c="dimmed" truncate>
                              {order.customerName} &middot; {order.orderNumber}
                            </Text>
                          </Box>
                          <Badge size="xs" variant="filled" color={statusColor(order.status)} c="slate.9" fw={900}>
                            {order.status}
                          </Badge>
                        </Group>
                        <Group gap="lg" mt={4}>
                          <Box>
                            <Text size="9px" c="dimmed" fw={700}>QTY</Text>
                            <Text size="sm" fw={900}>{order.quantity}</Text>
                          </Box>
                          {order.pickedAt && (
                            <Box>
                              <Text size="9px" c="dimmed" fw={700}>PICKED</Text>
                              <Text size="10px" c="cyan.3">{formatTime(order.pickedAt)}</Text>
                            </Box>
                          )}
                          {order.packedAt && (
                            <Box>
                              <Text size="9px" c="dimmed" fw={700}>PACKED</Text>
                              <Text size="10px" c="violet.3">{formatTime(order.packedAt)}</Text>
                            </Box>
                          )}
                          {order.dispatchedAt && (
                            <Box>
                              <Text size="9px" c="dimmed" fw={700}>DISPATCHED</Text>
                              <Text size="10px" c="green.3">{formatTime(order.dispatchedAt)}</Text>
                            </Box>
                          )}
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing={2} horizontalSpacing="xs" fz="xs" miw={900}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>SKU</Table.Th>
                        <Table.Th>Customer</Table.Th>
                        <Table.Th style={{ textAlign: "right" }}>Qty</Table.Th>
                        <Table.Th>Picked</Table.Th>
                        <Table.Th>Packed</Table.Th>
                        <Table.Th>Dispatched</Table.Th>
                        <Table.Th>Notes</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {todayOutward.map((order) => (
                        <Table.Tr key={order.id}>
                          <Table.Td>
                            <Text size="11px" fw={900} ff="monospace" c="teal.3">{order.skuCode}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="11px" truncate maw={120}>{order.customerName}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Text size="11px" fw={900} ff="monospace">{order.quantity}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="10px" c="cyan.3">{formatTime(order.pickedAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="10px" c="violet.3">{formatTime(order.packedAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="10px" c="green.3">{formatTime(order.dispatchedAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="10px" c="dimmed" truncate maw={80}>{order.notes || "-"}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" variant="filled" color={statusColor(order.status)} c="slate.9" fw={900}>
                              {order.status}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </ScrollArea>
            ) : (
              <Paper radius="md" p="md" withBorder style={{ background: "rgba(15,23,42,0.3)" }}>
                <Group gap="xs" justify="center">
                  <Clock size={16} className="text-neutral-500" />
                  <Text size="sm" c="dimmed">No outward activity today</Text>
                </Group>
              </Paper>
            )}
            <Paper radius="md" p="xs" withBorder bg="transparent" mt="xs">
              <Group justify="space-between">
                <Text size="10px" fw={800} c="dimmed">TODAY SUMMARY</Text>
                <Group gap="md">
                  <Box ta="center">
                    <Text size="9px" c="dimmed">PICKED</Text>
                    <Text size="sm" fw={900} c="cyan.3">{totalPickedQty}</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="9px" c="dimmed">PACKED</Text>
                    <Text size="sm" fw={900} c="violet.3">{totalPackedQty}</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="9px" c="dimmed">DISPATCHED</Text>
                    <Text size="sm" fw={900} c="green.3">{totalDispatchedQty}</Text>
                  </Box>
                </Group>
              </Group>
            </Paper>
          </Tabs.Panel>

          {/* ── Movements Tab ── */}
          <Tabs.Panel value="movements">
          {todayMovements.length > 0 ? (
            <>
              <Group gap="sm" mb="xs">
                <Badge size="sm" variant="filled" color="blue" leftSection={<ArrowDownLeft size={10} />} c="slate.9" fw={900}>
                  {inwardMovements.length} Inward (+{inwardMovements.reduce((s, m) => s + m.quantityChange, 0)})
                </Badge>
                <Badge size="sm" variant="filled" color="red" leftSection={<ArrowUpRight size={10} />} c="slate.9" fw={900}>
                  {outwardMovements.length} Outward ({outwardMovements.reduce((s, m) => s + m.quantityChange, 0)})
                </Badge>
              </Group>
              <ScrollArea type="auto" h="calc(100vh - 350px)" offsetScrollbars>
                {isMobile ? (
                  <Stack gap="xs">
                    {todayMovements.map((m) => (
                      <Paper key={m.id} radius="md" p="xs" withBorder style={{ background: "rgba(15,23,42,0.5)" }}>
                        <Group justify="space-between" gap="xs" wrap="nowrap">
                          <Box className="min-w-0" style={{ flex: 1 }}>
                            <Text size="xs" fw={700} c="white" truncate>{m.productName}</Text>
                            <Text size="10px" c="dimmed">{m.skuCode} &middot; {m.reason}</Text>
                          </Box>
                          <Text size="sm" fw={900} c={m.quantityChange > 0 ? "green.4" : "red.4"}>
                            {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
                          </Text>
                        </Group>
                        <Group gap="md" mt={4}>
                          <Text size="9px" c="dimmed">After: {m.quantityAfter}</Text>
                          <Text size="9px" c="dimmed">{formatTime(m.createdAt)}</Text>
                          {m.performedByName && <Text size="9px" c="dimmed">By: {m.performedByName}</Text>}
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing={2} horizontalSpacing="xs" fz="xs" miw={800}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Time</Table.Th>
                        <Table.Th>SKU</Table.Th>
                        <Table.Th>Product</Table.Th>
                        <Table.Th style={{ textAlign: "right" }}>Change</Table.Th>
                        <Table.Th style={{ textAlign: "right" }}>After</Table.Th>
                        <Table.Th>Reason</Table.Th>
                        <Table.Th>By</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {todayMovements.map((m) => (
                        <Table.Tr key={m.id}>
                          <Table.Td>
                            <Text size="10px" c="dimmed">{formatTime(m.createdAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="11px" fw={900} ff="monospace" c="cyan.3">{m.skuCode}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="11px" truncate maw={160}>{m.productName}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Text size="11px" fw={900} ff="monospace" c={m.quantityChange > 0 ? "green.4" : "red.4"}>
                              {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Text size="11px" fw={900} ff="monospace">{m.quantityAfter}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="10px" truncate maw={100}>{m.reason}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="10px" c="dimmed">{m.performedByName || "—"}</Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </ScrollArea>
            </>
          ) : (
            <Paper radius="md" p="md" withBorder style={{ background: "rgba(15,23,42,0.3)" }}>
              <Group gap="xs" justify="center">
                <Clock size={16} className="text-neutral-500" />
                <Text size="sm" c="dimmed">No stock movements recorded today</Text>
              </Group>
            </Paper>
          )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </OperationsPage>
  );
});

// ── Sub-Components ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sublabel: string;
  color: string;
}) {
  return (
    <Paper
      radius="sm"
      p="xs"
      withBorder
      style={{
        background: "rgba(15,23,42,0.72)",
        borderColor: `var(--mantine-color-${color}-9)`,
      }}
    >
      <Group gap="xs" mb={4} wrap="nowrap">
        <Icon size={14} color={`var(--mantine-color-${color}-4)`} />
        <Text size="9px" fw={800} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.08em" }}>
          {label}
        </Text>
      </Group>
      <Text size="xl" fw={900} c="white" ff="monospace" style={{ lineHeight: 1 }}>
        {value.toLocaleString()}
      </Text>
      <Text size="9px" c="dimmed" mt={4}>
        {sublabel}
      </Text>
    </Paper>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "Dispatched": return "green";
    case "Packed": return "violet";
    case "Picked": return "cyan";
    case "Picking": return "blue";
    case "Open": return "yellow";
    case "Canceled": return "red";
    default: return "gray";
  }
}

export default TodayOperations;
