import React, { useState, useEffect } from "react";
import {
  Table, Group, Text, Badge, Card, Center, Loader, TextInput,
  ActionIcon, SegmentedControl, ThemeIcon, Tooltip, Paper,
} from "@mantine/core";
import {
  Search, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  TrendingDown, TrendingUp, Minus, Download,
} from "lucide-react";
import {
  productsApi, tallySyncApi, Product,
  productQuantitiesApi, ProductQuantityRecord,
} from "../../../services/masterApi";
import { OperationsPage } from "../../../components/organisms/Operations/OperationsShell";
import { ModeHeader } from "./ModeHeader";

interface TallyDifferenceModeProps {
  onBack?: () => void;
  isMobile?: boolean;
}

/* ─── SKU Match types ─── */
type SkuFilterType = "all" | "matched" | "unmatched";

interface ComparisonRow {
  tallyName: string;
  tallySkuCode: string;
  wmsSku: string | null;
  wmsProductName: string | null;
  isMatched: boolean;
}

/* ─── Stock Diff types ─── */
type StockFilterType = "all" | "excess" | "shortage" | "match";

interface StockDiffRow {
  sku: string;
  productName: string;
  tallyName: string;
  wmsQty: number;
  tallyQty: number;
  difference: number; // wmsQty - tallyQty
}

/* ─── View modes ─── */
type ViewMode = "sku-match" | "stock-diff";

export const TallyDifferenceMode: React.FC<TallyDifferenceModeProps> = ({ onBack, isMobile }) => {
  const [viewMode, setViewMode] = useState<ViewMode>("sku-match");

  // Shared data
  const [wmsProducts, setWmsProducts] = useState<Product[]>([]);
  const [tallyItems, setTallyItems] = useState<any[]>([]);
  const [wmsQuantities, setWmsQuantities] = useState<ProductQuantityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // SKU Match filter
  const [skuFilter, setSkuFilter] = useState<SkuFilterType>("all");
  // Stock Diff filter
  const [stockFilter, setStockFilter] = useState<StockFilterType>("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wmsRes, tallyData, qtyData] = await Promise.all([
        productsApi.getAll(),
        tallySyncApi.getStockItems(),
        productQuantitiesApi.getAll(),
      ]);
      setWmsProducts(wmsRes);
      setTallyItems(tallyData);
      setWmsQuantities(qtyData);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ────────────────────────── SKU MATCH LOGIC ────────────────────────── */

  const comparisonRows = React.useMemo<ComparisonRow[]>(() => {
    if (!tallyItems.length) return [];

    const skuMap = new Map<string, Product>();
    for (const p of wmsProducts) {
      const sku = (p.sku || "").trim().toLowerCase();
      if (sku) skuMap.set(sku, p);
    }

    return tallyItems
      .filter(t => {
        const code = (t.skuCode || "").trim().toLowerCase();
        return code !== "" && code !== "na";
      })
      .map(t => {
        const code = (t.skuCode || "").trim().toLowerCase();
        const matchedProduct = skuMap.get(code) ?? null;

        return {
          tallyName: t.name || "",
          tallySkuCode: t.skuCode || "",
          wmsSku: matchedProduct?.sku ?? null,
          wmsProductName: matchedProduct?.name ?? null,
          isMatched: matchedProduct !== null,
        };
      })
      .sort((a, b) => {
        if (a.isMatched === b.isMatched) return a.tallyName.localeCompare(b.tallyName);
        return a.isMatched ? 1 : -1;
      });
  }, [wmsProducts, tallyItems]);

  const filteredSkuRows = React.useMemo(() => {
    let rows = comparisonRows;
    if (skuFilter === "matched") rows = rows.filter(r => r.isMatched);
    else if (skuFilter === "unmatched") rows = rows.filter(r => !r.isMatched);

    if (search) {
      const lowerSearch = search.toLowerCase();
      rows = rows.filter(r =>
        r.tallyName.toLowerCase().includes(lowerSearch) ||
        r.tallySkuCode.toLowerCase().includes(lowerSearch) ||
        (r.wmsSku || "").toLowerCase().includes(lowerSearch) ||
        (r.wmsProductName || "").toLowerCase().includes(lowerSearch)
      );
    }
    return rows;
  }, [comparisonRows, skuFilter, search]);

  const matchedCount = comparisonRows.filter(r => r.isMatched).length;
  const unmatchedCount = comparisonRows.filter(r => !r.isMatched).length;

  /* ────────────────────────── STOCK DIFF LOGIC ────────────────────────── */

  const stockDiffRows = React.useMemo<StockDiffRow[]>(() => {
    if (!tallyItems.length) return [];

    // Build qty map: sku (lower) -> currentQuantity
    const qtyMap = new Map<string, number>();
    for (const q of wmsQuantities) {
      const sku = (q.skuCode || "").trim().toLowerCase();
      if (sku) qtyMap.set(sku, (qtyMap.get(sku) || 0) + q.currentQuantity);
    }

    // Build product name map
    const nameMap = new Map<string, string>();
    for (const p of wmsProducts) {
      const sku = (p.sku || "").trim().toLowerCase();
      if (sku) nameMap.set(sku, p.name);
    }

    return tallyItems
      .filter(t => {
        const code = (t.skuCode || "").trim().toLowerCase();
        return code !== "" && code !== "na";
      })
      .map(t => {
        const code = (t.skuCode || "").trim().toLowerCase();
        const wmsQty = qtyMap.get(code) ?? 0;
        const tallyQty = typeof t.closingBalance === "number" ? t.closingBalance : parseFloat(t.closingBalance || "0") || 0;

        return {
          sku: t.skuCode || "",
          productName: nameMap.get(code) || t.name || "",
          tallyName: t.name || "",
          wmsQty,
          tallyQty,
          difference: wmsQty - tallyQty,
        };
      })
      .sort((a, b) => {
        // Sort by absolute difference descending (biggest mismatches first)
        const absDiff = Math.abs(b.difference) - Math.abs(a.difference);
        if (absDiff !== 0) return absDiff;
        return a.sku.localeCompare(b.sku);
      });
  }, [wmsProducts, wmsQuantities, tallyItems]);

  const filteredStockRows = React.useMemo(() => {
    let rows = stockDiffRows;
    if (stockFilter === "excess") rows = rows.filter(r => r.difference > 0);
    else if (stockFilter === "shortage") rows = rows.filter(r => r.difference < 0);
    else if (stockFilter === "match") rows = rows.filter(r => r.difference === 0);

    if (search) {
      const lowerSearch = search.toLowerCase();
      rows = rows.filter(r =>
        r.sku.toLowerCase().includes(lowerSearch) ||
        r.productName.toLowerCase().includes(lowerSearch) ||
        r.tallyName.toLowerCase().includes(lowerSearch)
      );
    }
    return rows;
  }, [stockDiffRows, stockFilter, search]);

  const excessCount = stockDiffRows.filter(r => r.difference > 0).length;
  const shortageCount = stockDiffRows.filter(r => r.difference < 0).length;
  const stockMatchCount = stockDiffRows.filter(r => r.difference === 0).length;

  const totalWmsQty = stockDiffRows.reduce((sum, r) => sum + r.wmsQty, 0);
  const totalTallyQty = stockDiffRows.reduce((sum, r) => sum + r.tallyQty, 0);
  const totalDiff = stockDiffRows.reduce((sum, r) => sum + r.difference, 0);

  /* ────────────────────────── CSV Export ────────────────────────── */

  const handleExportCsv = () => {
    const rows = filteredStockRows;
    if (!rows.length) return;
    const headers = ["SKU", "Product Name", "Tally Name", "WMS Qty", "Tally Qty", "Difference"];
    const csvContent = [
      headers.join(","),
      ...rows.map(r =>
        [
          `"${r.sku}"`,
          `"${r.productName}"`,
          `"${r.tallyName}"`,
          r.wmsQty,
          r.tallyQty,
          r.difference,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock_difference_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ────────────────────────── RENDER ────────────────────────── */

  return (
    <OperationsPage title="Tally Reconciliation" description="Compare Tally stock items with WMS products." icon={AlertTriangle} hideHeader>
      <ModeHeader title="Tally Difference" icon={AlertTriangle} onBack={onBack!} isMobile={!!isMobile} />

      {/* ─── View mode toggle ─── */}
      <Paper
        radius="md"
        p="xs"
        mb="sm"
        style={{
          background: "linear-gradient(135deg, rgba(250,82,82,0.08) 0%, rgba(15,23,42,0.8) 100%)",
          border: "1px solid rgba(250,82,82,0.15)",
        }}
      >
        <Group justify="center">
          <SegmentedControl
            size="sm"
            radius="md"
            value={viewMode}
            onChange={(v) => {
              setViewMode(v as ViewMode);
              setSearch("");
            }}
            data={[
              { value: "sku-match", label: "🔗 SKU Match" },
              { value: "stock-diff", label: "📊 Stock Difference" },
            ]}
            styles={{
              root: { backgroundColor: "rgba(15,23,42,0.6)" },
            }}
          />
        </Group>
      </Paper>

      {viewMode === "sku-match" ? (
        /* ═══════════════ SKU MATCH VIEW ═══════════════ */
        <Card shadow="sm" p="lg" radius="md" withBorder bg="dark.7" mt="md">
          <Group justify="space-between" mb="md" wrap="wrap">
            <Group gap="sm">
              <Text size="xl" fw={700} c="white">SKU vs Part No. Comparison</Text>
              <Badge color="green" variant="light">{matchedCount} Matched</Badge>
              <Badge color="red" variant="light">{unmatchedCount} Unmatched</Badge>
            </Group>
            <Group gap="sm">
              <SegmentedControl
                size="xs"
                radius="md"
                value={skuFilter}
                onChange={(v) => setSkuFilter(v as SkuFilterType)}
                data={[
                  { value: "all", label: `All (${comparisonRows.length})` },
                  { value: "matched", label: `Matched (${matchedCount})` },
                  { value: "unmatched", label: `Unmatched (${unmatchedCount})` },
                ]}
              />
              <TextInput
                placeholder="Search name, SKU, Part No..."
                leftSection={<Search size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                w={250}
                size="xs"
                radius="md"
              />
              <ActionIcon onClick={fetchData} variant="light" color="blue" size="lg" radius="md">
                <RefreshCw size={18} />
              </ActionIcon>
            </Group>
          </Group>

          {loading ? (
            <Center p="xl"><Loader size="lg" type="dots" /></Center>
          ) : error ? (
            <Center p="xl"><Text c="red">{error}</Text></Center>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover verticalSpacing="xs" style={{ minWidth: 900 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 50, textAlign: "center" }}>Match</Table.Th>
                    <Table.Th>Tally Name</Table.Th>
                    <Table.Th>Tally SKU Code</Table.Th>
                    <Table.Th>WMS SKU</Table.Th>
                    <Table.Th>WMS Product Name</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredSkuRows.length > 0 ? (
                    filteredSkuRows.map((row, idx) => (
                      <Table.Tr
                        key={idx}
                        style={{
                          backgroundColor: row.isMatched
                            ? 'rgba(64, 192, 87, 0.06)'
                            : 'rgba(250, 82, 82, 0.08)',
                        }}
                      >
                        <Table.Td style={{ textAlign: "center" }}>
                          {row.isMatched ? (
                            <Tooltip label="SKU matches Part No.">
                              <ThemeIcon variant="light" color="green" size="sm" radius="xl">
                                <CheckCircle2 size={14} />
                              </ThemeIcon>
                            </Tooltip>
                          ) : (
                            <Tooltip label="No matching SKU in WMS">
                              <ThemeIcon variant="light" color="red" size="sm" radius="xl">
                                <XCircle size={14} />
                              </ThemeIcon>
                            </Tooltip>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={500} c="white">{row.tallyName}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={row.isMatched ? "green" : "yellow"}
                            variant="outline"
                            size="sm"
                          >
                            {row.tallySkuCode}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {row.wmsSku ? (
                            <Badge color="blue" variant="light" size="sm">
                              {row.wmsSku}
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c={row.wmsProductName ? "white" : "dimmed"}>
                            {row.wmsProductName || "—"}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Center p="xl">
                          <Text c="dimmed">No items to display.</Text>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </div>
          )}
        </Card>
      ) : (
        /* ═══════════════ STOCK DIFFERENCE VIEW ═══════════════ */
        <Card shadow="sm" p="lg" radius="md" withBorder bg="dark.7" mt="md">
          {/* Summary cards */}
          <Group gap="sm" mb="md" wrap="wrap">
            <Paper
              radius="md" p="sm" style={{
                flex: 1, minWidth: 140,
                background: "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(15,23,42,0.6) 100%)",
                border: "1px solid rgba(14,165,233,0.2)",
              }}
            >
              <Text size="10px" c="dimmed" tt="uppercase" fw={600}>WMS Total</Text>
              <Text size="xl" fw={800} c="cyan.3">{totalWmsQty.toLocaleString("en-IN")}</Text>
            </Paper>
            <Paper
              radius="md" p="sm" style={{
                flex: 1, minWidth: 140,
                background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(15,23,42,0.6) 100%)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <Text size="10px" c="dimmed" tt="uppercase" fw={600}>Tally Total</Text>
              <Text size="xl" fw={800} c="yellow.4">{totalTallyQty.toLocaleString("en-IN")}</Text>
            </Paper>
            <Paper
              radius="md" p="sm" style={{
                flex: 1, minWidth: 140,
                background: `linear-gradient(135deg, ${totalDiff >= 0 ? "rgba(64,192,87,0.12)" : "rgba(250,82,82,0.12)"} 0%, rgba(15,23,42,0.6) 100%)`,
                border: `1px solid ${totalDiff >= 0 ? "rgba(64,192,87,0.2)" : "rgba(250,82,82,0.2)"}`,
              }}
            >
              <Text size="10px" c="dimmed" tt="uppercase" fw={600}>Net Difference</Text>
              <Text size="xl" fw={800} c={totalDiff > 0 ? "green.4" : totalDiff < 0 ? "red.4" : "dimmed"}>
                {totalDiff > 0 ? "+" : ""}{totalDiff.toLocaleString("en-IN")}
              </Text>
            </Paper>
            <Paper
              radius="md" p="sm" style={{
                flex: 1, minWidth: 140,
                background: "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(15,23,42,0.6) 100%)",
                border: "1px solid rgba(168,85,247,0.2)",
              }}
            >
              <Text size="10px" c="dimmed" tt="uppercase" fw={600}>Items Compared</Text>
              <Group gap={6} align="baseline">
                <Text size="xl" fw={800} c="grape.4">{stockDiffRows.length}</Text>
                <Text size="10px" c="dimmed">
                  ({stockMatchCount} OK · {excessCount} excess · {shortageCount} short)
                </Text>
              </Group>
            </Paper>
          </Group>

          {/* Filter + search bar */}
          <Group justify="space-between" mb="md" wrap="wrap">
            <Group gap="sm">
              <Text size="xl" fw={700} c="white">Stock Qty Comparison</Text>
            </Group>
            <Group gap="sm">
              <SegmentedControl
                size="xs"
                radius="md"
                value={stockFilter}
                onChange={(v) => setStockFilter(v as StockFilterType)}
                data={[
                  { value: "all", label: `All (${stockDiffRows.length})` },
                  { value: "excess", label: `Excess (${excessCount})` },
                  { value: "shortage", label: `Shortage (${shortageCount})` },
                  { value: "match", label: `Match (${stockMatchCount})` },
                ]}
              />
              <TextInput
                placeholder="Search SKU, product..."
                leftSection={<Search size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                w={220}
                size="xs"
                radius="md"
              />
              <Tooltip label="Export CSV">
                <ActionIcon onClick={handleExportCsv} variant="light" color="teal" size="lg" radius="md">
                  <Download size={18} />
                </ActionIcon>
              </Tooltip>
              <ActionIcon onClick={fetchData} variant="light" color="blue" size="lg" radius="md">
                <RefreshCw size={18} />
              </ActionIcon>
            </Group>
          </Group>

          {loading ? (
            <Center p="xl"><Loader size="lg" type="dots" /></Center>
          ) : error ? (
            <Center p="xl"><Text c="red">{error}</Text></Center>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <Table striped highlightOnHover verticalSpacing="xs" style={{ minWidth: 900 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 50, textAlign: "center" }}>Status</Table.Th>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Product Name</Table.Th>
                    <Table.Th>Tally Name</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>WMS Qty</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Tally Qty</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Difference</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredStockRows.length > 0 ? (
                    filteredStockRows.map((row, idx) => {
                      const diffColor = row.difference > 0
                        ? "green"
                        : row.difference < 0
                          ? "red"
                          : "gray";
                      const DiffIcon = row.difference > 0
                        ? TrendingUp
                        : row.difference < 0
                          ? TrendingDown
                          : Minus;

                      return (
                        <Table.Tr
                          key={idx}
                          style={{
                            backgroundColor:
                              row.difference > 0
                                ? "rgba(64, 192, 87, 0.05)"
                                : row.difference < 0
                                  ? "rgba(250, 82, 82, 0.07)"
                                  : undefined,
                          }}
                        >
                          <Table.Td style={{ textAlign: "center" }}>
                            <Tooltip
                              label={
                                row.difference > 0
                                  ? `WMS has ${row.difference} more`
                                  : row.difference < 0
                                    ? `Tally has ${Math.abs(row.difference)} more`
                                    : "Qty matches"
                              }
                            >
                              <ThemeIcon variant="light" color={diffColor} size="sm" radius="xl">
                                <DiffIcon size={14} />
                              </ThemeIcon>
                            </Tooltip>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="blue" variant="outline" size="sm">{row.sku}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" fw={500} c="white" lineClamp={1}>{row.productName}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed" lineClamp={1}>{row.tallyName}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Text size="xs" fw={600} c="cyan.3">{row.wmsQty.toLocaleString("en-IN")}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Text size="xs" fw={600} c="yellow.4">{row.tallyQty.toLocaleString("en-IN")}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Badge
                              size="sm"
                              variant="light"
                              color={diffColor}
                              styles={{ root: { fontVariantNumeric: "tabular-nums" } }}
                            >
                              {row.difference > 0 ? "+" : ""}{row.difference.toLocaleString("en-IN")}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Center p="xl">
                          <Text c="dimmed">No items to display.</Text>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </OperationsPage>
  );
};
