import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  PackageSearch,
  RefreshCw,
  Search,
  ShoppingCart,
  Trophy,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  Box,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";

import { Button } from "../../../components/atoms/Button";
import { toast } from "../../../lib/toast";
import {
  outwardOrdersApi,
  QuickSaleProductRecord,
} from "../../../services/masterApi";
import { ModeHeader } from "./ModeHeader";
import { EmptyInline } from "./SharedComponents";

type TimeframeOption = {
  value: string;
  days: number;
  label: string;
  caption: string;
};

const TIMEFRAMES: TimeframeOption[] = [
  { value: "7", days: 7, label: "7D", caption: "Week" },
  { value: "30", days: 30, label: "30D", caption: "Month" },
  { value: "90", days: 90, label: "90D", caption: "Quarter" },
  { value: "365", days: 365, label: "1Y", caption: "Year" },
];

const TOP_LIMIT = 100;

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
};

const shortenLabel = (value: string) =>
  value.length > 16 ? `${value.slice(0, 15)}...` : value;

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Paper radius="md" p="sm" withBorder bg="rgba(15,23,42,0.42)">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon size={34} radius="md" variant="light" color={color}>
          <Icon size={17} />
        </ThemeIcon>
        <Box className="min-w-0">
          <Text size="10px" fw={800} c="dimmed" tt="uppercase">
            {label}
          </Text>
          <Text size="lg" fw={900} c="white" lh={1.1}>
            {value}
          </Text>
        </Box>
      </Group>
    </Paper>
  );
}

type ProductOrderCardProps = {
  row: QuickSaleProductRecord;
  rank: number;
  topOrderCount: number;
  isMobile: boolean;
};

const ProductOrderCard: React.FC<ProductOrderCardProps> = ({
  row,
  rank,
  topOrderCount,
  isMobile,
}) => {
  const width = topOrderCount > 0 ? Math.max((row.orderCount / topOrderCount) * 100, 5) : 0;
  const rankColor = rank <= 3 ? "yellow" : "cyan";

  return (
    <Paper
      radius="md"
      p={isMobile ? "xs" : "sm"}
      withBorder
      style={{
        background:
          rank <= 3
            ? "linear-gradient(135deg, rgba(250,204,21,0.12), rgba(15,23,42,0.82))"
            : "rgba(15,23,42,0.52)",
        borderColor: rank <= 3 ? "rgba(250,204,21,0.22)" : "rgba(148,163,184,0.13)",
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" className="min-w-0">
            <ThemeIcon radius="md" size={34} variant="light" color={rankColor}>
              <Text fw={950} size="sm">
                {rank}
              </Text>
            </ThemeIcon>
            <Box className="min-w-0">
              <Text fw={900} size="sm" c="white" truncate>
                {row.productName || "Unnamed Product"}
              </Text>
              <Group gap={6} wrap="nowrap">
                <Text ff="monospace" size="11px" fw={800} c="cyan.3" truncate>
                  {row.skuCode || "-"}
                </Text>
                {row.alias && (
                  <Badge size="xs" variant="light" color="gray" radius="sm">
                    {row.alias}
                  </Badge>
                )}
              </Group>
            </Box>
          </Group>
          <Box ta="right" style={{ flexShrink: 0 }}>
            <Text size="10px" fw={800} c="dimmed" tt="uppercase">
              Sales Orders
            </Text>
            <Text size="xl" fw={950} c="yellow.3" ff="monospace" lh={1}>
              {formatNumber(row.orderCount)}
            </Text>
          </Box>
        </Group>

        <Box>
          <Group justify="space-between" mb={4}>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Share vs top product
            </Text>
            <Text size="9px" c="dimmed">
              {topOrderCount > 0 ? Math.round((row.orderCount / topOrderCount) * 100) : 0}%
            </Text>
          </Group>
          <Box h={7} bg="rgba(255,255,255,0.08)" style={{ borderRadius: 999, overflow: "hidden" }}>
            <Box
              h="100%"
              w={`${width}%`}
              style={{
                background: "linear-gradient(90deg, rgba(250,204,21,0.96), rgba(45,212,191,0.9))",
                borderRadius: 999,
              }}
            />
          </Box>
        </Box>

        <SimpleGrid cols={2} spacing="xs">
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Customers
            </Text>
            <Text size="12px" fw={800} c="white">
              {formatNumber(row.customerCount)}
            </Text>
          </Box>
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Last Order
            </Text>
            <Text size="12px" fw={800} c="white" truncate>
              {formatDate(row.lastSaleAt)}
            </Text>
          </Box>
        </SimpleGrid>
      </Stack>
    </Paper>
  );
};

const OrderChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as QuickSaleProductRecord & { rankLabel: string };

  return (
    <Paper radius="md" p="xs" withBorder bg="rgba(15,23,42,0.95)">
      <Text size="xs" fw={900} c="white">
        {row.productName}
      </Text>
      <Text size="11px" c="cyan.3" ff="monospace">
        {row.skuCode || "-"}
      </Text>
      <Text size="11px" c="yellow.3" fw={800}>
        Sales Orders: {formatNumber(row.orderCount)}
      </Text>
    </Paper>
  );
};

export function QuickSaleMode({
  onBack,
  isMobile,
}: {
  onBack: () => void;
  isMobile: boolean;
}) {
  const [selectedDays, setSelectedDays] = useState("30");
  const [rows, setRows] = useState<QuickSaleProductRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const activeTimeframe = TIMEFRAMES.find((item) => item.value === selectedDays) ?? TIMEFRAMES[1];

  const loadRows = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await outwardOrdersApi.getQuickSaleProducts(activeTimeframe.days, TOP_LIMIT);
      setRows(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load top sale-order products");
    } finally {
      setIsLoading(false);
    }
  }, [activeTimeframe.days]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.productName, row.skuCode, row.alias]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const chartRows = useMemo(
    () =>
      filteredRows.map((row, index) => ({
        ...row,
        rankLabel: `#${index + 1}`,
        chartLabel: shortenLabel(row.productName || row.skuCode || `Product ${index + 1}`),
      })),
    [filteredRows],
  );

  const topOrderCount = Math.max(...filteredRows.map((row) => row.orderCount), 0);
  const totalOrders = filteredRows.reduce((sum, row) => sum + row.orderCount, 0);
  const topProduct = filteredRows[0];
  const averageOrderCount =
    filteredRows.length > 0 ? Math.round(totalOrders / filteredRows.length) : 0;

  return (
    <Stack gap={isMobile ? "xs" : "sm"}>
      <ModeHeader
        title="Quick Sale"
        icon={BarChart3}
        onBack={onBack}
        isMobile={isMobile}
        actions={
          <Button
            variant="outline"
            size="xs"
            onClick={() => void loadRows()}
            disabled={isLoading}
            leftIcon={<RefreshCw className={isLoading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />}
          >
            Refresh
          </Button>
        }
      />

      <Paper
        radius="lg"
        p={isMobile ? "xs" : "sm"}
        style={{
          background: "linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(250,204,21,0.08) 48%, rgba(15,23,42,0.82) 100%)",
          border: "1px solid rgba(148,163,184,0.16)",
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" gap="sm">
            <Group gap="xs" wrap="nowrap" className="min-w-0">
              <ThemeIcon size={34} radius="md" variant="light" color="yellow">
                <Trophy size={17} />
              </ThemeIcon>
              <Box className="min-w-0">
                <Text fw={900} size={isMobile ? "sm" : "md"} c="white">
                  Top 100 Products by Sales Order Count
                </Text>
                <Text size="11px" c="dimmed">
                  Ranking uses how many sales orders include each product.
                </Text>
              </Box>
            </Group>
            <Badge size="lg" radius="md" variant="light" color="yellow">
              {activeTimeframe.caption}
            </Badge>
          </Group>

          <Group gap="xs" align="center">
            <SegmentedControl
              value={selectedDays}
              onChange={setSelectedDays}
              data={TIMEFRAMES.map((item) => ({ label: item.label, value: item.value }))}
              size={isMobile ? "xs" : "sm"}
              color="cyan"
            />
            <Text size="11px" c="dimmed">
              Top {TOP_LIMIT} most repeated products in sales orders
            </Text>
          </Group>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <MetricCard icon={ShoppingCart} label="Sales Orders" value={formatNumber(totalOrders)} color="yellow" />
            <MetricCard icon={PackageSearch} label="Products" value={filteredRows.length} color="cyan" />
            <MetricCard icon={Users} label="Top Customers" value={formatNumber(filteredRows.reduce((sum, row) => sum + row.customerCount, 0))} color="teal" />
            <MetricCard icon={CalendarDays} label="Avg Orders" value={formatNumber(averageOrderCount)} color="violet" />
          </SimpleGrid>

          <TextInput
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search product, SKU, alias"
            leftSection={<Search size={15} />}
            size={isMobile ? "xs" : "sm"}
          />
        </Stack>
      </Paper>

      {isLoading ? (
        <Paper radius="md" p="lg" withBorder bg="transparent">
          <Group justify="center" gap="sm">
            <Loader size="sm" color="cyan" />
            <Text size="sm" c="dimmed">
              Loading top ordered products...
            </Text>
          </Group>
        </Paper>
      ) : filteredRows.length > 0 ? (
        <Stack gap="xs">
          <Paper radius="lg" p={isMobile ? "xs" : "sm"} withBorder bg="rgba(15,23,42,0.5)">
            <Group justify="space-between" mb="xs" wrap="nowrap">
              <Box className="min-w-0">
                <Text fw={900} size="sm" c="white">
                  Sales Order Count Bar Graph
                </Text>
                <Text size="11px" c="dimmed" truncate>
                  Highest: {topProduct?.productName || "-"} ({formatNumber(topProduct?.orderCount ?? 0)} orders)
                </Text>
              </Box>
              <Badge size="sm" variant="light" color="cyan">
                {activeTimeframe.label}
              </Badge>
            </Group>
            <Box h={isMobile ? 300 : 360} style={{ overflowX: "auto", overflowY: "hidden" }}>
              <Box h="100%" style={{ minWidth: Math.max(chartRows.length * 30, 600) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 12, right: 10, left: -22, bottom: isMobile ? 54 : 42 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
                    <XAxis
                      dataKey="chartLabel"
                      angle={isMobile ? -55 : -45}
                      textAnchor="end"
                      interval={0}
                      height={isMobile ? 70 : 58}
                      tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 9 }}
                      axisLine={{ stroke: "rgba(148,163,184,0.22)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<OrderChartTooltip />} />
                    <Bar dataKey="orderCount" name="Sales Orders" fill="#facc15" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Paper>

          <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="xs">
            {filteredRows.map((row, index) => (
              <ProductOrderCard
                key={row.productId}
                row={row}
                rank={index + 1}
                topOrderCount={topOrderCount}
                isMobile={isMobile}
              />
            ))}
          </SimpleGrid>
        </Stack>
      ) : rows.length > 0 ? (
        <EmptyInline message="No top ordered products match this search." />
      ) : (
        <Paper radius="md" p="md" withBorder bg="transparent">
          <Group gap="sm" wrap="nowrap">
            <AlertTriangle size={18} color="var(--mantine-color-yellow-4)" />
            <Box>
              <Text fw={800} size="sm" c="white">
                No sale-order products found
              </Text>
              <Text size="xs" c="dimmed">
                Create sales orders, then return here to see the top 100 products by sales-order count.
              </Text>
            </Box>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
