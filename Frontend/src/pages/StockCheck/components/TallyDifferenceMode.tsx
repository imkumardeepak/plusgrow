import React, { useState, useEffect } from "react";
import { Table, Group, Text, Badge, Card, Center, Loader, TextInput, ActionIcon, SegmentedControl, ThemeIcon, Tooltip, Stack } from "@mantine/core";
import { Search, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { productsApi, tallySyncApi, Product } from "../../../services/masterApi";
import { OperationsPage } from "../../../components/organisms/Operations/OperationsShell";

interface TallyDifferenceModeProps {
  onBack?: () => void;
  isMobile?: boolean;
}

import { ModeHeader } from "./ModeHeader";

type FilterType = "all" | "matched" | "unmatched";

interface ComparisonRow {
  tallyName: string;
  tallyPartNo: string;
  tallyAlias: string;
  tallyCategory: string;
  tallyUnit: string;
  tallyOpeningQty: string;
  wmsSku: string | null;
  wmsProductName: string | null;
  isMatched: boolean;
}

export const TallyDifferenceMode: React.FC<TallyDifferenceModeProps> = ({ onBack, isMobile }) => {
  const [wmsProducts, setWmsProducts] = useState<Product[]>([]);
  const [tallyItems, setTallyItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wmsRes, tallyData] = await Promise.all([
        productsApi.getAll(), 
        tallySyncApi.getStockItems()
      ]);
      setWmsProducts(wmsRes);
      setTallyItems(tallyData);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Build comparison rows: for every Tally item, check if partNo matches any WMS SKU
  const comparisonRows = React.useMemo<ComparisonRow[]>(() => {
    if (!tallyItems.length) return [];

    // Build a map of lowercased SKU -> Product for fast lookup
    const skuMap = new Map<string, Product>();
    for (const p of wmsProducts) {
      const sku = (p.sku || "").trim().toLowerCase();
      if (sku) skuMap.set(sku, p);
    }

    return tallyItems
      .filter(t => {
        // Use skuCode (from MAILINGNAME) first, fallback to partNo
        const code = (t.skuCode || t.partNo || "").trim().toLowerCase();
        return code !== "" && code !== "na";
      })
      .map(t => {
        const code = (t.skuCode || t.partNo || "").trim().toLowerCase();
        const matchedProduct = skuMap.get(code) ?? null;

        return {
          tallyName: t.name || "",
          tallyPartNo: t.skuCode || t.partNo || "",
          tallyAlias: t.alias || "",
          tallyCategory: t.category || "",
          tallyUnit: t.unit || "",
          tallyOpeningQty: t.openingqnty || "0",
          wmsSku: matchedProduct?.sku ?? null,
          wmsProductName: matchedProduct?.name ?? null,
          isMatched: matchedProduct !== null,
        };
      })
      // Sort: unmatched first, then matched
      .sort((a, b) => {
        if (a.isMatched === b.isMatched) return a.tallyName.localeCompare(b.tallyName);
        return a.isMatched ? 1 : -1;
      });
  }, [wmsProducts, tallyItems]);

  // Filter + search
  const filteredRows = React.useMemo(() => {
    let rows = comparisonRows;

    if (filter === "matched") rows = rows.filter(r => r.isMatched);
    else if (filter === "unmatched") rows = rows.filter(r => !r.isMatched);

    if (search) {
      const lowerSearch = search.toLowerCase();
      rows = rows.filter(r =>
        r.tallyName.toLowerCase().includes(lowerSearch) ||
        r.tallyPartNo.toLowerCase().includes(lowerSearch) ||
        (r.wmsSku || "").toLowerCase().includes(lowerSearch) ||
        (r.wmsProductName || "").toLowerCase().includes(lowerSearch) ||
        r.tallyCategory.toLowerCase().includes(lowerSearch)
      );
    }

    return rows;
  }, [comparisonRows, filter, search]);

  const matchedCount = comparisonRows.filter(r => r.isMatched).length;
  const unmatchedCount = comparisonRows.filter(r => !r.isMatched).length;

  return (
    <OperationsPage title="Tally Reconciliation" description="Compare Tally stock items with WMS products by SKU / Part No." icon={AlertTriangle} hideHeader>
      <ModeHeader title="Tally Difference" icon={AlertTriangle} onBack={onBack!} isMobile={!!isMobile} />
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
              value={filter}
              onChange={(v) => setFilter(v as FilterType)}
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
          <Center p="xl">
            <Loader size="lg" type="dots" />
          </Center>
        ) : error ? (
          <Center p="xl">
            <Text c="red">{error}</Text>
          </Center>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover verticalSpacing="xs" style={{ minWidth: 900 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 50, textAlign: "center" }}>Match</Table.Th>
                  <Table.Th>Tally Name</Table.Th>
                  <Table.Th>Tally Part No.</Table.Th>
                  <Table.Th>WMS SKU</Table.Th>
                  <Table.Th>WMS Product Name</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Opening Qty</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row, idx) => (
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
                        <Stack gap={2}>
                          <Text size="xs" fw={500} c="white">{row.tallyName}</Text>
                          {row.tallyAlias && row.tallyAlias !== "NA" && (
                            <Text size="10px" c="dimmed">{row.tallyAlias}</Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={row.isMatched ? "green" : "yellow"}
                          variant="outline"
                          size="sm"
                        >
                          {row.tallyPartNo}
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
                      <Table.Td>
                        <Text size="xs" c="dimmed">{row.tallyCategory}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text size="xs" fw={600}>{row.tallyOpeningQty}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))
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
    </OperationsPage>
  );
};
