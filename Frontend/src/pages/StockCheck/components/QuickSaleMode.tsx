import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Flame,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Box,
  Group,
  Loader,
  Paper,
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

type TrendProduct = {
  productId: number;
  skuCode: string;
  productName: string;
  alias?: string | null;
  quantity7: number;
  quantity30: number;
  quantity365: number;
  orderCount30: number;
  customerCount30: number;
  currentQuantity: number;
  lastSaleAt?: string | null;
  forecast30: number;
  trendRatio: number;
};

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

const trendTone = (ratio: number) => {
  if (ratio >= 1.25) return { label: "Hot", color: "pink", icon: Flame };
  if (ratio <= 0.75) return { label: "Cooling", color: "orange", icon: TrendingDown };
  return { label: "Steady", color: "cyan", icon: TrendingUp };
};

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
    <Paper radius="md" p="sm" withBorder bg="transparent">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon size={36} radius="md" variant="light" color={color}>
          <Icon size={18} />
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

type TrendProductCardProps = {
  row: TrendProduct;
  rank: number;
  topQuantity7: number;
  topForecast: number;
  isMobile: boolean;
};

const TrendProductCard: React.FC<TrendProductCardProps> = ({
  row,
  rank,
  topQuantity7,
  topForecast,
  isMobile,
}) => {
  const tone = trendTone(row.trendRatio);
  const ToneIcon = tone.icon;
  const sevenDayWidth = topQuantity7 > 0 ? Math.max((row.quantity7 / topQuantity7) * 100, 4) : 0;
  const forecastWidth = topForecast > 0 ? Math.max((row.forecast30 / topForecast) * 100, 4) : 0;
  const stockCoverage = row.forecast30 > 0
    ? Math.round((row.currentQuantity / row.forecast30) * 30)
    : null;

  return (
    <Paper
      radius="md"
      p={isMobile ? "xs" : "sm"}
      withBorder
      style={{
        background:
          rank <= 3
            ? "linear-gradient(135deg, rgba(244,114,182,0.13), rgba(15,23,42,0.74))"
            : "rgba(15,23,42,0.42)",
        borderColor: rank <= 3 ? "rgba(244,114,182,0.22)" : "rgba(148,163,184,0.12)",
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" className="min-w-0">
            <ThemeIcon radius="md" size={isMobile ? 32 : 38} variant="light" color={rank <= 3 ? "pink" : "cyan"}>
              <Text fw={900} size={isMobile ? "xs" : "sm"}>
                {rank}
              </Text>
            </ThemeIcon>
            <Box className="min-w-0">
              <Text fw={900} size={isMobile ? "sm" : "md"} c="white" truncate>
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
          <Stack gap={3} align="flex-end" style={{ flexShrink: 0 }}>
            <Badge size="sm" variant="light" color={tone.color} leftSection={<ToneIcon size={11} />}>
              {tone.label}
            </Badge>
            <Text size="10px" c="dimmed">
              Last: {formatDate(row.lastSaleAt)}
            </Text>
          </Stack>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="xs">
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              7D Sale
            </Text>
            <Text size="lg" fw={950} c="pink.3" ff="monospace" lh={1.1}>
              {row.quantity7}
            </Text>
          </Box>
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              30D Sale
            </Text>
            <Text size="lg" fw={950} c="cyan.3" ff="monospace" lh={1.1}>
              {row.quantity30}
            </Text>
          </Box>
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              1Y Sale
            </Text>
            <Text size="lg" fw={950} c="violet.3" ff="monospace" lh={1.1}>
              {row.quantity365}
            </Text>
          </Box>
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Forecast 30D
            </Text>
            <Text size="lg" fw={950} c="green.3" ff="monospace" lh={1.1}>
              {row.forecast30}
            </Text>
          </Box>
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Stock
            </Text>
            <Text size="lg" fw={950} c={row.currentQuantity > 0 ? "white" : "orange.3"} ff="monospace" lh={1.1}>
              {row.currentQuantity}
            </Text>
          </Box>
        </SimpleGrid>

        <Stack gap={5}>
          <Box>
            <Group justify="space-between" mb={3}>
              <Text size="9px" fw={800} c="dimmed" tt="uppercase">
                Recent velocity
              </Text>
              <Text size="9px" c="dimmed">
                {row.trendRatio.toFixed(1)}x vs 30D avg.
              </Text>
            </Group>
            <Box h={6} bg="rgba(255,255,255,0.08)" style={{ borderRadius: 999, overflow: "hidden" }}>
              <Box
                h="100%"
                w={`${sevenDayWidth}%`}
                style={{
                  background: "linear-gradient(90deg, rgba(244,114,182,0.95), rgba(34,211,238,0.85))",
                  borderRadius: 999,
                }}
              />
            </Box>
          </Box>
          <Box>
            <Group justify="space-between" mb={3}>
              <Text size="9px" fw={800} c="dimmed" tt="uppercase">
                Forecast strength
              </Text>
              <Text size="9px" c={stockCoverage !== null && stockCoverage < 15 ? "orange.3" : "dimmed"}>
                {stockCoverage === null ? "No forecast" : `${stockCoverage} stock days`}
              </Text>
            </Group>
            <Box h={6} bg="rgba(255,255,255,0.08)" style={{ borderRadius: 999, overflow: "hidden" }}>
              <Box
                h="100%"
                w={`${forecastWidth}%`}
                style={{
                  background: "linear-gradient(90deg, rgba(34,197,94,0.95), rgba(250,204,21,0.85))",
                  borderRadius: 999,
                }}
              />
            </Box>
          </Box>
        </Stack>

        <SimpleGrid cols={3} spacing="xs">
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Orders
            </Text>
            <Text size="12px" fw={800} c="white">
              {row.orderCount30}
            </Text>
          </Box>
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Customers
            </Text>
            <Text size="12px" fw={800} c="white">
              {row.customerCount30}
            </Text>
          </Box>
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Need
            </Text>
            <Text size="12px" fw={800} c={row.currentQuantity < row.forecast30 ? "orange.3" : "green.3"}>
              {Math.max(row.forecast30 - row.currentQuantity, 0)}
            </Text>
          </Box>
        </SimpleGrid>
      </Stack>
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
  const [rows7, setRows7] = useState<QuickSaleProductRecord[]>([]);
  const [rows30, setRows30] = useState<QuickSaleProductRecord[]>([]);
  const [rows365, setRows365] = useState<QuickSaleProductRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadRows = async () => {
    try {
      setIsLoading(true);
      const [sevenDays, thirtyDays, oneYear] = await Promise.all([
        outwardOrdersApi.getQuickSaleProducts(7, 50),
        outwardOrdersApi.getQuickSaleProducts(30, 50),
        outwardOrdersApi.getQuickSaleProducts(365, 50),
      ]);
      setRows7(sevenDays);
      setRows30(thirtyDays);
      setRows365(oneYear);
    } catch (error: any) {
      toast.error(error.message || "Failed to load quick sale products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const trendRows = useMemo<TrendProduct[]>(() => {
    const map = new Map<number, TrendProduct>();

    const ensureRow = (row: QuickSaleProductRecord) => {
      const existing = map.get(row.productId);
      if (existing) return existing;

      const next: TrendProduct = {
        productId: row.productId,
        skuCode: row.skuCode,
        productName: row.productName,
        alias: row.alias,
        quantity7: 0,
        quantity30: 0,
        quantity365: 0,
        orderCount30: 0,
        customerCount30: 0,
        currentQuantity: row.currentQuantity,
        lastSaleAt: row.lastSaleAt,
        forecast30: 0,
        trendRatio: 0,
      };
      map.set(row.productId, next);
      return next;
    };

    rows365.forEach((row) => {
      const item = ensureRow(row);
      item.quantity365 = row.totalQuantity;
      item.currentQuantity = row.currentQuantity;
      item.lastSaleAt = row.lastSaleAt;
    });

    rows30.forEach((row) => {
      const item = ensureRow(row);
      item.quantity30 = row.totalQuantity;
      item.orderCount30 = row.orderCount;
      item.customerCount30 = row.customerCount;
      item.currentQuantity = row.currentQuantity;
      item.lastSaleAt = row.lastSaleAt;
    });

    rows7.forEach((row) => {
      const item = ensureRow(row);
      item.quantity7 = row.totalQuantity;
      item.currentQuantity = row.currentQuantity;
      item.lastSaleAt = row.lastSaleAt;
    });

    return Array.from(map.values())
      .map((row) => {
        const sevenDayRate = row.quantity7 / 7;
        const thirtyDayRate = row.quantity30 > 0 ? row.quantity30 / 30 : 0;
        return {
          ...row,
          forecast30: Math.round(sevenDayRate * 30),
          trendRatio: thirtyDayRate > 0 ? sevenDayRate / thirtyDayRate : row.quantity7 > 0 ? 2 : 0,
        };
      })
      .sort((left, right) =>
        right.trendRatio - left.trendRatio ||
        right.quantity7 - left.quantity7 ||
        right.quantity30 - left.quantity30 ||
        left.productName.localeCompare(right.productName),
      );
  }, [rows7, rows30, rows365]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trendRows;
    return trendRows.filter((row) =>
      [row.productName, row.skuCode, row.alias]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [trendRows, search]);

  const total7DaySale = trendRows.reduce((sum, row) => sum + row.quantity7, 0);
  const total30DaySale = trendRows.reduce((sum, row) => sum + row.quantity30, 0);
  const totalForecast = trendRows.reduce((sum, row) => sum + row.forecast30, 0);
  const hotCount = trendRows.filter((row) => row.trendRatio >= 1.25 && row.quantity7 > 0).length;
  const topQuantity7 = Math.max(...trendRows.map((row) => row.quantity7), 0);
  const topForecast = Math.max(...trendRows.map((row) => row.forecast30), 0);

  return (
    <Stack gap={isMobile ? "xs" : "sm"}>
      <ModeHeader
        title="Sales Forecast"
        icon={TrendingUp}
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
          background: "linear-gradient(135deg, rgba(244,114,182,0.13) 0%, rgba(14,165,233,0.09) 48%, rgba(15,23,42,0.78) 100%)",
          border: "1px solid rgba(244,114,182,0.18)",
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" align="center" gap="sm">
            <Box>
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon size={34} radius="md" variant="light" color="pink">
                  <Flame size={17} />
                </ThemeIcon>
                <Box>
                  <Text fw={900} size={isMobile ? "sm" : "md"} c="white">
                    Trending Product Forecast
                  </Text>
                  <Text size="11px" c="dimmed">
                    Compares 7D momentum with 30D demand and 1Y history.
                  </Text>
                </Box>
              </Group>
            </Box>
            <Badge size="lg" radius="md" variant="light" color="pink">
              {hotCount} Hot Products
            </Badge>
          </Group>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <MetricCard icon={ShoppingCart} label="7D Sale Qty" value={total7DaySale} color="pink" />
            <MetricCard icon={Package} label="30D Sale Qty" value={total30DaySale} color="cyan" />
            <MetricCard icon={TrendingUp} label="Forecast 30D" value={totalForecast} color="green" />
            <MetricCard icon={Flame} label="Trending SKUs" value={hotCount} color="violet" />
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
            <Loader size="sm" color="pink" />
            <Text size="sm" c="dimmed">
              Loading trend and forecast data...
            </Text>
          </Group>
        </Paper>
      ) : filteredRows.length > 0 ? (
        <Stack gap="xs">
          {filteredRows.map((row, index) => (
            <TrendProductCard
              key={row.productId}
              row={row}
              rank={index + 1}
              topQuantity7={topQuantity7}
              topForecast={topForecast}
              isMobile={isMobile}
            />
          ))}
        </Stack>
      ) : trendRows.length > 0 ? (
        <EmptyInline message="No trending products match this search." />
      ) : (
        <Paper radius="md" p="md" withBorder bg="transparent">
          <Group gap="sm" wrap="nowrap">
            <AlertTriangle size={18} color="var(--mantine-color-yellow-4)" />
            <Box>
              <Text fw={800} size="sm" c="white">
                No sale products found
              </Text>
              <Text size="xs" c="dimmed">
                Create sales orders, then return here to see trending products and forecasts.
              </Text>
            </Box>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
