import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
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

const dayOptions = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "1Y", value: "365" },
];

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

type ProductRankCardProps = {
  row: QuickSaleProductRecord;
  rank: number;
  topQuantity: number;
  isMobile: boolean;
};

const ProductRankCard: React.FC<ProductRankCardProps> = ({
  row,
  rank,
  topQuantity,
  isMobile,
}) => {
  const percent = topQuantity > 0 ? Math.max((row.totalQuantity / topQuantity) * 100, 6) : 0;

  return (
    <Paper radius="md" p={isMobile ? "xs" : "sm"} withBorder bg="transparent">
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
          <Box ta="right" style={{ flexShrink: 0 }}>
            <Text fw={900} size={isMobile ? "lg" : "xl"} c="pink.3" lh={1}>
              {row.totalQuantity}
            </Text>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Sale Qty
            </Text>
          </Box>
        </Group>

        <Box
          h={6}
          bg="rgba(255,255,255,0.08)"
          style={{ borderRadius: 999, overflow: "hidden" }}
        >
          <Box
            h="100%"
            w={`${percent}%`}
            style={{
              background: "linear-gradient(90deg, rgba(244,114,182,0.95), rgba(34,211,238,0.85))",
              borderRadius: 999,
            }}
          />
        </Box>

        <SimpleGrid cols={3} spacing="xs">
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Orders
            </Text>
            <Text size="12px" fw={800} c="white">
              {row.orderCount}
            </Text>
          </Box>
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Customers
            </Text>
            <Text size="12px" fw={800} c="white">
              {row.customerCount}
            </Text>
          </Box>
          <Box>
            <Text size="9px" fw={800} c="dimmed" tt="uppercase">
              Stock
            </Text>
            <Text size="12px" fw={800} c={row.currentQuantity > 0 ? "green.3" : "orange.3"}>
              {row.currentQuantity}
            </Text>
          </Box>
        </SimpleGrid>

        <Text size="10px" c="dimmed">
          Last sale: {formatDate(row.lastSaleAt)}
        </Text>
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
  const [days, setDays] = useState("30");
  const [rows, setRows] = useState<QuickSaleProductRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadRows = async () => {
    try {
      setIsLoading(true);
      const data = await outwardOrdersApi.getQuickSaleProducts(Number(days), 30);
      setRows(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load quick sale products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [days]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.productName, row.skuCode, row.alias]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const totalSaleQuantity = rows.reduce((sum, row) => sum + row.totalQuantity, 0);
  const totalOrders = rows.reduce((sum, row) => sum + row.orderCount, 0);
  const topQuantity = rows[0]?.totalQuantity ?? 0;

  return (
    <Stack gap={isMobile ? "xs" : "sm"}>
      <ModeHeader
        title="Quick Sale"
        icon={TrendingUp}
        onBack={onBack}
        isMobile={isMobile}
        actions={
          <Button
            variant="outline"
            size="xs"
            onClick={loadRows}
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
          background: "linear-gradient(135deg, rgba(244,114,182,0.12) 0%, rgba(15,23,42,0.72) 100%)",
          border: "1px solid rgba(244,114,182,0.18)",
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" align="center" gap="sm">
            <Box>
              <Text fw={900} size={isMobile ? "sm" : "md"} c="white">
                Most Sale Products
              </Text>
              <Text size="11px" c="dimmed">
                Ranked by outward sales quantity in selected period.
              </Text>
            </Box>
            <SegmentedControl
              size="xs"
              value={days}
              onChange={setDays}
              data={dayOptions}
              color="pink"
            />
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
            <MetricCard icon={ShoppingCart} label="Sale Qty" value={totalSaleQuantity} color="pink" />
            <MetricCard icon={Package} label="Products" value={rows.length} color="cyan" />
            <MetricCard icon={CalendarDays} label="Orders" value={totalOrders} color="violet" />
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
              Loading quick sale products...
            </Text>
          </Group>
        </Paper>
      ) : filteredRows.length > 0 ? (
        <Stack gap="xs">
          {filteredRows.map((row, index) => (
            <ProductRankCard
              key={row.productId}
              row={row}
              rank={index + 1}
              topQuantity={topQuantity}
              isMobile={isMobile}
            />
          ))}
        </Stack>
      ) : rows.length > 0 ? (
        <EmptyInline message="No quick sale products match this search." />
      ) : (
        <Paper radius="md" p="md" withBorder bg="transparent">
          <Group gap="sm" wrap="nowrap">
            <AlertTriangle size={18} color="var(--mantine-color-yellow-4)" />
            <Box>
              <Text fw={800} size="sm" c="white">
                No sale products found
              </Text>
              <Text size="xs" c="dimmed">
                Create or dispatch sales orders, then return here to see the frequently sold products.
              </Text>
            </Box>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
