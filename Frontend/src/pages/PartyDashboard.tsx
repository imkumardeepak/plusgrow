import React, { memo, useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@mantine/hooks";
import * as XLSX from "xlsx";
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
  Box,
  SegmentedControl,
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
  IconDownload,
} from "@tabler/icons-react";

import {
  MantineDataTable,
  DataTableColumn,
} from "../components/molecules/MantineDataTable";

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
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [summary, setSummary] = useState<PartyDashboardSummary>(emptySummary);
  const [stockCheckProductId, setStockCheckProductId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<"menu" | "products" | "stock-check">("menu");
  const [search, setSearch] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [lookupResult, setLookupResult] = useState<PartyDashboardProduct | null>(null);
  const [invoices, setInvoices] = useState<PoInvoice[]>([]);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "mapped" | "unpriced">("all");

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const exportData = filteredProducts.map((p) => ({
      "SKU Code": p.skuCode || "",
      "Alias": p.alias || "",
      "Product Name": p.productName || "",
      "Commodity Name": p.commodityName || "",
      "Manufacturer Name": p.manufacturerName || "",
      "Country of Origin": p.countryOfOrigin || "",
      "Unit Type": p.unitType || "",
      "MRP": p.mrp || 0,
      "USSP": p.ussp || 0,
      "Net Qnty": p.netQuantity || "",
      "Factor": p.factor || "",
      "Best Before (Months)": p.bestBeforeMonths || 0,
      "Weight": p.weight || 0,
      "Ownership": p.ownership || "",
      "Stock Qnty": p.currentQuantity || 0,
      "Note": p.note || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 15 }, // SKU Code
      { wch: 15 }, // Alias
      { wch: 35 }, // Product Name
      { wch: 20 }, // Commodity Name
      { wch: 25 }, // Manufacturer Name
      { wch: 18 }, // Country of Origin
      { wch: 12 }, // Unit Type
      { wch: 12 }, // MRP
      { wch: 12 }, // USSP
      { wch: 12 }, // Net Qnty
      { wch: 15 }, // Factor
      { wch: 20 }, // Best Before (Months)
      { wch: 12 }, // Weight
      { wch: 15 }, // Ownership
      { wch: 12 }, // Stock Qnty
      { wch: 20 }, // Note
    ];
    XLSX.utils.book_append_sheet(wb, ws, "My Products");
    XLSX.writeFile(wb, `My_Products_${(summary?.partyName || "Party").replace(/\s+/g, "_")}.xlsx`);
    toast.success("Products exported successfully");
  };

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

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return summary.products.filter((product) => {
      const matchesSearch =
        !query ||
        product.productName.toLowerCase().includes(query) ||
        (product.skuCode || "").toLowerCase().includes(query) ||
        (product.alias || "").toLowerCase().includes(query) ||
        (product.commodityName || "").toLowerCase().includes(query) ||
        (product.manufacturerName || "").toLowerCase().includes(query);

      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "mapped" && (product.manufacturerName || product.commodityName)) ||
        (filterMode === "unpriced" && Number(product.mrp || 0) <= 0);

      return matchesSearch && matchesFilter;
    });
  }, [filterMode, search, summary.products]);
  const columns = useMemo<DataTableColumn<PartyDashboardProduct>[]>((() => [
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      sortAccessor: (row) => row.skuCode,
      render: (row) => (
        <Text
          size="11px"
          ff="monospace"
          c="blue.4"
          fw={700}
          lineClamp={1}
        >
          {row.skuCode || "N/A"}
        </Text>
      ),
      width: 120,
    },
    {
      key: "alias",
      header: "Alias",
      sortable: true,
      sortAccessor: (row) => row.alias || "",
      render: (row) => (
        <Text size="11px" c="dimmed" lineClamp={1} maw={120}>
          {row.alias || "N/A"}
        </Text>
      ),
      width: 130,
    },
    {
      key: "name",
      header: "Product",
      sortable: true,
      sortAccessor: (row) => row.productName,
      render: (row) => (
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon
            size={38}
            radius="lg"
            variant="light"
            color="cyan"
            style={{
              background: "rgba(30, 192, 243, 0.12)",
              border: "1px solid rgba(30, 192, 243, 0.18)",
            }}
          >
            <IconPackage size={18} />
          </ThemeIcon>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text size="xs" fw={700} lineClamp={1} maw={190}>
              {row.productName}
            </Text>
            <Text size="11px" c="dimmed" lineClamp={1}>
              {row.countryOfOrigin || "No origin"} • {row.unitType || "UNIT"}
            </Text>
          </Stack>
        </Group>
      ),
      width: 280,
    },
    {
      key: "commodity",
      header: "Commodity",
      sortable: true,
      sortAccessor: (row) => row.commodityName || "",
      render: (row) => (
        <Text size="xs" lineClamp={1} maw={130}>
          {row.commodityName || "N/A"}
        </Text>
      ),
      width: 150,
    },
    {
      key: "ownership",
      header: "Ownership",
      sortable: true,
      sortAccessor: (row) => row.ownership || "",
      render: (row) => (
        <Badge size="xs" variant="light" color={row.ownership?.toUpperCase() === "SELF" ? "blue" : "orange"}>
          {row.ownership || "N/A"}
        </Badge>
      ),
      width: 100,
    },
    {
      key: "mrp",
      header: "MRP",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.mrp || 0,
      render: (row) => (
        <Text size="xs" fw={800} c="green.3">
          Rs {row.mrp ? Number(row.mrp).toFixed(2) : "0.00"}
        </Text>
      ),
      width: 110,
    },
    {
      key: "ussp",
      header: "USSP",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.ussp || 0,
      render: (row) => (
        <Text size="xs" fw={700} c="cyan.3">
          Rs {row.ussp ? Number(row.ussp).toFixed(2) : "0.00"}
        </Text>
      ),
      width: 110,
    },
    {
      key: "pack",
      header: "Pack",
      sortable: true,
      sortAccessor: (row) => `${row.netQuantity || ""}-${row.bestBeforeMonths || ""}`,
      render: (row) => (
        <Text size="xs" lineClamp={1}>
          {row.netQuantity || "N/A"} • {row.bestBeforeMonths || 84} mo
        </Text>
      ),
      width: 110,
    },
    {
      key: "stock",
      header: "Stock Qty",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.currentQuantity,
      render: (row) => (
        <Text fw={900} c="cyan.3" size="xs" ff="monospace">
          {formatNumber(row.currentQuantity)}
        </Text>
      ),
      width: 100,
    },
  ]), []);

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

      {activeView === "menu" && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {/* Card 1: My Products */}
          <Card
            withBorder
            radius="lg"
            p="xl"
            onClick={() => setActiveView("products")}
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
              <ThemeIcon color="teal" variant="light" size={48} radius="md">
                <IconBox size={28} />
              </ThemeIcon>
              <Badge color="teal" variant="light" size="lg">
                Products
              </Badge>
            </Group>
            <Text size="xl" fw={900} mt="md" c="white">
              My Products
            </Text>
            <Text size="sm" c="dimmed" mt="xs">
              View your mapped product catalog, descriptions, MRPs, unit sizes, and total quantities.
            </Text>
          </Card>

          {/* Card 2: Stock Check */}
          <Card
            withBorder
            radius="lg"
            p="xl"
            onClick={() => setActiveView("stock-check")}
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
      )}

      {activeView === "products" && (
        <Stack gap="md">
          <Paper radius="md" p="sm" withBorder bg="rgba(6, 19, 31, 0.2)">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconBox size={20} color="var(--mantine-color-cyan-4)" />
                <Text fw={800}>My Products Catalog</Text>
              </Group>
              <Button
                variant="subtle"
                color="cyan"
                size="xs"
                onClick={() => {
                  setActiveView("menu");
                  setSearch("");
                  setFilterMode("all");
                }}
              >
                Back to Dashboard
              </Button>
            </Group>
          </Paper>

          {/* Replicated Scope Filters Panel */}
          <Paper radius="md" p="md" withBorder>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Box>
                <Text size="10px" fw={800} c="dimmed" mb={5}>
                  PRODUCT SCOPE
                </Text>
                <SegmentedControl
                  fullWidth
                  size="xs"
                  radius="md"
                  value={filterMode}
                  onChange={(value) =>
                    setFilterMode(value as "all" | "mapped" | "unpriced")
                  }
                  data={[
                    { value: "all", label: "All" },
                    { value: "mapped", label: "Mapped" },
                    { value: "unpriced", label: "Unpriced" },
                  ]}
                />
              </Box>

              <TextInput
                size="xs"
                radius="md"
                label="Search"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search SKU, alias, product, manufacturer..."
                leftSection={<IconSearch size={14} />}
              />

              <Box>
                <Text size="10px" fw={800} c="dimmed" mb={5}>
                  QUICK ACTION
                </Text>
                <Group gap="xs" wrap="nowrap">
                  <Button
                    size="xs"
                    variant="light"
                    color="cyan"
                    onClick={() => {
                      setFilterMode("unpriced");
                      setSearch("");
                    }}
                  >
                    Missing MRP
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => {
                      setFilterMode("all");
                      setSearch("");
                    }}
                  >
                    Clear All
                  </Button>
                </Group>
              </Box>
            </SimpleGrid>
          </Paper>

          <Card withBorder radius="md" p={0}>
            <Group justify="space-between" p="md" pb="xs" gap="md">
              <Group gap="xs">
                <IconBox size={18} color="var(--mantine-color-cyan-4)" />
                <Text fw={800}>Mapped Products</Text>
                <Badge variant="light">{filteredProducts.length} rows</Badge>
              </Group>
              <Button
                size="xs"
                variant="outline"
                color="cyan"
                onClick={handleExportExcel}
                leftSection={<IconDownload size={16} />}
              >
                Export to Excel
              </Button>
            </Group>

            {isMobile ? (
              <Stack gap="sm" p="md">
                {filteredProducts.map((product) => (
                  <Card key={product.productId} withBorder radius="md" p="sm" bg="rgba(6, 19, 31, 0.2)">
                    <Group justify="space-between" mb="xs">
                      <Badge variant="light" color="gray">
                        {product.skuCode || "N/A"}
                      </Badge>
                      <Text fw={900} c="cyan.3" size="sm">
                        Stock: {formatNumber(product.currentQuantity)}
                      </Text>
                    </Group>
                    <Text size="sm" fw={800} lineClamp={2}>
                      {product.productName}
                    </Text>
                    {product.alias && (
                      <Text size="xs" c="dimmed" mb="xs">
                        {product.alias}
                      </Text>
                    )}
                    <Divider my="xs" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
                    <SimpleGrid cols={2} spacing="xs">
                      <div>
                        <Text size="9px" fw={800} c="dimmed">COMMODITY</Text>
                        <Text size="xs" fw={700} truncate>{product.commodityName || "-"}</Text>
                      </div>
                      <div>
                        <Text size="9px" fw={800} c="dimmed">MANUFACTURER</Text>
                        <Text size="xs" fw={700} truncate>{product.manufacturerName || "-"}</Text>
                      </div>
                      <div>
                        <Text size="9px" fw={800} c="dimmed">COUNTRY / UNIT</Text>
                        <Text size="xs" fw={700} truncate>
                          {product.countryOfOrigin || "-"} ({product.unitType || "UNIT"})
                        </Text>
                      </div>
                      <div>
                        <Text size="9px" fw={800} c="dimmed">MRP / USSP</Text>
                        <Text size="xs" fw={700} truncate>
                          {product.mrp ? formatMoney(product.mrp) : "-"} / {product.ussp ? formatMoney(product.ussp) : "-"}
                        </Text>
                      </div>
                      <div>
                        <Text size="9px" fw={800} c="dimmed">PACK / WEIGHT</Text>
                        <Text size="xs" fw={700} truncate>
                          {product.netQuantity || "-"} ({product.bestBeforeMonths || 84} mo) / {product.weight ? `${Number(product.weight).toFixed(2)} kg` : "-"}
                        </Text>
                      </div>
                      <div>
                        <Text size="9px" fw={800} c="dimmed">OWNERSHIP</Text>
                        <Text size="xs" fw={700} truncate>{product.ownership || "-"}</Text>
                      </div>
                    </SimpleGrid>
                    {product.note && (
                      <>
                        <Divider my="xs" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
                        <div>
                          <Text size="9px" fw={800} c="dimmed">NOTE</Text>
                          <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>{product.note}</Text>
                        </div>
                      </>
                    )}
                  </Card>
                ))}
                {filteredProducts.length === 0 && (
                  <Center py="xl">
                    <Text size="sm" c="dimmed">No products match this view.</Text>
                  </Center>
                )}
              </Stack>
            ) : (
              <MantineDataTable<PartyDashboardProduct>
                data={filteredProducts}
                columns={columns}
                rowKey={(row) => row.productId}
                isLoading={false}
                emptyIcon={IconBox}
                emptyTitle="No product rows"
                emptyDescription="No products match current search or filter."
                itemLabel="products"
                resetPageKey={`${search}-${filterMode}`}
              />
            )}
          </Card>
        </Stack>
      )}

      {activeView === "stock-check" && (
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
                  setActiveView("menu");
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
                      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
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
                    ) : isMobile ? (
                      <Stack gap="xs" mt="xs">
                        {invoices.map((invoice) => (
                          <Card key={invoice.id} withBorder radius="md" p="xs" bg="rgba(6, 19, 31, 0.2)">
                            <Group justify="space-between" mb={4}>
                              <Text size="xs" fw={800} ff="monospace" c="cyan.3">
                                {invoice.invoiceNumber}
                              </Text>
                              <Text size="xs" fw={800}>
                                Qty: {formatNumber(invoice.billedQty)}
                              </Text>
                            </Group>
                            <Group justify="space-between" mb={2}>
                              <Text size="11px" c="dimmed">
                                {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </Text>
                              <Text size="11px" fw={700}>
                                {formatMoney(invoice.mrp)}
                              </Text>
                            </Group>
                            <Text size="11px" c="dimmed" truncate>
                              Party: {invoice.partyName}
                            </Text>
                          </Card>
                        ))}
                      </Stack>
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
