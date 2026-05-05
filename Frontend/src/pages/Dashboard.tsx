import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Card,
  Center,
  Grid,
  Group,
  Paper,
  Progress,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBox,
  IconBuildingWarehouse,
  IconChartBar,
  IconClock,
  IconDatabase,
  IconMapPin,
  IconPackage,
  IconPrinter,
  IconRefreshAlert,
  IconStack2,
  IconTruckDelivery,
} from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  dashboardApi,
  type DashboardDispatchQueue,
  type DashboardSummary,
} from "../services/masterApi";
import { toast } from "../lib/toast";

interface MetricCard {
  title: string;
  value: string;
  hint: string;
  icon: typeof IconPackage;
  color: string;
  badge: string;
  link: string;
}

const emptySummary: DashboardSummary = {
  productCount: 0,
  commodityCount: 0,
  manufacturerCount: 0,
  importerCount: 0,
  binCount: 0,
  locationCount: 0,
  productQuantityCount: 0,
  skusWithStock: 0,
  zeroStockProducts: 0,
  totalStockQuantity: 0,
  allocatedQuantity: 0,
  pendingPutAwayQuantity: 0,
  poInvoiceCount: 0,
  pendingPoInvoiceCount: 0,
  pendingStickerRows: 0,
  outwardOrderCount: 0,
  openOutwardOrderCount: 0,
  pendingDispatchQuantity: 0,
  totalOutboundQuantity: 0,
  pickedOutboundQuantity: 0,
  inventoryCoveragePercent: 0,
  locationUtilizationPercent: 0,
  dispatchProgressPercent: 0,
  quantityMix: [],
  topStockPositions: [],
  activeDispatchQueue: [],
  recentStockMovements: [],
};

const chartColors = [
  "var(--mantine-color-cyan-6)",
  "var(--mantine-color-indigo-6)",
  "var(--mantine-color-orange-6)",
  "var(--mantine-color-teal-6)",
];

const statusColor: Record<string, string> = {
  Open: "orange",
  Picking: "blue",
  Packed: "violet",
  Dispatched: "green",
};

const formatNumber = (value: number) => value.toLocaleString("en-IN");

const orderPendingQuantity = (order: DashboardDispatchQueue) =>
  Math.max(order.pendingQuantity ?? 0, 0);

export const Dashboard = memo(function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextSummary = await dashboardApi.getSummary();
        if (isMounted) setSummary(nextSummary);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load live dashboard summary";
        if (isMounted) setError(message);
        toast.error("Dashboard summary failed to load");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics: MetricCard[] = useMemo(
    () => [
      {
        title: "Inventory Units",
        value: formatNumber(summary.totalStockQuantity),
        hint: `${summary.skusWithStock} SKUs with stock`,
        icon: IconBox,
        color: "cyan",
        badge: `${summary.inventoryCoveragePercent}% covered`,
        link: "/stock-check",
      },
      {
        title: "Inbound Rows",
        value: formatNumber(summary.poInvoiceCount),
        hint: `${summary.pendingPoInvoiceCount} need action`,
        icon: IconArrowDownLeft,
        color: "blue",
        badge: `${formatNumber(summary.pendingPutAwayQuantity)} pending`,
        link: "/inward",
      },
      {
        title: "Dispatch Orders",
        value: formatNumber(summary.outwardOrderCount),
        hint: `${summary.openOutwardOrderCount} active orders`,
        icon: IconArrowUpRight,
        color: "teal",
        badge: `${formatNumber(summary.pendingDispatchQuantity)} pending`,
        link: "/outward",
      },
      {
        title: "Warehouse Map",
        value: formatNumber(summary.locationCount),
        hint: `${summary.binCount} bins registered`,
        icon: IconBuildingWarehouse,
        color: "indigo",
        badge: `${summary.locationUtilizationPercent}% allotted`,
        link: "/warehouse-map",
      },
    ],
    [summary],
  );

  if (isLoading) {
    return (
      <Stack gap="md">
        <Skeleton height={88} radius="md" />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} gap="md">
          <Skeleton height={132} radius="md" />
          <Skeleton height={132} radius="md" />
          <Skeleton height={132} radius="md" />
          <Skeleton height={132} radius="md" />
        </SimpleGrid>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Skeleton height={392} radius="md" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Skeleton height={392} radius="md" />
          </Grid.Col>
        </Grid>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {error ? (
        <Alert
          color="red"
          variant="light"
          icon={<IconRefreshAlert size={18} />}
          title="Live dashboard summary unavailable"
        >
          {error}
        </Alert>
      ) : null}

      <Paper
        p="md"
        withBorder
        radius="md"
        style={{
          background: "rgba(8, 14, 25, 0.72)",
          borderColor: "rgba(148, 163, 184, 0.12)",
          backdropFilter: "blur(16px)",
        }}
      >
        <Group justify="space-between" align="center" gap="md">
          <Group gap="md">
            <ThemeIcon size={44} radius="md" color="cyan" variant="light">
              <IconDatabase size={24} />
            </ThemeIcon>
            <Box>
              <Group gap="xs">
                <Text fw={800} c="white">
                  Live WMS Database Dashboard
                </Text>
                <Badge color="green" variant="dot">
                  Summary API
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Compact live totals from PostgreSQL-backed endpoints without
                loading full transaction tables into the browser.
              </Text>
            </Box>
          </Group>
          <Group gap="xs">
            <Badge variant="light" color="blue">
              {formatNumber(summary.productCount)} products
            </Badge>
            <Badge variant="light" color="grape">
              {formatNumber(summary.manufacturerCount)} manufacturers
            </Badge>
            <Badge variant="light" color="gray">
              {formatNumber(summary.importerCount)} importers
            </Badge>
          </Group>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} gap="md">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.22 }}
          >
            <Link to={metric.link} className="no-underline">
              <Card p="md" withBorder radius="md" mih={132}>
                <Group justify="space-between" align="flex-start" mb="md">
                  <ThemeIcon color={metric.color} variant="light" size={42}>
                    <metric.icon size={22} />
                  </ThemeIcon>
                  <Badge color={metric.color} variant="light">
                    {metric.badge}
                  </Badge>
                </Group>
                <Text size="xs" fw={800} c="dimmed" tt="uppercase">
                  {metric.title}
                </Text>
                <Group align="flex-end" gap="xs" mt={4}>
                  <Text size="xl" fw={900} c="white">
                    {metric.value}
                  </Text>
                  <Text size="xs" c="dimmed" pb={4}>
                    {metric.hint}
                  </Text>
                </Group>
              </Card>
            </Link>
          </motion.div>
        ))}
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }} gap="md">
              <Link to="/inward" className="no-underline">
                <Card withBorder radius="md" p="md">
                  <Group gap="sm">
                    <ThemeIcon color="violet" variant="light" size={40}>
                      <IconPrinter size={22} />
                    </ThemeIcon>
                    <Box>
                      <Text size="xs" c="dimmed" fw={800} tt="uppercase">
                        Stickers
                      </Text>
                      <Text size="sm" fw={800}>
                        {formatNumber(summary.pendingStickerRows)} rows pending
                      </Text>
                    </Box>
                  </Group>
                </Card>
              </Link>

              <Link to="/putaway" className="no-underline">
                <Card withBorder radius="md" p="md">
                  <Group gap="sm">
                    <ThemeIcon color="orange" variant="light" size={40}>
                      <IconMapPin size={22} />
                    </ThemeIcon>
                    <Box>
                      <Text size="xs" c="dimmed" fw={800} tt="uppercase">
                        Put Away
                      </Text>
                      <Text size="sm" fw={800}>
                        {formatNumber(summary.pendingPutAwayQuantity)} units open
                      </Text>
                    </Box>
                  </Group>
                </Card>
              </Link>

              <Link to="/packing" className="no-underline">
                <Card withBorder radius="md" p="md">
                  <Group gap="sm">
                    <ThemeIcon color="teal" variant="light" size={40}>
                      <IconTruckDelivery size={22} />
                    </ThemeIcon>
                    <Box>
                      <Text size="xs" c="dimmed" fw={800} tt="uppercase">
                        Pick Pack
                      </Text>
                      <Text size="sm" fw={800}>
                        {formatNumber(summary.openOutwardOrderCount)} active
                      </Text>
                    </Box>
                  </Group>
                </Card>
              </Link>
            </SimpleGrid>

            <Card withBorder p="md" radius="md">
              <Group justify="space-between" mb="lg">
                <Group gap="xs">
                  <IconChartBar size={20} color="var(--mantine-color-cyan-4)" />
                  <Text fw={800}>Operational Quantity Mix</Text>
                </Group>
                <Badge variant="outline">Aggregate query</Badge>
              </Group>
              <Box h={300} style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.quantityMix}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(148, 163, 184, 0.14)"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--mantine-color-dark-1)", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--mantine-color-dark-1)", fontSize: 11 }}
                    />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 38, 0.98)",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: 8,
                      }}
                      cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={42}>
                      {summary.quantityMix.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card withBorder radius="md" p="md" h="100%">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <IconStack2 size={18} color="var(--mantine-color-cyan-4)" />
                <Text fw={800}>Database Health</Text>
              </Group>
              <Tooltip label="Computed by backend aggregate queries">
                <ThemeIcon color="gray" variant="light" size="sm">
                  <IconClock size={14} />
                </ThemeIcon>
              </Tooltip>
            </Group>

            <SimpleGrid cols={2} spacing="sm" mb="md">
              <Paper withBorder p="sm" radius="md">
                <RingProgress
                  size={86}
                  thickness={8}
                  roundCaps
                  sections={[
                    { value: summary.inventoryCoveragePercent, color: "cyan" },
                  ]}
                  label={
                    <Center>
                      <Text size="xs" fw={800}>
                        {summary.inventoryCoveragePercent}%
                      </Text>
                    </Center>
                  }
                />
                <Text size="xs" c="dimmed" fw={700} ta="center">
                  Inventory coverage
                </Text>
              </Paper>
              <Paper withBorder p="sm" radius="md">
                <RingProgress
                  size={86}
                  thickness={8}
                  roundCaps
                  sections={[
                    { value: summary.dispatchProgressPercent, color: "teal" },
                  ]}
                  label={
                    <Center>
                      <Text size="xs" fw={800}>
                        {summary.dispatchProgressPercent}%
                      </Text>
                    </Center>
                  }
                />
                <Text size="xs" c="dimmed" fw={700} ta="center">
                  Dispatch picked
                </Text>
              </Paper>
            </SimpleGrid>

            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" fw={700}>
                  Location utilization
                </Text>
                <Text size="sm" fw={800}>
                  {summary.locationUtilizationPercent}%
                </Text>
              </Group>
              <Progress value={summary.locationUtilizationPercent} color="indigo" />

              <Group justify="space-between">
                <Text size="sm" fw={700}>
                  Zero-stock products
                </Text>
                <Badge
                  color={summary.zeroStockProducts > 0 ? "orange" : "green"}
                  variant="light"
                >
                  {formatNumber(summary.zeroStockProducts)}
                </Badge>
              </Group>

              <Group justify="space-between">
                <Text size="sm" fw={700}>
                  Master data
                </Text>
                <Text size="sm" c="dimmed">
                  {formatNumber(summary.commodityCount)} commodity groups
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card withBorder radius="md" p={0}>
            <Group justify="space-between" p="md" pb="xs">
              <Group gap="xs">
                <IconPackage size={18} color="var(--mantine-color-cyan-4)" />
                <Text fw={800}>Top Stock Positions</Text>
              </Group>
              <Badge variant="light">
                {formatNumber(summary.topStockPositions.length)} rows
              </Badge>
            </Group>
            <ScrollArea>
              <Table striped highlightOnHover withTableBorder={false}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Product</Table.Th>
                    <Table.Th ta="right">Current Qty</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary.topStockPositions.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Badge variant="light" color="gray">
                          {item.skuCode}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} lineClamp={1}>
                          {item.productName}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={800}>{formatNumber(item.currentQuantity)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {summary.topStockPositions.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={3}>
                        <Center py="lg">
                          <Text size="sm" c="dimmed">
                            No stock quantities available from database.
                          </Text>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : null}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card withBorder radius="md" p={0} h="100%">
            <Group justify="space-between" p="md" pb="xs">
              <Group gap="xs">
                <IconAlertTriangle
                  size={18}
                  color="var(--mantine-color-orange-4)"
                />
                <Text fw={800}>Active Dispatch Queue</Text>
              </Group>
              <Badge color="orange" variant="light">
                {formatNumber(summary.openOutwardOrderCount)} open
              </Badge>
            </Group>
            <ScrollArea h={280}>
              <Stack gap="xs" p="md" pt="xs">
                {summary.activeDispatchQueue.map((order) => (
                  <Paper key={order.id} withBorder radius="md" p="sm">
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <Box style={{ minWidth: 0 }}>
                        <Text size="sm" fw={800} lineClamp={1}>
                          {order.orderNumber}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {order.customerName} · {order.productName}
                        </Text>
                      </Box>
                      <Stack gap={2} align="flex-end">
                        <Badge
                          color={statusColor[order.status] ?? "gray"}
                          variant="light"
                        >
                          {order.status}
                        </Badge>
                        <Text size="xs" fw={700}>
                          {formatNumber(orderPendingQuantity(order))} left
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                ))}
                {summary.activeDispatchQueue.length === 0 ? (
                  <Center py="xl">
                    <Text size="sm" c="dimmed">
                      No active dispatch orders.
                    </Text>
                  </Center>
                ) : null}
              </Stack>
            </ScrollArea>
          </Card>
        </Grid.Col>
      </Grid>

      <Card withBorder radius="md" p={0}>
        <Group justify="space-between" p="md" pb="xs">
          <Group gap="xs">
            <IconClock size={18} color="var(--mantine-color-cyan-4)" />
            <Text fw={800}>Recent Stock Movements</Text>
          </Group>
          <Badge variant="outline">Top 8</Badge>
        </Group>
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Time</Table.Th>
                <Table.Th>Product</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th ta="right">Change</Table.Th>
                <Table.Th ta="right">Balance</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {summary.recentStockMovements.map((movement) => (
                <Table.Tr key={movement.id}>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {new Date(movement.createdAt).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={700} lineClamp={1}>
                      {movement.productName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {movement.skuCode}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="gray">
                      {movement.reason}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text
                      fw={800}
                      c={movement.quantityChange >= 0 ? "green.4" : "red.4"}
                    >
                      {movement.quantityChange >= 0 ? "+" : ""}
                      {formatNumber(movement.quantityChange)}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text fw={800}>{formatNumber(movement.quantityAfter)}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
              {summary.recentStockMovements.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Text size="sm" c="dimmed">
                        No product stock movements recorded yet.
                      </Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  );
});

export default Dashboard;
