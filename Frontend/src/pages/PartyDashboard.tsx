import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Grid,
  Button,
  Divider,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBox,
  IconClipboardCheck,
  IconMapPin,
  IconPackage,
  IconSearch,
  IconStack2,
  IconFileText,
  IconCurrencyRupee,
  IconQrcode,
  IconRefresh,
} from "@tabler/icons-react";

import {
  partyDashboardApi,
  poInvoicesApi,
  type PartyDashboardProduct,
  type PartyDashboardSummary,
  type PoInvoice,
} from "../services/masterApi";
import { toast } from "../lib/toast";

const emptySummary: PartyDashboardSummary = {
  partyName: "",
  partyEmail: "",
  productCount: 0,
  totalStockQuantity: 0,
  locatedQuantity: 0,
  unlocatedQuantity: 0,
  products: [],
};

const formatNumber = (value: number) => value.toLocaleString("en-IN");

const formatMoney = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value)
    : "-";

const normalizeSku = (value?: string | null) => (value || "").trim().toUpperCase();

const LocationList = ({ product }: { product: PartyDashboardProduct }) => {
  if (product.locations.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No location allotted
      </Text>
    );
  }

  return (
    <Group gap={6}>
      {product.locations.map((location) => (
        <Badge
          key={`${product.productId}-${location.locationCode}`}
          color="cyan"
          variant="light"
          radius="sm"
        >
          {location.locationCode}: {formatNumber(location.quantity)}
        </Badge>
      ))}
    </Group>
  );
};

export const PartyDashboard = memo(function PartyDashboard() {
  const [summary, setSummary] = useState<PartyDashboardSummary>(emptySummary);
  const [stockCheckProductId, setStockCheckProductId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showStockCheck, setShowStockCheck] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [lookupResult, setLookupResult] = useState<PartyDashboardProduct | null>(null);
  const [invoices, setInvoices] = useState<PoInvoice[]>([]);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);

  const handleLookup = async (skuOrAlias: string) => {
    const sku = normalizeSku(skuOrAlias.split("#")[0]);
    setScanInput(sku);

    if (!sku) {
      setLookupResult(null);
      setInvoices([]);
      return;
    }

    const product =
      summary.products.find(
        (item) =>
          normalizeSku(item.skuCode) === sku ||
          normalizeSku(item.alias) === sku
      ) ?? null;

    if (!product) {
      toast.error("No product details found for this SKU");
      setLookupResult(null);
      setInvoices([]);
      return;
    }

    setLookupResult(product);
    setStockCheckProductId(product.productId.toString());

    try {
      setIsInvoiceLoading(true);
      const invoiceRows = await poInvoicesApi.getAll({
        search: product.skuCode,
        pageSize: 100,
      });
      const resolvedSku = normalizeSku(product.skuCode);
      const filtered = invoiceRows
        .filter((row) => normalizeSku(row.skuCode) === resolvedSku)
        .sort((first, second) => {
          const dateDiff =
            new Date(second.invoiceDate).getTime() -
            new Date(first.invoiceDate).getTime();
          return dateDiff || second.id - first.id;
        });
      setInvoices(filtered);
    } catch (err: any) {
      toast.error("Failed to load SKU invoices");
      setInvoices([]);
    } finally {
      setIsInvoiceLoading(false);
    }
  };

  const handleSelectProduct = (val: string | null) => {
    setStockCheckProductId(val);
    if (!val) {
      setLookupResult(null);
      setInvoices([]);
      setScanInput("");
      return;
    }
    const product = summary.products.find(
      (p) => p.productId.toString() === val
    );
    if (product) {
      void handleLookup(product.skuCode);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await partyDashboardApi.getSummary();
        if (isMounted) setSummary(data);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load party stock";
        if (isMounted) setError(message);
        toast.error("Party dashboard failed to load");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);



  const stockCheckOptions = useMemo(() => {
    return summary.products.map((product) => ({
      value: product.productId.toString(),
      label: `${product.skuCode || "N/A"} - ${product.productName}`,
    }));
  }, [summary.products]);

  const stockCheckProduct = useMemo(() => {
    return (
      summary.products.find(
        (product) => product.productId.toString() === stockCheckProductId,
      ) ?? null
    );
  }, [stockCheckProductId, summary.products]);

  if (isLoading) {
    return (
      <Center mih="60dvh">
        <Stack align="center" gap="sm">
          <Loader color="cyan" />
          <Text size="sm" c="dimmed">
            Loading your stock ledger...
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      {error ? (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="Stock ledger unavailable"
        >
          {error}
        </Alert>
      ) : null}

      <Paper
        radius="md"
        p={{ base: "md", md: "lg" }}
        withBorder
        style={{
          background:
            "linear-gradient(135deg, rgba(10, 21, 35, 0.96), rgba(8, 15, 26, 0.98))",
          borderColor: "rgba(34, 211, 238, 0.16)",
        }}
      >
        <Group justify="space-between" align="flex-start" gap="md">
          <Group gap="md" wrap="nowrap">
            <ThemeIcon color="cyan" variant="light" size={46} radius="md">
              <IconStack2 size={24} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text size="xs" c="cyan.3" fw={800} tt="uppercase">
                Party Stock Dashboard
              </Text>
              <Text fz={{ base: 22, md: 30 }} fw={900} c="white" lh={1.1}>
                {summary.partyName || "Party"}
              </Text>
              <Text size="sm" c="dimmed">
                {summary.partyEmail}
              </Text>
            </Stack>
          </Group>
          <Badge color="green" variant="light" size="lg">
            Read only
          </Badge>
        </Group>
      </Paper>

      {!showStockCheck ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <Card
            withBorder
            radius="lg"
            p="xl"
            onClick={() => setShowStockCheck(true)}
            style={{
              cursor: "pointer",
              background: "linear-gradient(135deg, rgba(30, 192, 243, 0.08), rgba(6, 19, 31, 0.6))",
              borderColor: "rgba(34, 211, 238, 0.2)",
              transition: "transform 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.2)";
            }}
          >
            <Group justify="space-between" mb="md">
              <ThemeIcon color="cyan" variant="light" size={48} radius="md">
                <IconClipboardCheck size={28} />
              </ThemeIcon>
              <Badge color="cyan" variant="light" size="lg">
                Stock Check
              </Badge>
            </Group>
            <Text size="xl" fw={900} mt="md" c="white">
              Stock Check
            </Text>
            <Text size="sm" c="dimmed" mt="xs">
              Lookup detailed reference cards, check allocated location quantities, and review PO invoice details for your products.
            </Text>
          </Card>
        </SimpleGrid>
      ) : (
        <Stack gap="md">
          <Paper radius="md" p="sm" withBorder bg="rgba(6, 19, 31, 0.2)">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconClipboardCheck size={20} color="var(--mantine-color-cyan-4)" />
                <Text fw={800}>Stock Check Workspace</Text>
              </Group>
              <Button
                variant="subtle"
                color="cyan"
                size="xs"
                onClick={() => {
                  setShowStockCheck(false);
                  setLookupResult(null);
                  setInvoices([]);
                  setScanInput("");
                  setStockCheckProductId(null);
                }}
              >
                Back to Dashboard
              </Button>
            </Group>
          </Paper>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card withBorder radius="md" p="md">
                <Stack gap="md">
                  <Group gap="xs">
                    <IconQrcode size={18} color="var(--mantine-color-cyan-4)" />
                    <Text fw={800}>Item Lookup</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Scan or enter a SKU to view reference card and stock details.
                  </Text>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleLookup(scanInput);
                    }}
                  >
                    <Stack gap="sm">
                      <Stack gap={4}>
                        <Text size="10px" fw={800} c="dimmed">
                          SKU CODE
                        </Text>
                        <TextInput
                          size="sm"
                          radius="md"
                          placeholder="Scan or enter SKU..."
                          value={scanInput}
                          onChange={(e) => setScanInput(e.currentTarget.value)}
                          required
                          styles={{
                            input: {
                              textTransform: "uppercase",
                              fontFamily: "var(--font-mono)",
                            },
                          }}
                          leftSection={<IconSearch size={14} />}
                        />
                      </Stack>

                      <Group gap="xs" grow>
                        <Button
                          type="submit"
                          size="xs"
                          variant="filled"
                          color="cyan"
                        >
                          Show Details
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="subtle"
                          color="gray"
                          onClick={() => {
                            setScanInput("");
                            setLookupResult(null);
                            setInvoices([]);
                            setStockCheckProductId(null);
                          }}
                        >
                          Clear
                        </Button>
                      </Group>
                    </Stack>
                  </form>

                  <Divider my="xs" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

                  <Stack gap={4}>
                    <Text size="10px" fw={800} c="dimmed">
                      OR SELECT FROM LIST
                    </Text>
                    <Select
                      value={stockCheckProductId}
                      onChange={handleSelectProduct}
                      data={stockCheckOptions}
                      placeholder="Select SKU or product"
                      searchable
                      clearable
                      leftSection={<IconSearch size={15} />}
                      radius="md"
                    />
                  </Stack>

                  <Card radius="md" p="sm" withBorder bg="rgba(6, 19, 31, 0.4)">
                    <Group gap="xs" wrap="nowrap">
                      <IconBox size={16} color="var(--mantine-color-cyan-4)" />
                      <Text size="xs" c="dimmed">
                        This tab is read-only. It displays product details, PO invoices, and allotted location stock.
                      </Text>
                    </Group>
                  </Card>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 8 }}>
              {!lookupResult ? (
                <Card withBorder radius="md" p="xl" style={{ minHeight: 350 }}>
                  <Center h="100%" style={{ flex: 1, minHeight: 310 }}>
                    <Stack align="center" gap="sm">
                      <IconClipboardCheck size={48} color="var(--mantine-color-cyan-7)" />
                      <Text fw={800} size="lg">Enter SKU To View Product Details</Text>
                      <Text size="xs" c="dimmed" ta="center" style={{ maxWidth: 340 }}>
                        Search a SKU code or choose a product from the list to see stock, location layout, and invoices.
                      </Text>
                    </Stack>
                  </Center>
                </Card>
              ) : (
                <Stack gap="sm">
                  <Paper
                    radius="md"
                    p="md"
                    withBorder
                    style={{
                      background: "linear-gradient(135deg, rgba(30, 192, 243, 0.1), rgba(6, 19, 31, 0.72))",
                      borderColor: "rgba(34, 211, 238, 0.16)"
                    }}
                  >
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <div>
                        <Group gap="xs" wrap="nowrap">
                          <Badge size="sm" radius="md" variant="light" color="gray">
                            {lookupResult.skuCode}
                          </Badge>
                          <Badge size="sm" radius="md" variant="light" color={lookupResult.currentQuantity > 0 ? "green" : "orange"}>
                            {lookupResult.currentQuantity > 0 ? "Stock Available" : "No Stock"}
                          </Badge>
                        </Group>
                        <Text size="lg" fw={900} mt="xs" c="cyan.3">
                          {lookupResult.productName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {lookupResult.alias || "No alias"}
                        </Text>
                      </div>
                    </Group>
                  </Paper>

                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <Paper radius="md" p="sm" withBorder bg="transparent">
                      <Group gap={6} wrap="nowrap">
                        <IconBox size={13} color="var(--mantine-color-cyan-4)" />
                        <Text size="10px" fw={800} c="dimmed">
                          CURRENT STOCK
                        </Text>
                      </Group>
                      <Text mt={6} size="xl" fw={800} ff="monospace" c="cyan.3">
                        {formatNumber(lookupResult.currentQuantity)}
                      </Text>
                      <Text size="10px" c="dimmed">
                        {lookupResult.netQuantity || "-"} {lookupResult.unitType || ""}
                      </Text>
                    </Paper>

                    <Paper radius="md" p="sm" withBorder bg="transparent">
                      <Group gap={6} wrap="nowrap">
                        <IconFileText size={13} color="var(--mantine-color-cyan-4)" />
                        <Text size="10px" fw={800} c="dimmed">
                          PO INVOICES QTY
                        </Text>
                      </Group>
                      <Text mt={6} size="xl" fw={800} ff="monospace">
                        {formatNumber(invoices.reduce((sum, row) => sum + Number(row.billedQty || 0), 0))}
                      </Text>
                      <Text size="10px" c="dimmed">
                        {invoices.length} billing rows
                      </Text>
                    </Paper>

                    <Paper radius="md" p="sm" withBorder bg="transparent">
                      <Group gap={6} wrap="nowrap">
                        <IconCurrencyRupee size={13} color="var(--mantine-color-cyan-4)" />
                        <Text size="10px" fw={800} c="dimmed">
                          MRP
                        </Text>
                      </Group>
                      <Text mt={6} size="xl" fw={800} ff="monospace">
                        {formatMoney(lookupResult.mrp)}
                      </Text>
                      <Text size="10px" c="dimmed">
                        Product master price
                      </Text>
                    </Paper>
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                    <Paper radius="md" p="sm" withBorder bg="transparent">
                      <Group gap={6} mb="xs" wrap="nowrap">
                        <IconPackage size={13} color="var(--mantine-color-cyan-4)" />
                        <Text size="10px" fw={800} c="dimmed">
                          PRODUCT MASTER
                        </Text>
                      </Group>
                      <SimpleGrid cols={2} spacing="xs">
                        <div>
                          <Text size="9px" fw={800} c="dimmed">NAME</Text>
                          <Text size="xs" fw={700} truncate>{lookupResult.productName}</Text>
                        </div>
                        <div>
                          <Text size="9px" fw={800} c="dimmed">SKU</Text>
                          <Text size="xs" fw={700} ff="monospace" truncate>{lookupResult.skuCode}</Text>
                        </div>
                        <div>
                          <Text size="9px" fw={800} c="dimmed">COMMODITY</Text>
                          <Text size="xs" fw={700} truncate>{lookupResult.commodityName || "-"}</Text>
                        </div>
                        <div>
                          <Text size="9px" fw={800} c="dimmed">MANUFACTURER</Text>
                          <Text size="xs" fw={700} truncate>{lookupResult.manufacturerName || "-"}</Text>
                        </div>
                        <div>
                          <Text size="9px" fw={800} c="dimmed">NET WEIGHT</Text>
                          <Text size="xs" fw={700} truncate>{lookupResult.weight ? `${lookupResult.weight} kg` : "-"}</Text>
                        </div>
                        <div>
                          <Text size="9px" fw={800} c="dimmed">COUNTRY OF ORIGIN</Text>
                          <Text size="xs" fw={700} truncate>{lookupResult.countryOfOrigin || "-"}</Text>
                        </div>
                      </SimpleGrid>
                    </Paper>

                    <Paper radius="md" p="sm" withBorder bg="transparent">
                      <Group gap={6} mb="xs" wrap="nowrap">
                        <IconMapPin size={13} color="var(--mantine-color-cyan-4)" />
                        <Text size="10px" fw={800} c="dimmed">
                          LOCATION STOCK
                        </Text>
                      </Group>
                      {lookupResult.locations.length === 0 ? (
                        <Group gap="sm" mt="xs" wrap="nowrap" className="rounded-md border border-slate-700/60 px-2 py-2">
                          <IconAlertTriangle size={15} color="var(--mantine-color-yellow-4)" />
                          <Text size="xs" c="dimmed">
                            No allotted locations found for this product.
                          </Text>
                        </Group>
                      ) : (
                        <Stack gap={6} mt="xs">
                          {lookupResult.locations.map((entry) => (
                            <Group
                              key={entry.locationCode}
                              justify="space-between"
                              wrap="nowrap"
                              p="xs"
                              style={{
                                borderRadius: "var(--mantine-radius-md)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                background: "rgba(255, 255, 255, 0.02)"
                              }}
                            >
                              <Group gap={6} wrap="nowrap">
                                <IconMapPin size={13} color="var(--mantine-color-cyan-4)" />
                                <Text size="xs" fw={800} ff="monospace" c="cyan.3">
                                  {entry.locationCode}
                                </Text>
                              </Group>
                              <Text size="xs" fw={800} ff="monospace">
                                {formatNumber(entry.quantity)}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      )}
                    </Paper>
                  </SimpleGrid>

                  <Paper radius="md" p="sm" withBorder bg="transparent">
                    <Group justify="space-between" mb="xs">
                      <Group gap={6} wrap="nowrap">
                        <IconFileText size={13} color="var(--mantine-color-cyan-4)" />
                        <Text size="10px" fw={800} c="dimmed">
                          PO INVOICE DETAILS
                        </Text>
                      </Group>
                      <Badge size="sm" radius="md" variant="light" color="gray">
                        {invoices.length} rows
                      </Badge>
                    </Group>

                    {isInvoiceLoading ? (
                      <Center py="xl">
                        <Stack align="center" gap="xs">
                          <Loader size="sm" color="cyan" />
                          <Text size="xs" c="dimmed">Loading invoice rows...</Text>
                        </Stack>
                      </Center>
                    ) : invoices.length === 0 ? (
                      <Group gap="sm" wrap="nowrap" className="rounded-md border border-slate-700/60 px-2 py-2">
                        <IconAlertTriangle size={15} color="var(--mantine-color-yellow-4)" />
                        <Text size="xs" c="dimmed">
                          No invoices found for this SKU.
                        </Text>
                      </Group>
                    ) : (
                      <ScrollArea type="auto">
                        <Table striped highlightOnHover withTableBorder={false} miw={600}>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Invoice No.</Table.Th>
                              <Table.Th>Date</Table.Th>
                              <Table.Th>Party</Table.Th>
                              <Table.Th ta="right">Invoice Price</Table.Th>
                              <Table.Th ta="right">Billed Qty.</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {invoices.map((invoice) => (
                              <Table.Tr key={invoice.id}>
                                <Table.Td>
                                  <Text size="xs" fw={800} ff="monospace" c="cyan.3">
                                    {invoice.invoiceNumber}
                                  </Text>
                                </Table.Td>
                                <Table.Td style={{ fontSize: "11px" }}>
                                  {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </Table.Td>
                                <Table.Td style={{ fontSize: "11px" }}>{invoice.partyName}</Table.Td>
                                <Table.Td ta="right" style={{ fontSize: "11px" }}>{formatMoney(invoice.mrp)}</Table.Td>
                                <Table.Td ta="right" fw={800} ff="monospace">{formatNumber(invoice.billedQty)}</Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                    )}
                  </Paper>
                </Stack>
              )}
            </Grid.Col>
          </Grid>
        </Stack>
      )}
    </Stack>
  );
});

export default PartyDashboard;
