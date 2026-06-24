import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Table,
  Group,
  Text,
  Badge,
  Card,
  Center,
  Loader,
  TextInput,
  ActionIcon,
  SegmentedControl,
  ThemeIcon,
  Tooltip,
  Stack,
  Box,
  FileButton,
} from "@mantine/core";
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
import { productsApi, Product } from "../../../services/masterApi";
import { OperationsPage } from "../../../components/organisms/Operations/OperationsShell";
import { ModeHeader } from "./ModeHeader";
import { Button } from "../../../components/atoms/Button";
import { toast } from "../../../lib/toast";
import { exportToExcel } from "../../../hooks/useExcelExport";

interface ExcelStockCheckModeProps {
  onBack?: () => void;
  isMobile?: boolean;
}

type FilterType = "all" | "matched" | "unmatched";

interface ExcelRow {
  sku: string;
  excelQty: number;
}

interface ComparisonRow {
  sku: string;
  excelQty: number;
  wmsProductName: string | null;
  wmsStockQty: number | null;
  difference: number | null;
  isMatched: boolean;
}

export const ExcelStockCheckMode: React.FC<ExcelStockCheckModeProps> = ({ onBack, isMobile }) => {
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [wmsProducts, setWmsProducts] = useState<Product[]>([]);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [fileName, setFileName] = useState<string | null>(null);
  const resetRef = useRef<() => void>(null);

  const handleFileUpload = useCallback((file: File | null) => {
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setFileName(file.name);
    setHasCompared(false);
    setComparisonRows([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (jsonData.length === 0) {
          toast.error("No data found in the uploaded file");
          return;
        }

        // Try to find SKU and Quantity columns (case-insensitive)
        const firstRow = jsonData[0];
        const keys = Object.keys(firstRow);

        const skuKey = keys.find(k =>
          /^(sku|sku\s*code|part\s*no\.?|partno|part\s*number|item\s*code|barcode)$/i.test(k.trim())
        ) ?? keys[0];

        const qtyKey = keys.find(k =>
          /^(qty|quantity|stock\s*qty|stock\s*quantity|stock|count|opening\s*qty)$/i.test(k.trim())
        ) ?? keys[1];

        if (!skuKey || !qtyKey) {
          toast.error("Could not find SKU and Quantity columns. Please ensure columns are named: SKU, Quantity");
          return;
        }

        const rows: ExcelRow[] = jsonData
          .map(row => ({
            sku: String(row[skuKey] ?? "").trim(),
            excelQty: Number(row[qtyKey]) || 0,
          }))
          .filter(r => r.sku !== "");

        if (rows.length === 0) {
          toast.error("No valid rows found in the file");
          return;
        }

        setExcelRows(rows);
        toast.success(`Loaded ${rows.length} rows from "${file.name}" (Columns: ${skuKey}, ${qtyKey})`);
      } catch {
        toast.error("Failed to parse the Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleCompare = useCallback(async () => {
    if (excelRows.length === 0) {
      toast.error("Please upload an Excel file first");
      return;
    }

    try {
      setLoading(true);
      const products = await productsApi.getAll();
      setWmsProducts(products);

      // Build SKU lookup map (case-insensitive)
      const skuMap = new Map<string, Product>();
      for (const p of products) {
        const sku = (p.sku || "").trim().toLowerCase();
        if (sku) skuMap.set(sku, p);
        // Also check alias
        const alias = (p.alias || "").trim().toLowerCase();
        if (alias) skuMap.set(alias, p);
      }

      const rows: ComparisonRow[] = excelRows.map(excelRow => {
        const key = excelRow.sku.toLowerCase();
        const product = skuMap.get(key) ?? null;

        if (product) {
          const wmsQty = product.stockQty ?? 0;
          return {
            sku: excelRow.sku,
            excelQty: excelRow.excelQty,
            wmsProductName: product.name,
            wmsStockQty: wmsQty,
            difference: excelRow.excelQty - wmsQty,
            isMatched: true,
          };
        }

        return {
          sku: excelRow.sku,
          excelQty: excelRow.excelQty,
          wmsProductName: null,
          wmsStockQty: null,
          difference: null,
          isMatched: false,
        };
      });

      // Sort: unmatched first, then by difference (descending)
      rows.sort((a, b) => {
        if (a.isMatched !== b.isMatched) return a.isMatched ? 1 : -1;
        if (a.difference !== null && b.difference !== null) {
          return Math.abs(b.difference) - Math.abs(a.difference);
        }
        return a.sku.localeCompare(b.sku);
      });

      setComparisonRows(rows);
      setHasCompared(true);

      const matched = rows.filter(r => r.isMatched).length;
      const unmatched = rows.filter(r => !r.isMatched).length;
      const withVariance = rows.filter(r => r.isMatched && r.difference !== 0).length;
      toast.success(`Comparison done: ${matched} matched, ${unmatched} unmatched, ${withVariance} with variance`);
    } catch (err: any) {
      toast.error(err.message || "Failed to load WMS products");
    } finally {
      setLoading(false);
    }
  }, [excelRows]);

  const handleClear = useCallback(() => {
    setExcelRows([]);
    setComparisonRows([]);
    setHasCompared(false);
    setFileName(null);
    setSearch("");
    setFilter("all");
    resetRef.current?.();
  }, []);

  const handleExport = useCallback(() => {
    if (filteredRows.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      exportToExcel({
        fileName: "Stock_Check_Excel_Comparison",
        sheets: [{
          sheetName: "Comparison",
          data: filteredRows,
          columns: [
            { header: "SKU", accessor: (r) => r.sku },
            { header: "Excel Qty", accessor: (r) => r.excelQty, format: "number" },
            { header: "WMS Product Name", accessor: (r) => r.wmsProductName || "NOT FOUND" },
            { header: "WMS Stock Qty", accessor: (r) => r.wmsStockQty ?? "N/A", format: "number" },
            { header: "Difference", accessor: (r) => r.difference ?? "N/A", format: "number" },
            { header: "Status", accessor: (r) => r.isMatched ? (r.difference === 0 ? "Match" : "Variance") : "Not Found in WMS" },
          ],
        }],
      });
      toast.success("Comparison report exported");
    } catch {
      toast.error("Failed to export Excel");
    }
  }, [comparisonRows, filter, search]);

  const handleDownloadTemplate = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const templateData = [{ SKU: "", Quantity: "" }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Stock Check Template");
    XLSX.writeFile(wb, "Stock_Check_Template.xlsx");
    toast.success("Template downloaded");
  }, []);

  // Filter + search
  const filteredRows = React.useMemo(() => {
    let rows = comparisonRows;

    if (filter === "matched") rows = rows.filter(r => r.isMatched);
    else if (filter === "unmatched") rows = rows.filter(r => !r.isMatched);

    if (search) {
      const lowerSearch = search.toLowerCase();
      rows = rows.filter(r =>
        r.sku.toLowerCase().includes(lowerSearch) ||
        (r.wmsProductName || "").toLowerCase().includes(lowerSearch)
      );
    }

    return rows;
  }, [comparisonRows, filter, search]);

  const matchedCount = comparisonRows.filter(r => r.isMatched).length;
  const unmatchedCount = comparisonRows.filter(r => !r.isMatched).length;
  const varianceCount = comparisonRows.filter(r => r.isMatched && r.difference !== 0).length;
  const exactMatchCount = comparisonRows.filter(r => r.isMatched && r.difference === 0).length;

  return (
    <OperationsPage
      title="Stock Check by Excel"
      description="Upload an Excel with SKU & Quantity, then compare against WMS stock data."
      icon={FileSpreadsheet}
      hideHeader
    >
      <ModeHeader title="Stock Check by Excel" icon={FileSpreadsheet} onBack={onBack!} isMobile={!!isMobile} />

      {/* Upload Section */}
      <Card shadow="sm" p="md" radius="md" withBorder bg="dark.7" mt="md">
        <Group justify="space-between" mb="md" wrap="wrap">
          <Stack gap={4}>
            <Text size="lg" fw={700} c="white">Upload Stock Excel</Text>
            <Text size="xs" c="dimmed">
              Upload an Excel file with columns: <strong>SKU</strong> (or Part No.) and <strong>Quantity</strong> (or Stock Qty)
            </Text>
          </Stack>
          <Group gap="xs">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleDownloadTemplate}
            >
              Template
            </Button>
          </Group>
        </Group>

        <Group gap="sm" wrap="wrap">
          <FileButton onChange={handleFileUpload} accept=".xlsx,.xls" resetRef={resetRef}>
            {(props) => (
              <Button
                {...props}
                size="sm"
                variant={fileName ? "outline" : "filled"}
                leftIcon={<Upload className="h-3.5 w-3.5" />}
              >
                {fileName ? `Change File` : "Upload Excel"}
              </Button>
            )}
          </FileButton>

          {fileName && (
            <Badge color="blue" variant="light" size="lg" radius="md">
              {fileName} — {excelRows.length} rows
            </Badge>
          )}

          {excelRows.length > 0 && (
            <>
              <Button
                size="sm"
                onClick={handleCompare}
                loading={loading}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Compare with WMS
              </Button>
              <ActionIcon variant="light" color="red" size="lg" radius="md" onClick={handleClear}>
                <Trash2 size={16} />
              </ActionIcon>
            </>
          )}
        </Group>
      </Card>

      {/* Results Section */}
      {hasCompared && (
        <Card shadow="sm" p="lg" radius="md" withBorder bg="dark.7" mt="md">
          <Group justify="space-between" mb="md" wrap="wrap">
            <Group gap="sm">
              <Text size="lg" fw={700} c="white">Comparison Results</Text>
              <Badge color="green" variant="light">{exactMatchCount} Exact</Badge>
              <Badge color="yellow" variant="light">{varianceCount} Variance</Badge>
              <Badge color="red" variant="light">{unmatchedCount} Not Found</Badge>
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
                  { value: "unmatched", label: `Not Found (${unmatchedCount})` },
                ]}
              />
              <TextInput
                placeholder="Search SKU, Product..."
                leftSection={<Search size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                w={220}
                size="xs"
                radius="md"
              />
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Group>
          </Group>

          {loading ? (
            <Center p="xl">
              <Loader size="lg" type="dots" />
            </Center>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <Table striped highlightOnHover verticalSpacing="xs" style={{ minWidth: 850 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 50, textAlign: "center" }}>Status</Table.Th>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>WMS Product Name</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Excel Qty</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>WMS Qty</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Difference</Table.Th>
                    <Table.Th>Result</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, idx) => {
                      const isExact = row.isMatched && row.difference === 0;
                      const hasVariance = row.isMatched && row.difference !== 0;

                      return (
                        <Table.Tr
                          key={idx}
                          style={{
                            backgroundColor: !row.isMatched
                              ? "rgba(250, 82, 82, 0.08)"
                              : isExact
                                ? "rgba(64, 192, 87, 0.06)"
                                : "rgba(250, 176, 5, 0.06)",
                          }}
                        >
                          <Table.Td style={{ textAlign: "center" }}>
                            {row.isMatched ? (
                              <Tooltip label={isExact ? "Quantities match" : "Quantity variance"}>
                                <ThemeIcon
                                  variant="light"
                                  color={isExact ? "green" : "yellow"}
                                  size="sm"
                                  radius="xl"
                                >
                                  <CheckCircle2 size={14} />
                                </ThemeIcon>
                              </Tooltip>
                            ) : (
                              <Tooltip label="SKU not found in WMS">
                                <ThemeIcon variant="light" color="red" size="sm" radius="xl">
                                  <XCircle size={14} />
                                </ThemeIcon>
                              </Tooltip>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={row.isMatched ? (isExact ? "green" : "yellow") : "red"}
                              variant="outline"
                              size="sm"
                            >
                              {row.sku}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c={row.wmsProductName ? "white" : "dimmed"} fw={500}>
                              {row.wmsProductName || "— Not found in WMS —"}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Text size="xs" fw={600}>{row.excelQty}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Text size="xs" fw={600} c={row.wmsStockQty !== null ? "white" : "dimmed"}>
                              {row.wmsStockQty !== null ? row.wmsStockQty : "—"}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            {row.difference !== null ? (
                              <Text
                                size="xs"
                                fw={700}
                                c={row.difference === 0 ? "green.4" : row.difference > 0 ? "yellow.4" : "red.4"}
                              >
                                {row.difference > 0 ? `+${row.difference}` : row.difference}
                              </Text>
                            ) : (
                              <Text size="xs" c="dimmed">—</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {!row.isMatched ? (
                              <Badge color="red" size="sm">Not Found</Badge>
                            ) : isExact ? (
                              <Badge color="green" size="sm">Match</Badge>
                            ) : (
                              <Badge color="yellow" size="sm">Variance</Badge>
                            )}
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
