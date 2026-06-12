import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { AlertTriangle, CheckCircle2, ClipboardCheck, RefreshCw, Save, ScanLine, Trash2 } from "lucide-react";

import { Button } from "../components/atoms/Button";
import { OperationsPage, OperationsPanel, OperationsEmptyState } from "../components/organisms/Operations/OperationsShell";
import { toast } from "../lib/toast";
import {
  PoInvoice,
  PoInvoiceHeaderSummary,
  Product,
  poInvoicesApi,
  productsApi,
  stockCheckReportsApi,
} from "../services/masterApi";

type InvoiceSummary = PoInvoiceHeaderSummary & { invoiceKey: string };
type ExpectedLine = PoInvoice & { expectedQty: number; scannedQty: number; difference: number };
type ScanEvent = { code: string; sku: string; productName: string; at: string; isExtra: boolean };

const normalizeCode = (value?: string | null) => (value || "").trim().toUpperCase();

const extractTokens = (raw: string) => {
  const upper = normalizeCode(raw);
  const tokens = new Set<string>();
  if (upper) tokens.add(upper);

  upper
    .split(/[\s#|,;:/\\?&=]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => tokens.add(token));

  return Array.from(tokens);
};

export const InwardVerify = memo(function InwardVerify() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedInvoiceKey, setSelectedInvoiceKey] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [invoiceResult, productResult] = await Promise.all([
        poInvoicesApi.getHeaders({ status: "printed", page: 1, pageSize: 300 }),
        productsApi.search(""),
      ]);
      setInvoices(
        invoiceResult.data
          .filter((invoice) => invoice.status !== "Canceled")
          .map((invoice) => ({ ...invoice, invoiceKey: `${invoice.invoiceNumber}__${invoice.partyName}__${invoice.invoiceDate}` })),
      );
      setProducts(productResult);
    } catch (error: any) {
      toast.error(error.message || "Failed to load invoices for verification");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setScanEvents([]);
    setScanInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [selectedInvoiceKey]);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.invoiceKey === selectedInvoiceKey) || null,
    [invoices, selectedInvoiceKey],
  );

  const expectedItems = useMemo(() => selectedInvoice?.items.filter((item) => item.billedQty > 0) || [], [selectedInvoice]);

  const productLookup = useMemo(() => {
    const entries = new Map<string, Product>();
    products.forEach((product) => {
      if (product.id) entries.set(String(product.id), product);
      if (product.sku) entries.set(normalizeCode(product.sku), product);
      if (product.alias) entries.set(normalizeCode(product.alias), product);
    });
    expectedItems.forEach((item) => {
      entries.set(normalizeCode(item.skuCode), {
        id: item.productId,
        name: item.productName,
        sku: item.skuCode,
        createdAt: item.createdAt,
        bestBeforeMonths: 0,
      } as Product);
    });
    return entries;
  }, [expectedItems, products]);

  const scannedCounts = useMemo(() => {
    const counts = new Map<number, number>();
    scanEvents.forEach((event) => {
      if (event.isExtra) return;
      const line = expectedItems.find((item) => normalizeCode(item.skuCode) === event.sku);
      if (!line) return;
      counts.set(line.productId, (counts.get(line.productId) || 0) + 1);
    });
    return counts;
  }, [expectedItems, scanEvents]);

  const lines: ExpectedLine[] = useMemo(
    () =>
      expectedItems.map((item) => {
        const scannedQty = scannedCounts.get(item.productId) || 0;
        return {
          ...item,
          expectedQty: item.billedQty,
          scannedQty,
          difference: scannedQty - item.billedQty,
        };
      }),
    [expectedItems, scannedCounts],
  );

  const totalExpected = lines.reduce((sum, line) => sum + line.expectedQty, 0);
  const totalScanned = lines.reduce((sum, line) => sum + line.scannedQty, 0);
  const extraCount = scanEvents.filter((event) => event.isExtra).length;
  const isCorrect = selectedInvoice && totalExpected > 0 && totalExpected === totalScanned && extraCount === 0 && lines.every((line) => line.difference === 0);
  const hasDifference = selectedInvoice && (extraCount > 0 || lines.some((line) => line.difference !== 0));

  const resolveScannedProduct = (raw: string) => {
    const tokens = extractTokens(raw);
    for (const token of tokens) {
      const product = productLookup.get(token);
      if (product) return product;
    }
    return null;
  };

  const handleScan = () => {
    if (!selectedInvoice) {
      toast.warning("Select invoice number first");
      return;
    }

    const raw = scanInput.trim();
    if (!raw) return;

    const product = resolveScannedProduct(raw);
    setScanInput("");

    if (!product) {
      setScanEvents((prev) => [
        { code: raw, sku: "UNKNOWN", productName: "Unknown sticker", at: new Date().toISOString(), isExtra: true },
        ...prev,
      ]);
      toast.error("Sticker not matching invoice product");
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }

    const sku = normalizeCode(product.sku);
    const invoiceLine = expectedItems.find((item) => item.productId === product.id || normalizeCode(item.skuCode) === sku);

    setScanEvents((prev) => [
      {
        code: raw,
        sku: normalizeCode(invoiceLine?.skuCode || product.sku),
        productName: invoiceLine?.productName || product.name,
        at: new Date().toISOString(),
        isExtra: !invoiceLine,
      },
      ...prev,
    ]);

    if (!invoiceLine) {
      toast.warning("Extra sticker scanned, not in selected invoice");
    }

    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleSaveVerification = async () => {
    if (!selectedInvoice) {
      toast.warning("Select invoice number first");
      return;
    }

    if (scanEvents.length === 0) {
      toast.warning("Scan stickers before saving verification");
      return;
    }

    try {
      setIsSaving(true);
      const extraItems = scanEvents
        .filter((event) => event.isExtra)
        .map((event, index) => ({
          sku: event.sku === "UNKNOWN" ? event.code : event.sku,
          productName: event.productName,
          systemQty: 0,
          scannedQty: 1,
          variance: 1,
          isUnexpected: true,
          scannedCode: event.code,
          scannedAt: event.at,
          row: index + 1,
        }));

      const items = [
        ...lines.map((line) => ({
          sku: line.skuCode,
          productName: line.productName,
          systemQty: line.expectedQty,
          scannedQty: line.scannedQty,
          variance: line.difference,
          isUnexpected: false,
        })),
        ...extraItems,
      ];

      await stockCheckReportsApi.create({
        checkType: "INWARD_VERIFY",
        referenceName: `${selectedInvoice.invoiceNumber} - ${selectedInvoice.partyName}`,
        totalSystemQty: totalExpected,
        totalScannedQty: totalScanned + extraCount,
        totalVariance: totalScanned + extraCount - totalExpected,
        itemsChecked: items.length,
        itemsWithVariance: items.filter((item) => item.variance !== 0).length,
        itemsJson: JSON.stringify(items),
        status: "COMPLETED",
        notes: JSON.stringify({
          checkId: `INWARD-${selectedInvoice.invoiceNumber}-${Date.now()}`,
          checkType: "INWARD_VERIFY",
          referenceName: selectedInvoice.invoiceNumber,
          partyName: selectedInvoice.partyName,
          invoiceDate: selectedInvoice.invoiceDate,
          totalScans: scanEvents.length,
          savedAt: new Date().toISOString(),
        }),
      });

      toast.success("Inward verification saved to report");
      setScanEvents([]);
      setScanInput("");
      void loadData();
      setTimeout(() => inputRef.current?.focus(), 10);
    } catch (error: any) {
      toast.error(error.message || "Failed to save inward verification");
    } finally {
      setIsSaving(false);
    }
  };

  const invoiceOptions = invoices.map((invoice) => ({
    value: invoice.invoiceKey,
    label: `${invoice.invoiceNumber} · ${invoice.partyName} · ${invoice.totalBilledQty} stickers`,
  }));

  return (
    <OperationsPage
      title="Inward Verify"
      description="Scan printed sticker QR/barcodes and verify counts against inward purchase invoice quantity."
      icon={ClipboardCheck}
      hideHeader
    >
      <Stack gap="sm">
        <Paper radius="md" p={isMobile ? "xs" : "sm"} withBorder style={{ background: "rgba(15,23,42,0.72)", borderColor: "rgba(14,165,233,0.16)" }}>
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <ClipboardCheck size={isMobile ? 18 : 20} color="var(--mantine-color-cyan-4)" />
              <Box className="min-w-0">
                <Text fw={900} size={isMobile ? "sm" : "md"} c="white">Inward Verify</Text>
                {!isMobile && <Text size="11px" c="dimmed">Select invoice and scan every printed sticker</Text>}
              </Box>
            </Group>
            <Button size="xs" variant="outline" leftIcon={<RefreshCw size={14} />} loading={isLoading} onClick={() => void loadData()}>
              Refresh
            </Button>
          </Group>
        </Paper>

        <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="sm">
          <OperationsPanel title="Scanner" icon={ScanLine} className="lg:col-span-4" contentClassName={isMobile ? "space-y-2" : "space-y-3"} hideHeader={!!isMobile}>
            <Select
              label="Invoice Number"
              size={isMobile ? "xs" : "sm"}
              searchable
              clearable
              placeholder="Select printed invoice..."
              data={invoiceOptions}
              value={selectedInvoiceKey}
              onChange={setSelectedInvoiceKey}
              disabled={isLoading}
              nothingFoundMessage="No printed invoices found"
            />

            {selectedInvoice ? (
              <>
                <Paper radius="md" p="xs" withBorder bg="transparent">
                  <Group justify="space-between" gap="xs">
                    <Box className="min-w-0">
                      <Text size="10px" fw={800} c="dimmed">SELECTED INVOICE</Text>
                      <Text size="sm" fw={900} c="cyan.3" truncate>{selectedInvoice.invoiceNumber}</Text>
                      <Text size="10px" c="dimmed" truncate>{selectedInvoice.partyName}</Text>
                    </Box>
                    <Badge size={isMobile ? "sm" : "lg"} variant="light" color={isCorrect ? "green" : hasDifference ? "orange" : "cyan"}>
                      {isCorrect ? "CORRECT" : hasDifference ? "DIFFERENCE" : "SCANNING"}
                    </Badge>
                  </Group>
                </Paper>

                <TextInput
                  ref={inputRef}
                  label="Scan Sticker"
                  size={isMobile ? "sm" : "md"}
                  placeholder="Scan sticker..."
                  value={scanInput}
                  onChange={(event) => setScanInput(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleScan();
                  }}
                  leftSection={<ScanLine size={16} />}
                  autoFocus
                />
                <Button size={isMobile ? "sm" : "md"} fullWidth onClick={handleScan} leftIcon={<ScanLine size={15} />}>Add Scan</Button>

                <SimpleGrid cols={3} spacing="xs">
                  <Paper radius="md" p="xs" withBorder bg="transparent">
                    <Text size="9px" fw={800} c="dimmed">EXPECTED</Text>
                    <Text fw={900} c="cyan.3">{totalExpected}</Text>
                  </Paper>
                  <Paper radius="md" p="xs" withBorder bg="transparent">
                    <Text size="9px" fw={800} c="dimmed">SCANNED</Text>
                    <Text fw={900} c="white">{totalScanned}</Text>
                  </Paper>
                  <Paper radius="md" p="xs" withBorder bg="transparent">
                    <Text size="9px" fw={800} c="dimmed">EXTRA</Text>
                    <Text fw={900} c={extraCount > 0 ? "red.4" : "green.4"}>{extraCount}</Text>
                  </Paper>
                </SimpleGrid>

                <Button variant="subtle" color="red" size="xs" fullWidth leftIcon={<Trash2 size={14} />} onClick={() => setScanEvents([])}>
                  Clear Scans
                </Button>

                <Button
                  color="green"
                  size={isMobile ? "sm" : "md"}
                  fullWidth
                  leftIcon={<Save size={15} />}
                  loading={isSaving}
                  disabled={scanEvents.length === 0}
                  onClick={() => void handleSaveVerification()}
                >
                  Save Verification
                </Button>
              </>
            ) : (
              <OperationsEmptyState icon={ClipboardCheck} title="Select Invoice" description="Choose invoice number to start sticker verification." />
            )}
          </OperationsPanel>

          <OperationsPanel title="Verification Result" icon={ClipboardCheck} className="lg:col-span-8" contentClassName={isMobile ? "space-y-2" : "space-y-3"} hideHeader={!!isMobile}>
            {!selectedInvoice ? (
              <OperationsEmptyState icon={ScanLine} title="No Invoice Selected" description="After selecting an invoice, expected product quantities will appear here." />
            ) : (
              <>
                <Paper
                  radius="md"
                  p={isMobile ? "xs" : "sm"}
                  withBorder
                  style={{
                    background: isCorrect ? "rgba(34,197,94,0.08)" : hasDifference ? "rgba(245,158,11,0.08)" : "rgba(14,165,233,0.08)",
                    borderColor: isCorrect ? "rgba(34,197,94,0.24)" : hasDifference ? "rgba(245,158,11,0.24)" : "rgba(14,165,233,0.2)",
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    {isCorrect ? <CheckCircle2 size={20} color="var(--mantine-color-green-4)" /> : <AlertTriangle size={20} color="var(--mantine-color-yellow-4)" />}
                    <Box>
                      <Text size={isMobile ? "sm" : "md"} fw={900} c={isCorrect ? "green.3" : hasDifference ? "yellow.3" : "cyan.3"}>
                        {isCorrect ? "All stickers match invoice quantity" : hasDifference ? "Difference found" : "Start scanning stickers"}
                      </Text>
                      <Text size="11px" c="dimmed">
                        Expected {totalExpected}, scanned {totalScanned}, extra {extraCount}
                      </Text>
                    </Box>
                  </Group>
                </Paper>

                {isMobile ? (
                  <Stack gap="xs">
                    {lines.map((line) => (
                      <Paper key={line.id} radius="md" p="xs" withBorder style={{ background: "rgba(15,23,42,0.58)", borderColor: line.difference === 0 ? "rgba(34,197,94,0.16)" : "rgba(245,158,11,0.24)" }}>
                        <Group justify="space-between" gap="xs" wrap="nowrap">
                          <Box className="min-w-0" style={{ flex: 1 }}>
                            <Group gap={6} wrap="nowrap">
                              <Text size="12px" fw={900} ff="monospace" c="cyan.3" truncate>{line.skuCode}</Text>
                              <Badge size="xs" variant="light" color={line.difference === 0 ? "green" : line.difference > 0 ? "yellow" : "red"}>
                                {line.difference === 0 ? "OK" : line.difference > 0 ? "More" : "Less"}
                              </Badge>
                            </Group>
                          </Box>
                          <Group gap="xs" wrap="nowrap">
                            <Box ta="center"><Text size="9px" c="dimmed" fw={800}>INV</Text><Text size="sm" fw={900}>{line.expectedQty}</Text></Box>
                            <Box ta="center"><Text size="9px" c="dimmed" fw={800}>SCAN</Text><Text size="sm" fw={900}>{line.scannedQty}</Text></Box>
                            <Box ta="center"><Text size="9px" c="dimmed" fw={800}>DIFF</Text><Text size="sm" fw={900} ff="monospace" c={line.difference === 0 ? "green.4" : line.difference > 0 ? "yellow.4" : "red.4"}>{line.difference > 0 ? "+" : ""}{line.difference}</Text></Box>
                          </Group>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <ScrollArea type="auto">
                    <Table striped highlightOnHover withTableBorder withColumnBorders miw={720}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>SKU</Table.Th>
                          <Table.Th style={{ textAlign: "right" }}>Invoice Qty</Table.Th>
                          <Table.Th style={{ textAlign: "right" }}>Scanned</Table.Th>
                          <Table.Th style={{ textAlign: "right" }}>Difference</Table.Th>
                          <Table.Th>Status</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {lines.map((line) => (
                          <Table.Tr key={line.id}>
                            <Table.Td><Text size="12px" fw={800} ff="monospace">{line.skuCode}</Text></Table.Td>
                            <Table.Td style={{ textAlign: "right" }}>{line.expectedQty}</Table.Td>
                            <Table.Td style={{ textAlign: "right" }}>{line.scannedQty}</Table.Td>
                            <Table.Td style={{ textAlign: "right" }}>
                              <Text fw={900} ff="monospace" c={line.difference === 0 ? "green.4" : line.difference > 0 ? "yellow.4" : "red.4"}>{line.difference > 0 ? "+" : ""}{line.difference}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge size="xs" variant="light" color={line.difference === 0 ? "green" : line.difference > 0 ? "yellow" : "red"}>{line.difference === 0 ? "Correct" : line.difference > 0 ? "More" : "Less"}</Badge>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}

                {scanEvents.length > 0 ? (
                  <Paper radius="md" p="xs" withBorder bg="transparent">
                    <Group justify="space-between" mb={4}>
                      <Text size="10px" fw={800} c="dimmed">RECENT SCANS</Text>
                      <Badge size="xs" variant="light">{scanEvents.length}</Badge>
                    </Group>
                    <Stack gap={4} mah={160} style={{ overflowY: "auto" }}>
                      {scanEvents.slice(0, 20).map((event, index) => (
                        <Group key={`${event.at}-${index}`} justify="space-between" gap="xs" wrap="nowrap">
                          <Text size="11px" ff="monospace" truncate c={event.isExtra ? "red.3" : "white"}>{event.sku}</Text>
                          <Tooltip label="Remove scan">
                            <ActionIcon size="xs" variant="subtle" color="red" onClick={() => setScanEvents((prev) => prev.filter((_, i) => i !== index))}>
                              <Trash2 size={12} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ))}
                    </Stack>
                  </Paper>
                ) : null}
              </>
            )}
          </OperationsPanel>
        </SimpleGrid>
      </Stack>
    </OperationsPage>
  );
});

export default InwardVerify;
