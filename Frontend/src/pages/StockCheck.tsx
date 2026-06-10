import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Factory,
  FileText,
  IndianRupee,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  ScanLine,
  Search,
  History,
  Tag,
  X,
  Save,
  Trash2,
  Eye,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge as MBadge,
  Box,
  Center,
  Divider,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { Button } from "../components/atoms/Button";
import { Badge } from "../components/atoms/Badge";
import { toast } from "../lib/toast";
import {
  OperationsPage,
  OperationsPanel,
  OperationsEmptyState,
} from "../components/organisms/Operations/OperationsShell";
import {
  Manufacturer,
  manufacturersApi,
  poInvoicesApi,
  PoInvoice,
  productAllottedLocationsApi,
  ProductAllottedLocationRecord,
  productQuantitiesApi,
  Product,
  ProductQuantityRecord,
  ProductStockMovementRecord,
  productsApi,
  stockCheckReportsApi,
  StockCheckReport,
  StockCheckReportItem,
} from "../services/masterApi";
import { ProductFormModal } from "../components/organisms/ProductFormModal";
import { StickerPrintModal } from "../components/organisms/StickerPrintModal";

type ActiveMode = "hub" | "verify" | "location" | "manufacturer" | "product" | "history";
type CheckSessionStatus = "idle" | "running" | "paused";
type StockCheckReportStatus = "PAUSED" | "COMPLETED";
type StockCheckDraft = {
  referenceId?: string | null;
  referenceCode?: string;
  isLocked?: boolean;
  sessionStatus: CheckSessionStatus;
  scanInput: string;
  scannedItems: ScannedItem[];
  updatedAt: string;
};

type ScannedItem = {
  sku: string;
  productName: string;
  productId: number | null;
  scannedQty: number;
  systemQty: number;
  isUnexpected: boolean;
  alias?: string;
};

type LocationStock = {
  locationCode: string;
  quantity: number;
};

type ProductLookupResult = {
  sku: string;
  product: Product | null;
  quantityRow: ProductQuantityRecord | null;
  allottedLocation: ProductAllottedLocationRecord | null;
  invoices: PoInvoice[];
  movements: ProductStockMovementRecord[];
  locations: LocationStock[];
  totalPoQuantity: number;
  totalLocationStock: number;
};

const formatMoney = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value)
    : "-";

const normalizeSku = (value?: string | null) => (value || "").trim().toUpperCase();

const masterHref = (path: string, search: string) =>
  `${path}?search=${encodeURIComponent(search)}`;

const getLocationJson = (row: ProductAllottedLocationRecord | null) => {
  if (!row) return {};
  return (
    row.locationJson ||
    (row as unknown as { LocationJson?: Record<string, number> }).LocationJson ||
    {}
  );
};

const STOCK_CHECK_DRAFT_KEYS = {
  location: "plusgrow.stockCheck.locationDraft",
  manufacturer: "plusgrow.stockCheck.manufacturerDraft",
  product: "plusgrow.stockCheck.productDraft",
} as const;

const readStockCheckDraft = (key: string): StockCheckDraft | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StockCheckDraft) : null;
  } catch {
    return null;
  }
};

const writeStockCheckDraft = (key: string, draft: Omit<StockCheckDraft, "updatedAt">) => {
  window.localStorage.setItem(
    key,
    JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    }),
  );
};

const clearStockCheckDraft = (key: string) => {
  window.localStorage.removeItem(key);
};

const saveStockCheckReport = async (
  checkType: string,
  referenceName: string,
  scannedItems: ScannedItem[],
  status: StockCheckReportStatus,
) => {
  const totalSystem = scannedItems.reduce((sum, item) => sum + item.systemQty, 0);
  const totalScanned = scannedItems.reduce((sum, item) => sum + item.scannedQty, 0);
  const itemsWithVariance = scannedItems.filter((item) => item.scannedQty !== item.systemQty).length;

  const items: StockCheckReportItem[] = scannedItems.map((item) => ({
    sku: item.sku,
    productName: item.productName,
    systemQty: item.systemQty,
    scannedQty: item.scannedQty,
    variance: item.scannedQty - item.systemQty,
    isUnexpected: item.isUnexpected,
  }));

  await stockCheckReportsApi.create({
    checkType,
    referenceName,
    totalSystemQty: totalSystem,
    totalScannedQty: totalScanned,
    totalVariance: totalScanned - totalSystem,
    itemsChecked: scannedItems.length,
    itemsWithVariance,
    itemsJson: JSON.stringify(items),
    status,
  });
};


export const StockCheck = memo(function StockCheck() {
  const [activeMode, setActiveMode] = useState<ActiveMode>("hub");
  const isMobile = useMediaQuery("(max-width: 48em)");

  const handleBack = useCallback(() => setActiveMode("hub"), []);

  return (
    <>
      {activeMode === "hub" && <StockCheckHub onSelectMode={setActiveMode} isMobile={!!isMobile} />}
      {activeMode === "verify" && <StockVerifyMode onBack={handleBack} isMobile={!!isMobile} />}
      {activeMode === "location" && <LocationCheckMode onBack={handleBack} isMobile={!!isMobile} />}
      {activeMode === "manufacturer" && <ManufacturerCheckMode onBack={handleBack} isMobile={!!isMobile} />}
      {activeMode === "product" && <ProductCheckMode onBack={handleBack} isMobile={!!isMobile} />}
      {activeMode === "history" && <StockCheckHistoryMode onBack={handleBack} isMobile={!!isMobile} />}
    </>
  );
});

/* ─────────────────────────────── HUB DASHBOARD ─────────────────────────────── */

function StockCheckHub({
  onSelectMode,
  isMobile,
}: {
  onSelectMode: (mode: ActiveMode) => void;
  isMobile: boolean;
}) {
  const cards: {
    mode: ActiveMode;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    description: string;
    color: string;
    gradient: string;
    small?: boolean;
  }[] = [
    {
      mode: "verify",
      icon: Eye,
      title: "Stock Verify",
      description: "Quick single-SKU lookup. View master data, invoices, locations, and stock details.",
      color: "rgba(99, 102, 241, 0.8)",
      gradient: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(15,23,42,0.6) 100%)",
      small: true,
    },
    {
      mode: "location",
      icon: MapPin,
      title: "Check by Location",
      description: "Scan a location code, then scan all products at that location to verify stock counts.",
      color: "rgba(14, 165, 233, 0.8)",
      gradient: "linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(15,23,42,0.6) 100%)",
    },
    {
      mode: "manufacturer",
      icon: Factory,
      title: "Check by Manufacturer",
      description: "Select a manufacturer and scan all their products to verify inventory counts.",
      color: "rgba(245, 158, 11, 0.8)",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(15,23,42,0.6) 100%)",
    },
    {
      mode: "product",
      icon: Package,
      title: "Check by Product",
      description: "Select a product and scan all matching items. Unexpected products will be flagged for verification.",
      color: "rgba(16, 185, 129, 0.8)",
      gradient: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(15,23,42,0.6) 100%)",
    },
    {
      mode: "history",
      icon: History,
      title: "Report History",
      description: "View past stock check reports. Filter by type, date, and search. Review variance summaries.",
      color: "rgba(168, 85, 247, 0.8)",
      gradient: "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(15,23,42,0.6) 100%)",
      small: true,
    },
  ];

  return (
    <OperationsPage
      title="Stock Check"
      description="Physical inventory verification hub. Select a mode to begin scanning and verifying stock."
      icon={ClipboardCheck}
      hideHeader={isMobile}
    >
      {isMobile && (
        <Paper
          radius="lg"
          p="sm"
          mb="xs"
          style={{
            background: "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(15,23,42,0.8) 100%)",
            border: "1px solid rgba(14,165,233,0.18)",
          }}
        >
          <Group gap={8} wrap="nowrap">
            <ThemeIcon size={32} radius="xl" variant="gradient" gradient={{ from: "cyan.4", to: "blue.7", deg: 145 }}>
              <ClipboardCheck size={16} />
            </ThemeIcon>
            <Box>
              <Text fw={800} size="sm" c="white">Stock Check</Text>
              <Text size="10px" c="dimmed">Select a mode below</Text>
            </Box>
          </Group>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {cards.map((card) => (
          <Paper
            key={card.mode}
            radius="xl"
            p={isMobile ? "md" : "lg"}
            withBorder
            onClick={() => onSelectMode(card.mode)}
            style={{
              cursor: "pointer",
              background: card.gradient,
              borderColor: card.color.replace("0.8", "0.25"),
              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: `0 4px 24px ${card.color.replace("0.8", "0.12")}`,
            }}
            className="hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <ThemeIcon
                  size={isMobile ? 40 : 48}
                  radius="xl"
                  style={{
                    background: card.color.replace("0.8", "0.2"),
                    border: `1px solid ${card.color.replace("0.8", "0.35")}`,
                    color: card.color.replace("0.8", "1"),
                  }}
                >
                  <card.icon size={isMobile ? 20 : 24} />
                </ThemeIcon>
                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </Group>
              <Box>
                <Text fw={800} size={isMobile ? "sm" : "md"} c="white" mb={4}>
                  {card.title}
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.55 }}>
                  {card.description}
                </Text>
              </Box>
              {card.small && (
                <MBadge size="xs" variant="light" color="indigo" radius="md">
                  Quick Lookup
                </MBadge>
              )}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </OperationsPage>
  );
}

/* ─────────────────────── SHARED: BACK HEADER ─────────────────────── */

function ModeHeader({
  title,
  icon: Icon,
  onBack,
  isMobile,
  actions,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  onBack: () => void;
  isMobile: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <Group justify="space-between" mb={isMobile ? "xs" : "sm"}>
      <Group gap="xs" wrap="nowrap">
        <ActionIcon
          variant="subtle"
          size={isMobile ? "md" : "lg"}
          radius="xl"
          onClick={onBack}
          style={{ color: "var(--mantine-color-cyan-3)" }}
        >
          <ArrowLeft size={18} />
        </ActionIcon>
        <Icon size={isMobile ? 18 : 20} />
        <Text fw={800} size={isMobile ? "sm" : "md"} c="white">
          {title}
        </Text>
      </Group>
      {actions && <Group gap="xs">{actions}</Group>}
    </Group>
  );
}

/* ─────────────────────── SHARED: VARIANCE TABLE ─────────────────────── */

function VarianceTable({
  items,
  isMobile,
  onRemove,
}: {
  items: ScannedItem[];
  isMobile: boolean;
  onRemove?: (sku: string) => void;
}) {
  if (items.length === 0) {
    return (
      <Paper
        radius="lg"
        p="md"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Text size="xs" c="dimmed" ta="center">
          No items scanned yet. Start scanning to see variance.
        </Text>
      </Paper>
    );
  }

  const totalSystem = items.reduce((s, i) => s + i.systemQty, 0);
  const totalScanned = items.reduce((s, i) => s + i.scannedQty, 0);
  const totalVariance = totalScanned - totalSystem;

  return (
    <Stack gap="xs">
      <SimpleGrid cols={3} spacing="xs">
        <Paper radius="lg" p="xs" withBorder bg="transparent">
          <Text size="9px" fw={800} c="dimmed">SYSTEM QTY</Text>
          <Text size="lg" fw={800} ff="monospace" c="cyan.3">{totalSystem}</Text>
        </Paper>
        <Paper radius="lg" p="xs" withBorder bg="transparent">
          <Text size="9px" fw={800} c="dimmed">SCANNED QTY</Text>
          <Text size="lg" fw={800} ff="monospace" c="white">{totalScanned}</Text>
        </Paper>
        <Paper radius="lg" p="xs" withBorder bg="transparent">
          <Text size="9px" fw={800} c="dimmed">VARIANCE</Text>
          <Text
            size="lg"
            fw={800}
            ff="monospace"
            c={totalVariance === 0 ? "green.4" : totalVariance > 0 ? "yellow.4" : "red.4"}
          >
            {totalVariance > 0 ? "+" : ""}{totalVariance}
          </Text>
        </Paper>
      </SimpleGrid>

      <ScrollArea type="auto">
        <Table striped highlightOnHover withTableBorder withColumnBorders miw={isMobile ? 500 : undefined}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>SKU</Table.Th>
              <Table.Th>Product</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>System</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Scanned</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Variance</Table.Th>
              {onRemove && <Table.Th style={{ width: 40 }}></Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => {
              const variance = item.scannedQty - item.systemQty;
              return (
                <Table.Tr
                  key={item.sku}
                  style={item.isUnexpected ? { background: "rgba(245,158,11,0.06)" } : undefined}
                >
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Text size="12px" fw={700} ff="monospace">{item.sku}</Text>
                      {item.isUnexpected && (
                        <MBadge size="xs" color="orange" variant="light">NEW</MBadge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="12px" fw={600} lineClamp={1}>{item.productName}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="12px" fw={700} ff="monospace">{item.systemQty}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="12px" fw={800} ff="monospace" c="white">{item.scannedQty}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text
                      size="12px"
                      fw={900}
                      ff="monospace"
                      c={variance === 0 ? "green.4" : variance > 0 ? "yellow.4" : "red.4"}
                    >
                      {variance > 0 ? "+" : ""}{variance}
                    </Text>
                  </Table.Td>
                  {onRemove && (
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        color="red"
                        onClick={() => onRemove(item.sku)}
                      >
                        <X size={12} />
                      </ActionIcon>
                    </Table.Td>
                  )}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}

/* ─────────────────────── SHARED: SCAN INPUT ─────────────────────── */

function ScanInput({
  label,
  placeholder,
  value,
  onChange,
  onScan,
  icon,
  disabled,
  autoFocus,
  id,
  isMobile,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onScan: (val: string) => void;
  icon: React.ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  isMobile: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => ref.current?.focus(), 50);
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      onScan(value.trim());
    }
  };

  return (
    <Box>
      <Text size="10px" fw={800} c="dimmed" mb={4}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        ref={ref}
        id={id}
        size={isMobile ? "md" : "sm"}
        radius="md"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        leftSection={icon}
        clearable
        styles={{
          input: {
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: isMobile ? "16px" : "13px",
          },
        }}
      />
    </Box>
  );
}

/* ═════════════════════════════════════════════════════════════════════ */
/*                      MODE 1 — STOCK VERIFY                         */
/* ═════════════════════════════════════════════════════════════════════ */

function StockVerifyMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [allottedLocations, setAllottedLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintProduct, setSelectedPrintProduct] = useState<Product | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productsData, quantityData, allottedData] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setProducts(productsData);
      setQuantityRows(quantityData);
      setAllottedLocations(allottedData);
    } catch {
      toast.error("Failed to load product detail data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const focusScanner = () => {
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handlePrint = (product: Product) => {
    setSelectedPrintProduct(product);
    setIsPrintModalOpen(true);
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const rawInput = scanInput.trim();
    if (!rawInput) return;

    const sku = normalizeSku(rawInput.split("#")[0]);
    setScanInput(sku);

    const product =
      products.find((item) => normalizeSku(item.sku) === sku || normalizeSku(item.alias) === sku) ?? null;
    const quantityRow =
      quantityRows.find((row) => normalizeSku(row.skuCode) === sku || normalizeSku(row.alias) === sku) ?? null;
    const resolvedProductId = product?.id ?? quantityRow?.productId ?? null;
    const allottedLocation =
      allottedLocations.find((row) =>
        resolvedProductId
          ? row.productId === resolvedProductId
          : normalizeSku(row.skuCode) === sku || normalizeSku(row.alias) === sku,
      ) ??
      allottedLocations.find((row) => normalizeSku(row.skuCode) === sku || normalizeSku(row.alias) === sku) ??
      null;

    try {
      setIsSearching(true);
      const [invoiceRows, movementRows] = await Promise.all([
        poInvoicesApi.getAll({ search: sku, pageSize: 100 }),
        productQuantitiesApi.getMovements(sku),
      ]);
      const resolvedSku = product?.sku
        ? normalizeSku(product.sku)
        : quantityRow?.skuCode
          ? normalizeSku(quantityRow.skuCode)
          : sku;
      const invoices = invoiceRows
        .filter((row) => normalizeSku(row.skuCode) === resolvedSku)
        .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime() || b.id - a.id);
      const movements = movementRows
        .filter((row) =>
          resolvedProductId ? row.productId === resolvedProductId : normalizeSku(row.skuCode) === resolvedSku,
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id);
      const locations = Object.entries(getLocationJson(allottedLocation))
        .map(([locationCode, quantity]) => ({ locationCode, quantity: Number(quantity) || 0 }))
        .filter((entry) => entry.quantity > 0)
        .sort((a, b) => a.locationCode.localeCompare(b.locationCode));

      setLookupResult({
        sku,
        product,
        quantityRow,
        allottedLocation,
        invoices,
        movements,
        locations,
        totalPoQuantity: invoices.reduce((sum, row) => sum + Number(row.billedQty || 0), 0),
        totalLocationStock: locations.reduce((sum, row) => sum + row.quantity, 0),
      });

      if (!product && !quantityRow && !allottedLocation && invoices.length === 0 && movements.length === 0) {
        toast.error("No product details found for this SKU");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load SKU details");
    } finally {
      setIsSearching(false);
      focusScanner();
    }
  };

  const productTitle =
    lookupResult?.product?.name ||
    lookupResult?.quantityRow?.productName ||
    lookupResult?.allottedLocation?.productName ||
    lookupResult?.invoices[0]?.productName ||
    "Product Details";

  return (
    <OperationsPage
      title="Stock Verify"
      description="Quick single-SKU lookup to view product master, invoice pricing, stock, and location data."
      icon={Eye}
      hideHeader
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] px-3 font-bold uppercase tracking-wider"
            onClick={() => void loadData()}
            loading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      }
    >
      <ModeHeader title="Stock Verify" icon={Eye} onBack={onBack} isMobile={isMobile} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        <OperationsPanel
          title="Item Lookup"
          icon={ScanLine}
          description="Scan or enter a SKU to open inventory reference card."
          className="lg:col-span-4 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin space-y-4"
        >
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-1.5">
              <Text size="10px" fw={800} c="dimmed" mb={5}>SKU CODE</Text>
              <TextInput
                ref={inputRef}
                size={isMobile ? "md" : "sm"}
                radius="md"
                placeholder="Scan or enter SKU..."
                value={scanInput}
                onChange={(e) => setScanInput(e.currentTarget.value)}
                required
                styles={{
                  input: {
                    textTransform: "uppercase",
                    fontFamily: "var(--font-mono)",
                    fontSize: isMobile ? "16px" : undefined,
                  },
                }}
                leftSection={<Search size={14} />}
              />
            </div>
            <Group gap="xs" wrap="nowrap">
              <Button type="submit" size="sm" className="flex-1" disabled={isLoading} loading={isSearching}>
                Show Details
              </Button>
              <Button
                type="button"
                size="sm"
                variant="subtle"
                onClick={() => { setScanInput(""); setLookupResult(null); focusScanner(); }}
              >
                Clear
              </Button>
            </Group>
          </form>

          <SimpleGrid cols={{ base: 2, lg: 2 }} spacing="sm">
            <Paper radius="lg" p="sm" withBorder bg="transparent">
              <Text size="10px" fw={800} c="dimmed">PRODUCT ROWS</Text>
              <Text mt={6} size="lg" fw={800} c="white">{products.length}</Text>
            </Paper>
            <Paper radius="lg" p="sm" withBorder bg="transparent">
              <Text size="10px" fw={800} c="dimmed">LOCATION ROWS</Text>
              <Text mt={6} size="lg" fw={800} c="white">{allottedLocations.length}</Text>
            </Paper>
          </SimpleGrid>

          {lookupResult ? (
            <Paper radius="lg" p="sm" withBorder bg="rgba(14, 165, 233, 0.06)">
              <Text size="10px" fw={800} c="dimmed" mb={8}>LINKED REFERENCES</Text>
              <Stack gap={7}>
                <ReferenceLink
                  icon={Package}
                  label="Product Master"
                  value={productTitle}
                  onClick={() => lookupResult?.product && setIsEditModalOpen(true)}
                  isButton
                />
                <ReferenceLink
                  icon={FileText}
                  label="PO Invoices"
                  value={`${lookupResult.invoices.length} invoice rows`}
                  href={masterHref("/inward", lookupResult.sku)}
                />
                <ReferenceLink
                  icon={MapPin}
                  label="Location Master"
                  value={`${lookupResult.locations.length} allotted locations`}
                  href={masterHref("/warehouse-map", lookupResult.locations[0]?.locationCode || lookupResult.sku)}
                />
                <ReferenceLink
                  icon={History}
                  label="Stock Adjustments"
                  value={`${lookupResult.movements.length} movement rows`}
                  href={masterHref("/stock-movement", lookupResult.sku)}
                />
              </Stack>
            </Paper>
          ) : (
            <Paper radius="lg" p="sm" withBorder bg="rgba(14, 165, 233, 0.06)">
              <Group gap="sm" wrap="nowrap">
                <Boxes size={17} color="var(--mantine-color-cyan-4)" />
                <Text size="xs" c="dimmed">
                  This page is read-only. It shows connected product, invoice, and location records without changing stock.
                </Text>
              </Group>
            </Paper>
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Inventory Details"
          icon={Boxes}
          description="Reference-linked product master, PO invoice rows, quantity, and location stock."
          className="lg:col-span-8 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          {!lookupResult ? (
            <OperationsEmptyState
              icon={ClipboardCheck}
              title="Enter SKU To View Product Details"
              description="Search a SKU code to see invoice details, price, quantity, and allotted stock locations."
            />
          ) : (
            <Stack gap="sm">
              <Paper
                radius="lg"
                p="md"
                withBorder
                bg="linear-gradient(135deg, rgba(14, 165, 233, 0.10), rgba(15, 23, 42, 0.72))"
                style={{ borderColor: "rgba(34, 211, 238, 0.16)" }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div className="min-w-0">
                    <Group gap="xs" wrap="nowrap">
                      <Badge size="sm" radius="md" variant="default" color="gray">{lookupResult.sku}</Badge>
                      <Badge size="sm" radius="md" variant={lookupResult.quantityRow ? "success" : "warning"}>
                        {lookupResult.quantityRow ? "Stock Available" : "No Stock Row"}
                      </Badge>
                    </Group>
                    <MasterLink
                      onClick={() => lookupResult?.product && setIsEditModalOpen(true)}
                      size="lg"
                      weight={900}
                      className="mt-2"
                    >
                      {productTitle}
                    </MasterLink>
                    <Text size="11px" c="dimmed">
                      {lookupResult.quantityRow
                        ? `Stock updated ${format(new Date(lookupResult.quantityRow.updatedAt), "dd MMM yyyy HH:mm")}`
                        : "No stock quantity row exists for this SKU"}
                    </Text>
                  </div>
                </Group>
              </Paper>

              <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={Boxes} label="Current Stock" />
                  <Text mt={6} size="xl" fw={800} ff="monospace">{lookupResult.quantityRow?.currentQuantity ?? 0}</Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={FileText} label="PO Qty." />
                  <Text mt={6} size="xl" fw={800} ff="monospace">{lookupResult.totalPoQuantity}</Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={MapPin} label="Allotted Stock" />
                  <Text mt={6} size="xl" fw={800} ff="monospace">{lookupResult.totalLocationStock}</Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={IndianRupee} label="Latest Invoice Price" />
                  <Text mt={6} size="xl" fw={800} ff="monospace">{formatMoney(lookupResult.invoices[0]?.mrp)}</Text>
                </Paper>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={Package} label="Product Master" />
                  <SimpleGrid cols={2} spacing={6} mt="xs">
                    <Info label="Name" value={
                      <MasterLink onClick={() => lookupResult?.product && setIsEditModalOpen(true)}>
                        {lookupResult.product?.name || productTitle}
                      </MasterLink>
                    } />
                    <Info label="SKU" value={
                      <MasterLink onClick={() => lookupResult?.product && setIsEditModalOpen(true)} mono>
                        {lookupResult.product?.sku || lookupResult.sku}
                      </MasterLink>
                    } />
                    <Info label="MRP" value={formatMoney(lookupResult.product?.mrp)} />
                    <Info label="USSP" value={formatMoney(lookupResult.product?.ussp)} />
                    <Info label="Net Qty." value={lookupResult.product?.netQuantity || "-"} />
                    <Info label="Unit" value={lookupResult.product?.unitType || "-"} />
                    <Info label="Country" value={lookupResult.product?.countryOfOrigin || "-"} />
                    <Info label="Best Before" value={`${lookupResult.product?.bestBeforeMonths ?? "-"} months`} />
                  </SimpleGrid>
                  {lookupResult.product?.note && (
                    <>
                      <Divider my="xs" style={{ borderColor: "rgba(255,255,255,0.08)" }} />
                      <div className="min-w-0">
                        <Text size="9px" fw={800} c="dimmed">PRODUCT NOTE</Text>
                        <Text size="12px" fw={700} mt={2} style={{ whiteSpace: "pre-wrap" }}>
                          {lookupResult.product.note}
                        </Text>
                      </div>
                    </>
                  )}
                </Paper>

                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={MapPin} label="Location Stock" />
                  {lookupResult.locations.length === 0 ? (
                    <EmptyInline message="No allotted location stock found for this SKU." />
                  ) : (
                    <Stack gap={6} mt="xs">
                      {lookupResult.locations.map((entry) => (
                        <Group
                          key={entry.locationCode}
                          justify="space-between"
                          wrap="nowrap"
                          className="rounded-md border border-slate-700/60 px-2 py-1.5"
                        >
                          <Group gap={6} wrap="nowrap">
                            <MapPin size={13} color="var(--mantine-color-cyan-4)" />
                            <MasterLink href={masterHref("/warehouse-map", entry.locationCode)} mono>
                              {entry.locationCode}
                            </MasterLink>
                          </Group>
                          <Text size="12px" fw={800} ff="monospace">{entry.quantity}</Text>
                        </Group>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </SimpleGrid>

              <Paper radius="lg" p="sm" withBorder bg="transparent">
                <Group justify="space-between" mb="xs">
                  <MetricLabel icon={FileText} label="PO Invoice Details With Price" />
                  <Badge size="sm" radius="md" variant="default" color="gray">{lookupResult.invoices.length} rows</Badge>
                </Group>
                {lookupResult.invoices.length === 0 ? (
                  <EmptyInline message="No PO invoice rows found for this SKU." />
                ) : (
                  <ScrollArea type="auto">
                    <Table striped highlightOnHover withTableBorder withColumnBorders miw={760}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Invoice No.</Table.Th>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Party</Table.Th>
                          <Table.Th>Product</Table.Th>
                          <Table.Th>Invoice Price</Table.Th>
                          <Table.Th>Billed Qty.</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {lookupResult.invoices.map((invoice) => (
                          <Table.Tr key={invoice.id}>
                            <Table.Td>
                              <MasterLink href={masterHref("/inward", invoice.invoiceNumber)} mono>
                                {invoice.invoiceNumber}
                              </MasterLink>
                            </Table.Td>
                            <Table.Td>{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</Table.Td>
                            <Table.Td>{invoice.partyName}</Table.Td>
                            <Table.Td>
                              <MasterLink onClick={() => {
                                const prod = products.find(p => p.sku === invoice.skuCode);
                                if (prod) {
                                  setLookupResult(prev => prev ? { ...prev, product: prod } : null);
                                  setIsEditModalOpen(true);
                                } else {
                                  navigate(masterHref("/mpd", invoice.skuCode));
                                }
                              }}>
                                {invoice.productName}
                              </MasterLink>
                            </Table.Td>
                            <Table.Td>{formatMoney(invoice.mrp)}</Table.Td>
                            <Table.Td>{invoice.billedQty}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </Paper>

              <Paper radius="lg" p="sm" withBorder bg="transparent">
                <Group justify="space-between" mb="xs">
                  <MetricLabel icon={History} label="Stock Adjustment / Movement History" />
                  <Badge size="sm" radius="md" variant="default" color="gray">{lookupResult.movements.length} rows</Badge>
                </Group>
                {lookupResult.movements.length === 0 ? (
                  <EmptyInline message="No stock adjustment or movement history found for this SKU." />
                ) : (
                  <ScrollArea type="auto">
                    <Table striped highlightOnHover withTableBorder withColumnBorders miw={860}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th>Change</Table.Th>
                          <Table.Th>Before</Table.Th>
                          <Table.Th>After</Table.Th>
                          <Table.Th>Reason</Table.Th>
                          <Table.Th>By</Table.Th>
                          <Table.Th>Notes</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {lookupResult.movements.map((movement) => (
                          <Table.Tr key={movement.id}>
                            <Table.Td>{format(new Date(movement.createdAt), "dd MMM yyyy HH:mm")}</Table.Td>
                            <Table.Td>
                              <Badge size="sm" radius="md" variant={movement.quantityChange >= 0 ? "success" : "warning"}>
                                {movement.movementType || (movement.quantityChange >= 0 ? "increase" : "decrease")}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text
                                size="12px"
                                fw={900}
                                ff="monospace"
                                c={movement.quantityChange >= 0 ? "green.3" : "orange.3"}
                              >
                                {movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}
                              </Text>
                            </Table.Td>
                            <Table.Td>{movement.quantityBefore}</Table.Td>
                            <Table.Td>{movement.quantityAfter}</Table.Td>
                            <Table.Td>{movement.reason}</Table.Td>
                            <Table.Td>{movement.performedByName || "-"}</Table.Td>
                            <Table.Td>
                              <Text size="12px" maw={280} lineClamp={2}>{movement.notes || "-"}</Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </Paper>
            </Stack>
          )}
        </OperationsPanel>
      </div>

      <ProductFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={lookupResult?.product || null}
        onSuccess={() => void loadData()}
        onPrint={handlePrint}
      />
      <StickerPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        product={selectedPrintProduct}
      />
    </OperationsPage>
  );
}

/* ═════════════════════════════════════════════════════════════════════ */
/*                   MODE 2 — STOCK CHECK BY LOCATION                 */
/* ═════════════════════════════════════════════════════════════════════ */

function LocationCheckMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [allottedLocations, setAllottedLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [locationCode, setLocationCode] = useState("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<CheckSessionStatus>("idle");
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [p, a, q] = await Promise.all([
        productsApi.getAll(),
        productAllottedLocationsApi.getAll(),
        productQuantitiesApi.getAll(),
      ]);
      setProducts(p);
      setAllottedLocations(a);
      setQuantityRows(q);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const draft = readStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.location);
    if (!draft?.referenceCode) return;

    setLocationCode(draft.referenceCode);
    setIsLocationLocked(!!draft.isLocked);
    setSessionStatus(draft.sessionStatus);
    setScanInput(draft.scanInput || "");
    setScannedItems(draft.scannedItems || []);
  }, []);

  useEffect(() => {
    if (!isLocationLocked || !locationCode) {
      clearStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.location);
      return;
    }

    writeStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.location, {
      referenceCode: normalizeSku(locationCode),
      isLocked: isLocationLocked,
      sessionStatus,
      scanInput,
      scannedItems,
    });
  }, [isLocationLocked, locationCode, scanInput, scannedItems, sessionStatus]);

  const systemItemsAtLocation = useMemo(() => {
    if (!isLocationLocked || !locationCode) return [];
    const upperLoc = normalizeSku(locationCode);
    const items: ScannedItem[] = [];

    allottedLocations.forEach((row) => {
      const locJson = getLocationJson(row);
      const qty = Number(locJson[upperLoc] || locJson[locationCode.trim()] || 0);
      if (qty > 0) {
        const product = products.find((p) => p.id === row.productId);
        items.push({
          sku: normalizeSku(product?.sku || row.skuCode),
          productName: product?.name || row.productName,
          productId: row.productId,
          scannedQty: 0,
          systemQty: qty,
          isUnexpected: false,
          alias: normalizeSku(product?.alias || row.alias),
        });
      }
    });

    return items.sort((a, b) => a.sku.localeCompare(b.sku));
  }, [isLocationLocked, locationCode, allottedLocations, products]);

  useEffect(() => {
    if (isLocationLocked && systemItemsAtLocation.length > 0 && scannedItems.length === 0) {
      setScannedItems(systemItemsAtLocation.map((item) => ({ ...item, scannedQty: 0 })));
    }
  }, [isLocationLocked, systemItemsAtLocation]);

  const handleLocationScan = (val: string) => {
    const upper = normalizeSku(val);
    setLocationCode(upper);
    setIsLocationLocked(true);
    setSessionStatus("idle");
    setScannedItems([]);
    toast.success(`Location ${upper} loaded`);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const handleProductScan = (val: string) => {
    if (sessionStatus !== "running") {
      toast.warning("Start the stock check before scanning products");
      return;
    }

    const sku = normalizeSku(val.split("#")[0]);
    setScanInput("");

    setScannedItems((prev) => {
      const existing = prev.find(
        (item) => item.sku === sku || item.alias === sku,
      );

      if (existing) {
        return prev.map((item) =>
          item.sku === existing.sku ? { ...item, scannedQty: item.scannedQty + 1 } : item,
        );
      }

      const product = products.find(
        (p) => normalizeSku(p.sku) === sku || normalizeSku(p.alias) === sku,
      );

      if (product) {
        toast.warning(`${product.name} — unexpected at this location`);
        return [
          ...prev,
          {
            sku: normalizeSku(product.sku),
            productName: product.name,
            productId: product.id,
            scannedQty: 1,
            systemQty: 0,
            isUnexpected: true,
            alias: normalizeSku(product.alias),
          },
        ];
      }

      toast.error(`SKU ${sku} not found in product master`);
      return prev;
    });

    setTimeout(() => scanInputRef.current?.focus(), 10);
  };

  const handleRemoveItem = (sku: string) => {
    setScannedItems((prev) => prev.filter((item) => item.sku !== sku));
  };

  const persistReport = async (status: StockCheckReportStatus) => {
    const upperLoc = normalizeSku(locationCode);
    await saveStockCheckReport("Location", upperLoc, scannedItems, status);
  };

  const handlePause = async () => {
    setIsSaving(true);
    try {
      await persistReport("PAUSED");
      setSessionStatus("paused");
      toast.success("Location stock check paused");
    } catch (error: any) {
      toast.error(error.message || "Failed to pause stock check");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      await persistReport("COMPLETED");
      toast.success("Stock check report completed");
      setIsLocationLocked(false);
      setSessionStatus("idle");
      setLocationCode("");
      setScannedItems([]);
      setScanInput("");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save stock check");
    } finally {
      setIsSaving(false);
    }
  };

  const hasVariance = scannedItems.some((i) => i.scannedQty !== i.systemQty);

  return (
    <OperationsPage title="Stock Check by Location" description="Scan location, then scan all products." icon={MapPin} hideHeader>
      <ModeHeader
        title="Stock Check by Location"
        icon={MapPin}
        onBack={onBack}
        isMobile={isMobile}
        actions={
          isLocationLocked ? (
            <Group gap="xs">
              <MBadge size={isMobile ? "sm" : "md"} radius="md" variant="light" color="cyan">
                {locationCode}
              </MBadge>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  setIsLocationLocked(false);
                  setSessionStatus("idle");
                  setScannedItems([]);
                  setScanInput("");
                }}
              >
                Change
              </Button>
            </Group>
          ) : undefined
        }
      />

      <div className={`flex-1 grid grid-cols-1 ${isMobile ? "" : "lg:grid-cols-12"} gap-3 min-h-0`}>
        <OperationsPanel
          title="Scanner"
          icon={ScanLine}
          className={`${isMobile ? "" : "lg:col-span-4"} flex flex-col overflow-hidden`}
          contentClassName="overflow-y-auto scrollbar-thin space-y-4"
        >
          {!isLocationLocked ? (
            <Stack gap="md">
              <Paper
                radius="lg"
                p="sm"
                style={{
                  background: "rgba(14,165,233,0.08)",
                  border: "1px solid rgba(14,165,233,0.15)",
                }}
              >
                <Text size="xs" c="dimmed">
                  Step 1: Scan or enter a location barcode to begin stock check at that location.
                </Text>
              </Paper>
              <ScanInput
                label="Location Code"
                placeholder="Scan location barcode..."
                value={locationCode}
                onChange={setLocationCode}
                onScan={handleLocationScan}
                icon={<MapPin size={15} />}
                autoFocus
                isMobile={isMobile}
              />
            </Stack>
          ) : (
            <Stack gap="md">
              <Paper
                radius="lg"
                p="sm"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.15)",
                }}
              >
                <Group gap="xs" wrap="nowrap">
                  <CheckCircle2 size={16} color="var(--mantine-color-green-4)" />
                  <Text size="xs" c="dimmed">
                    Location locked. Scan products (SKU/Alias) one by one.
                  </Text>
                </Group>
              </Paper>

              <Group gap="xs">
                {sessionStatus === "running" ? (
                  <Button
                    size={isMobile ? "md" : "sm"}
                    variant="outline"
                    fullWidth
                    loading={isSaving}
                    onClick={handlePause}
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    size={isMobile ? "md" : "sm"}
                    fullWidth
                    onClick={() => {
                      setSessionStatus("running");
                      setTimeout(() => scanInputRef.current?.focus(), 10);
                    }}
                  >
                    {sessionStatus === "paused" ? "Resume" : "Start"}
                  </Button>
                )}
              </Group>

              <ScanInput
                label="Scan Product"
                placeholder="Scan SKU or Alias..."
                value={scanInput}
                onChange={setScanInput}
                onScan={handleProductScan}
                icon={<Package size={15} />}
                disabled={sessionStatus !== "running"}
                autoFocus
                id="location-product-scan"
                isMobile={isMobile}
              />

              <Paper radius="lg" p="xs" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed" mb={4}>SCAN SUMMARY</Text>
                <SimpleGrid cols={2} spacing="xs">
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">EXPECTED ITEMS</Text>
                    <Text size="sm" fw={700} c="cyan.3">{systemItemsAtLocation.length}</Text>
                  </Box>
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">TOTAL SCANNED</Text>
                    <Text size="sm" fw={700} c="white">{scannedItems.reduce((s, i) => s + i.scannedQty, 0)}</Text>
                  </Box>
                </SimpleGrid>
              </Paper>

              <Group gap="xs">
                <Button
                  size={isMobile ? "md" : "sm"}
                  fullWidth
                  disabled={!hasVariance && scannedItems.every(i => i.scannedQty === 0)}
                  loading={isSaving}
                  onClick={() => setShowConfirm(true)}
                  leftIcon={<Save size={16} />}
                >
                  Complete Stock Check
                </Button>
              </Group>
              <Button
                variant="subtle"
                size="xs"
                color="red"
                fullWidth
                onClick={() => {
                  setScannedItems(systemItemsAtLocation.map((item) => ({ ...item, scannedQty: 0 })));
                  setScanInput("");
                  toast.info("Scan data cleared");
                }}
                leftIcon={<Trash2 size={14} />}
              >
                Reset Scans
              </Button>
            </Stack>
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Variance Report"
          icon={ClipboardCheck}
          className={`${isMobile ? "" : "lg:col-span-8"} flex flex-col overflow-hidden`}
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          {!isLocationLocked ? (
            <OperationsEmptyState
              icon={MapPin}
              title="Scan Location First"
              description="Scan a location barcode to load expected products and start scanning."
            />
          ) : (
            <VarianceTable items={scannedItems} isMobile={isMobile} onRemove={handleRemoveItem} />
          )}
        </OperationsPanel>
      </div>

      <Modal
        opened={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Stock Check Save"
        centered
        size="sm"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This will save a completed stock check report for <strong>{locationCode}</strong>. Inventory quantities will not be adjusted here.
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">ITEMS WITH VARIANCE</Text>
              <Text fw={700} c="orange.3">{scannedItems.filter(i => i.scannedQty !== i.systemQty).length}</Text>
            </Paper>
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">TOTAL VARIANCE</Text>
              <Text fw={700} c="yellow.4">
                {scannedItems.reduce((s, i) => s + (i.scannedQty - i.systemQty), 0)}
              </Text>
            </Paper>
          </SimpleGrid>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={isSaving}>Confirm Save</Button>
          </Group>
        </Stack>
      </Modal>
    </OperationsPage>
  );
}

/* ═════════════════════════════════════════════════════════════════════ */
/*                MODE 3 — STOCK CHECK BY MANUFACTURER                */
/* ═════════════════════════════════════════════════════════════════════ */

function ManufacturerCheckMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMfrId, setSelectedMfrId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<CheckSessionStatus>("idle");
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleManufacturerChange = (value: string | null) => {
    setSelectedMfrId(value);
    setSessionStatus("idle");
    setScanInput("");
    setScannedItems([]);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [p, m, q] = await Promise.all([
        productsApi.getAll(),
        manufacturersApi.getAll(),
        productQuantitiesApi.getAll(),
      ]);
      setProducts(p);
      setManufacturers(m);
      setQuantityRows(q);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const draft = readStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.manufacturer);
    if (!draft?.referenceId) return;

    setSelectedMfrId(draft.referenceId);
    setSessionStatus(draft.sessionStatus);
    setScanInput(draft.scanInput || "");
    setScannedItems(draft.scannedItems || []);
  }, []);

  useEffect(() => {
    if (!selectedMfrId) {
      clearStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.manufacturer);
      return;
    }

    writeStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.manufacturer, {
      referenceId: selectedMfrId,
      sessionStatus,
      scanInput,
      scannedItems,
    });
  }, [scanInput, scannedItems, selectedMfrId, sessionStatus]);

  const mfrProducts = useMemo(() => {
    if (!selectedMfrId) return [];
    const mfrIdNum = Number(selectedMfrId);
    return products.filter((p) => p.manufacturerId === mfrIdNum);
  }, [selectedMfrId, products]);

  useEffect(() => {
    if (selectedMfrId && mfrProducts.length > 0 && scannedItems.length === 0) {
      const items: ScannedItem[] = mfrProducts.map((p) => {
        const qRow = quantityRows.find((q) => q.productId === p.id);
        return {
          sku: normalizeSku(p.sku),
          productName: p.name,
          productId: p.id,
          scannedQty: 0,
          systemQty: qRow?.currentQuantity ?? 0,
          isUnexpected: false,
          alias: normalizeSku(p.alias),
        };
      });
      setScannedItems(items.sort((a, b) => a.sku.localeCompare(b.sku)));
      setSessionStatus("idle");
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [selectedMfrId, mfrProducts, quantityRows, scannedItems.length]);

  const selectedMfr = manufacturers.find((m) => m.id === Number(selectedMfrId));

  const handleProductScan = (val: string) => {
    if (sessionStatus !== "running") {
      toast.warning("Start the stock check before scanning products");
      return;
    }

    const sku = normalizeSku(val.split("#")[0]);
    setScanInput("");

    setScannedItems((prev) => {
      const existing = prev.find((item) => item.sku === sku || item.alias === sku);

      if (existing) {
        return prev.map((item) =>
          item.sku === existing.sku ? { ...item, scannedQty: item.scannedQty + 1 } : item,
        );
      }

      const product = products.find(
        (p) => normalizeSku(p.sku) === sku || normalizeSku(p.alias) === sku,
      );

      if (product) {
        const isDiffMfr = product.manufacturerId !== Number(selectedMfrId);
        if (isDiffMfr) {
          const otherMfr = manufacturers.find((m) => m.id === product.manufacturerId);
          toast.warning(`${product.name} belongs to ${otherMfr?.name || "different manufacturer"}`);
        }
        const qRow = quantityRows.find((q) => q.productId === product.id);
        return [
          ...prev,
          {
            sku: normalizeSku(product.sku),
            productName: product.name,
            productId: product.id,
            scannedQty: 1,
            systemQty: qRow?.currentQuantity ?? 0,
            isUnexpected: isDiffMfr,
            alias: normalizeSku(product.alias),
          },
        ];
      }

      toast.error(`SKU ${sku} not found`);
      return prev;
    });

    setTimeout(() => scanInputRef.current?.focus(), 10);
  };

  const persistReport = async (status: StockCheckReportStatus) => {
    await saveStockCheckReport("Manufacturer", selectedMfr?.name || "Unknown", scannedItems, status);
  };

  const handlePause = async () => {
    setIsSaving(true);
    try {
      await persistReport("PAUSED");
      setSessionStatus("paused");
      toast.success("Manufacturer stock check paused");
    } catch (error: any) {
      toast.error(error.message || "Failed to pause");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      await persistReport("COMPLETED");
      toast.success("Manufacturer stock check completed");
      setSelectedMfrId(null);
      setSessionStatus("idle");
      setScannedItems([]);
      setScanInput("");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const hasVariance = scannedItems.some((i) => i.scannedQty !== i.systemQty);

  return (
    <OperationsPage title="Stock Check by Manufacturer" description="Select manufacturer, scan products." icon={Factory} hideHeader>
      <ModeHeader
        title="Stock Check by Manufacturer"
        icon={Factory}
        onBack={onBack}
        isMobile={isMobile}
        actions={
          selectedMfr ? (
            <Group gap="xs">
              <MBadge size={isMobile ? "sm" : "md"} radius="md" variant="light" color="yellow">
                {selectedMfr.name}
              </MBadge>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => { setSelectedMfrId(null); setSessionStatus("idle"); setScannedItems([]); setScanInput(""); }}
              >
                Change
              </Button>
            </Group>
          ) : undefined
        }
      />

      <div className={`flex-1 grid grid-cols-1 ${isMobile ? "" : "lg:grid-cols-12"} gap-3 min-h-0`}>
        <OperationsPanel
          title="Scanner"
          icon={ScanLine}
          className={`${isMobile ? "" : "lg:col-span-4"} flex flex-col overflow-hidden`}
          contentClassName="overflow-y-auto scrollbar-thin space-y-4"
        >
          {!selectedMfrId ? (
            <Stack gap="md">
              <Paper radius="lg" p="sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <Text size="xs" c="dimmed">Step 1: Select a manufacturer to load their products.</Text>
              </Paper>
              <Box>
                <Text size="10px" fw={800} c="dimmed" mb={4}>SELECT MANUFACTURER</Text>
                <Select
                  size={isMobile ? "md" : "sm"}
                  placeholder="Search manufacturer..."
                  searchable
                  clearable
                  data={manufacturers.map((m) => ({ value: String(m.id), label: m.name }))}
                  value={selectedMfrId}
                  onChange={handleManufacturerChange}
                  disabled={isLoading}
                  nothingFoundMessage="No manufacturers found"
                />
              </Box>
            </Stack>
          ) : (
            <Stack gap="md">
              <Paper radius="lg" p="sm" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <Group gap="xs" wrap="nowrap">
                  <CheckCircle2 size={16} color="var(--mantine-color-green-4)" />
                  <Text size="xs" c="dimmed">
                    {mfrProducts.length} products loaded. Scan SKU/Alias to count.
                  </Text>
                </Group>
              </Paper>

              <Group gap="xs">
                {sessionStatus === "running" ? (
                  <Button
                    size={isMobile ? "md" : "sm"}
                    variant="outline"
                    fullWidth
                    loading={isSaving}
                    onClick={handlePause}
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    size={isMobile ? "md" : "sm"}
                    fullWidth
                    onClick={() => {
                      setSessionStatus("running");
                      setTimeout(() => scanInputRef.current?.focus(), 10);
                    }}
                  >
                    {sessionStatus === "paused" ? "Resume" : "Start"}
                  </Button>
                )}
              </Group>

              <ScanInput
                label="Scan Product"
                placeholder="Scan SKU or Alias..."
                value={scanInput}
                onChange={setScanInput}
                onScan={handleProductScan}
                icon={<Package size={15} />}
                disabled={sessionStatus !== "running"}
                autoFocus
                isMobile={isMobile}
              />

              <Paper radius="lg" p="xs" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed" mb={4}>SCAN SUMMARY</Text>
                <SimpleGrid cols={2} spacing="xs">
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">EXPECTED SKUS</Text>
                    <Text size="sm" fw={700} c="yellow.3">{mfrProducts.length}</Text>
                  </Box>
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">TOTAL SCANNED</Text>
                    <Text size="sm" fw={700} c="white">{scannedItems.reduce((s, i) => s + i.scannedQty, 0)}</Text>
                  </Box>
                </SimpleGrid>
              </Paper>

              <Button
                size={isMobile ? "md" : "sm"}
                fullWidth
                disabled={!hasVariance && scannedItems.every(i => i.scannedQty === 0)}
                loading={isSaving}
                onClick={() => setShowConfirm(true)}
                leftIcon={<Save size={16} />}
              >
                Complete Stock Check
              </Button>
              <Button
                variant="subtle"
                size="xs"
                color="red"
                fullWidth
                onClick={() => {
                  setScannedItems(
                    mfrProducts.map((p) => {
                      const qRow = quantityRows.find((q) => q.productId === p.id);
                      return {
                        sku: normalizeSku(p.sku),
                        productName: p.name,
                        productId: p.id,
                        scannedQty: 0,
                        systemQty: qRow?.currentQuantity ?? 0,
                        isUnexpected: false,
                        alias: normalizeSku(p.alias),
                      };
                    }),
                  );
                  setScanInput("");
                }}
                leftIcon={<Trash2 size={14} />}
              >
                Reset Scans
              </Button>
            </Stack>
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Variance Report"
          icon={ClipboardCheck}
          className={`${isMobile ? "" : "lg:col-span-8"} flex flex-col overflow-hidden`}
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          {!selectedMfrId ? (
            <OperationsEmptyState
              icon={Factory}
              title="Select Manufacturer"
              description="Choose a manufacturer to load their product list and begin scanning."
            />
          ) : (
            <VarianceTable items={scannedItems} isMobile={isMobile} onRemove={(sku) => {
              setScannedItems((prev) => prev.filter((i) => i.sku !== sku));
            }} />
          )}
        </OperationsPanel>
      </div>

      <Modal opened={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Stock Check Save" centered size="sm">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This will save a completed stock check report for <strong>{selectedMfr?.name}</strong>. Inventory quantities will not be adjusted here.
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">ITEMS WITH VARIANCE</Text>
              <Text fw={700} c="orange.3">{scannedItems.filter(i => i.scannedQty !== i.systemQty).length}</Text>
            </Paper>
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">NET VARIANCE</Text>
              <Text fw={700} c="yellow.4">{scannedItems.reduce((s, i) => s + (i.scannedQty - i.systemQty), 0)}</Text>
            </Paper>
          </SimpleGrid>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={isSaving}>Confirm Save</Button>
          </Group>
        </Stack>
      </Modal>
    </OperationsPage>
  );
}

/* ═════════════════════════════════════════════════════════════════════ */
/*                  MODE 4 — STOCK CHECK BY PRODUCT                   */
/* ═════════════════════════════════════════════════════════════════════ */

function ProductCheckMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [allottedLocations, setAllottedLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<CheckSessionStatus>("idle");
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUnexpectedConfirm, setShowUnexpectedConfirm] = useState<{
    product: Product;
    sku: string;
  } | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleProductChange = (value: string | null) => {
    setSelectedProductId(value);
    setSessionStatus("idle");
    setScanInput("");
    setScannedItems([]);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [p, q, a] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setProducts(p);
      setQuantityRows(q);
      setAllottedLocations(a);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const draft = readStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.product);
    if (!draft?.referenceId) return;

    setSelectedProductId(draft.referenceId);
    setSessionStatus(draft.sessionStatus);
    setScanInput(draft.scanInput || "");
    setScannedItems(draft.scannedItems || []);
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      clearStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.product);
      return;
    }

    writeStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.product, {
      referenceId: selectedProductId,
      sessionStatus,
      scanInput,
      scannedItems,
    });
  }, [scanInput, scannedItems, selectedProductId, sessionStatus]);

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));

  useEffect(() => {
    if (selectedProduct && scannedItems.length === 0) {
      const qRow = quantityRows.find((q) => q.productId === selectedProduct.id);
      setScannedItems([
        {
          sku: normalizeSku(selectedProduct.sku),
          productName: selectedProduct.name,
          productId: selectedProduct.id,
          scannedQty: 0,
          systemQty: qRow?.currentQuantity ?? 0,
          isUnexpected: false,
          alias: normalizeSku(selectedProduct.alias),
        },
      ]);
      setSessionStatus("idle");
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [selectedProduct, quantityRows, scannedItems.length]);

  const productLocations = useMemo(() => {
    if (!selectedProduct) return [];
    const allottedRow = allottedLocations.find((r) => r.productId === selectedProduct.id);
    if (!allottedRow) return [];
    return Object.entries(getLocationJson(allottedRow))
      .map(([code, qty]) => ({ locationCode: code, quantity: Number(qty) || 0 }))
      .filter((e) => e.quantity > 0)
      .sort((a, b) => a.locationCode.localeCompare(b.locationCode));
  }, [selectedProduct, allottedLocations]);

  const handleProductScan = (val: string) => {
    if (sessionStatus !== "running") {
      toast.warning("Start the stock check before scanning products");
      return;
    }

    const sku = normalizeSku(val.split("#")[0]);
    setScanInput("");

    const scannedProduct = products.find(
      (p) => normalizeSku(p.sku) === sku || normalizeSku(p.alias) === sku,
    );

    if (!scannedProduct) {
      toast.error(`SKU ${sku} not found`);
      setTimeout(() => scanInputRef.current?.focus(), 10);
      return;
    }

    if (scannedProduct.id !== Number(selectedProductId)) {
      setShowUnexpectedConfirm({ product: scannedProduct, sku });
      return;
    }

    setScannedItems((prev) =>
      prev.map((item) =>
        item.productId === scannedProduct.id ? { ...item, scannedQty: item.scannedQty + 1 } : item,
      ),
    );

    setTimeout(() => scanInputRef.current?.focus(), 10);
  };

  const handleAddUnexpected = () => {
    if (!showUnexpectedConfirm) return;
    const { product } = showUnexpectedConfirm;
    const qRow = quantityRows.find((q) => q.productId === product.id);

    setScannedItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, scannedQty: i.scannedQty + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          sku: normalizeSku(product.sku),
          productName: product.name,
          productId: product.id,
          scannedQty: 1,
          systemQty: qRow?.currentQuantity ?? 0,
          isUnexpected: true,
          alias: normalizeSku(product.alias),
        },
      ];
    });

    setShowUnexpectedConfirm(null);
    setTimeout(() => scanInputRef.current?.focus(), 10);
  };

  const persistReport = async (status: StockCheckReportStatus) => {
    await saveStockCheckReport("Product", selectedProduct?.name || "Unknown", scannedItems, status);
  };

  const handlePause = async () => {
    setIsSaving(true);
    try {
      await persistReport("PAUSED");
      setSessionStatus("paused");
      toast.success("Product stock check paused");
    } catch (error: any) {
      toast.error(error.message || "Failed to pause");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      await persistReport("COMPLETED");
      toast.success("Product stock check completed");
      setSelectedProductId(null);
      setSessionStatus("idle");
      setScannedItems([]);
      setScanInput("");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const hasVariance = scannedItems.some((i) => i.scannedQty !== i.systemQty);

  return (
    <OperationsPage title="Stock Check by Product" description="Select product, scan items." icon={Package} hideHeader>
      <ModeHeader
        title="Stock Check by Product"
        icon={Package}
        onBack={onBack}
        isMobile={isMobile}
        actions={
          selectedProduct ? (
            <Group gap="xs">
              <MBadge size={isMobile ? "sm" : "md"} radius="md" variant="light" color="green">
                {normalizeSku(selectedProduct.sku)}
              </MBadge>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => { setSelectedProductId(null); setSessionStatus("idle"); setScannedItems([]); setScanInput(""); }}
              >
                Change
              </Button>
            </Group>
          ) : undefined
        }
      />

      <div className={`flex-1 grid grid-cols-1 ${isMobile ? "" : "lg:grid-cols-12"} gap-3 min-h-0`}>
        <OperationsPanel
          title="Scanner"
          icon={ScanLine}
          className={`${isMobile ? "" : "lg:col-span-4"} flex flex-col overflow-hidden`}
          contentClassName="overflow-y-auto scrollbar-thin space-y-4"
        >
          {!selectedProductId ? (
            <Stack gap="md">
              <Paper radius="lg" p="sm" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <Text size="xs" c="dimmed">Step 1: Select a product to begin counting.</Text>
              </Paper>
              <Box>
                <Text size="10px" fw={800} c="dimmed" mb={4}>SELECT PRODUCT</Text>
                <Select
                  size={isMobile ? "md" : "sm"}
                  placeholder="Search product SKU or name..."
                  searchable
                  clearable
                  data={products.map((p) => ({
                    value: String(p.id),
                    label: p.alias ? `${normalizeSku(p.sku)} — ${p.name} (${p.alias})` : `${normalizeSku(p.sku)} — ${p.name}`,
                  }))}
                  value={selectedProductId}
                  onChange={handleProductChange}
                  disabled={isLoading}
                  nothingFoundMessage="No products found"
                  maxDropdownHeight={300}
                />
              </Box>
            </Stack>
          ) : (
            <Stack gap="md">
              <Paper
                radius="lg"
                p="sm"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.15)",
                }}
              >
                <Stack gap={4}>
                  <Text size="xs" fw={700} c="green.3">{selectedProduct?.name}</Text>
                  <Text size="10px" c="dimmed" ff="monospace">{normalizeSku(selectedProduct?.sku)}</Text>
                </Stack>
              </Paper>

              <Group gap="xs">
                {sessionStatus === "running" ? (
                  <Button
                    size={isMobile ? "md" : "sm"}
                    variant="outline"
                    fullWidth
                    loading={isSaving}
                    onClick={handlePause}
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    size={isMobile ? "md" : "sm"}
                    fullWidth
                    onClick={() => {
                      setSessionStatus("running");
                      setTimeout(() => scanInputRef.current?.focus(), 10);
                    }}
                  >
                    {sessionStatus === "paused" ? "Resume" : "Start"}
                  </Button>
                )}
              </Group>

              <ScanInput
                label="Scan Product"
                placeholder="Scan same SKU to count..."
                value={scanInput}
                onChange={setScanInput}
                onScan={handleProductScan}
                icon={<Package size={15} />}
                disabled={sessionStatus !== "running"}
                autoFocus
                isMobile={isMobile}
              />

              {productLocations.length > 0 && (
                <Paper radius="lg" p="xs" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed" mb={4}>KNOWN LOCATIONS</Text>
                  <Stack gap={4}>
                    {productLocations.map((loc) => (
                      <Group key={loc.locationCode} justify="space-between" wrap="nowrap">
                        <Group gap={4} wrap="nowrap">
                          <MapPin size={12} color="var(--mantine-color-cyan-4)" />
                          <Text size="11px" ff="monospace" fw={700}>{loc.locationCode}</Text>
                        </Group>
                        <Text size="11px" fw={700} ff="monospace">{loc.quantity}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              )}

              <Paper radius="lg" p="xs" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed" mb={4}>SCAN SUMMARY</Text>
                <SimpleGrid cols={2} spacing="xs">
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">SYSTEM QTY</Text>
                    <Text size="sm" fw={700} c="green.3">{scannedItems[0]?.systemQty ?? 0}</Text>
                  </Box>
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">SCANNED QTY</Text>
                    <Text size="sm" fw={700} c="white">{scannedItems.reduce((s, i) => s + i.scannedQty, 0)}</Text>
                  </Box>
                </SimpleGrid>
              </Paper>

              <Button
                size={isMobile ? "md" : "sm"}
                fullWidth
                disabled={!hasVariance && scannedItems.every(i => i.scannedQty === 0)}
                loading={isSaving}
                onClick={() => setShowConfirm(true)}
                leftIcon={<Save size={16} />}
              >
                Complete Stock Check
              </Button>
              <Button
                variant="subtle"
                size="xs"
                color="red"
                fullWidth
                onClick={() => {
                  if (selectedProduct) {
                    const qRow = quantityRows.find((q) => q.productId === selectedProduct.id);
                    setScannedItems([
                      {
                        sku: normalizeSku(selectedProduct.sku),
                        productName: selectedProduct.name,
                        productId: selectedProduct.id,
                        scannedQty: 0,
                        systemQty: qRow?.currentQuantity ?? 0,
                        isUnexpected: false,
                        alias: normalizeSku(selectedProduct.alias),
                      },
                    ]);
                  }
                  setScanInput("");
                }}
                leftIcon={<Trash2 size={14} />}
              >
                Reset Scans
              </Button>
            </Stack>
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Variance Report"
          icon={ClipboardCheck}
          className={`${isMobile ? "" : "lg:col-span-8"} flex flex-col overflow-hidden`}
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          {!selectedProductId ? (
            <OperationsEmptyState
              icon={Package}
              title="Select Product"
              description="Choose a product to start counting and scanning."
            />
          ) : (
            <VarianceTable items={scannedItems} isMobile={isMobile} onRemove={(sku) => {
              setScannedItems((prev) => prev.filter((i) => i.sku !== sku || !i.isUnexpected));
            }} />
          )}
        </OperationsPanel>
      </div>

      {/* Unexpected product confirmation modal */}
      <Modal
        opened={!!showUnexpectedConfirm}
        onClose={() => { setShowUnexpectedConfirm(null); setTimeout(() => scanInputRef.current?.focus(), 10); }}
        title="Different Product Scanned"
        centered
        size="sm"
      >
        {showUnexpectedConfirm && (
          <Stack gap="sm">
            <Paper
              radius="md"
              p="sm"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <Group gap="xs" mb={4}>
                <AlertTriangle size={16} color="var(--mantine-color-yellow-4)" />
                <Text size="xs" fw={700} c="yellow.3">Unexpected Product</Text>
              </Group>
              <Text size="sm" fw={700}>{showUnexpectedConfirm.product.name}</Text>
              <Text size="xs" c="dimmed" ff="monospace">{showUnexpectedConfirm.sku}</Text>
            </Paper>
            <Text size="sm" c="dimmed">
              This product doesn't match the selected one. Would you like to add it to the stock check?
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
                variant="subtle"
                size="sm"
                onClick={() => { setShowUnexpectedConfirm(null); setTimeout(() => scanInputRef.current?.focus(), 10); }}
              >
                Skip
              </Button>
              <Button size="sm" color="yellow" onClick={handleAddUnexpected}>
                Add to Check
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Save confirmation modal */}
      <Modal opened={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Stock Check Save" centered size="sm">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This will save a completed stock check report for <strong>{selectedProduct?.name}</strong> and any unexpected products. Inventory quantities will not be adjusted here.
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">ITEMS</Text>
              <Text fw={700} c="white">{scannedItems.length}</Text>
            </Paper>
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">NET VARIANCE</Text>
              <Text fw={700} c="yellow.4">{scannedItems.reduce((s, i) => s + (i.scannedQty - i.systemQty), 0)}</Text>
            </Paper>
          </SimpleGrid>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={isSaving}>Confirm Save</Button>
          </Group>
        </Stack>
      </Modal>
    </OperationsPage>
  );
}

/* ═════════════════════════════════════════════════════════════════════ */
/*                        SHARED SMALL COMPONENTS                      */
/* ═════════════════════════════════════════════════════════════════════ */

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <Text size="9px" fw={800} c="dimmed">{label.toUpperCase()}</Text>
      <Text size="12px" fw={700} mt={2} truncate>{value}</Text>
    </div>
  );
}

function MetricLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <Icon size={13} color="var(--mantine-color-cyan-4)" />
      <Text size="10px" fw={800} c="dimmed">{label.toUpperCase()}</Text>
    </Group>
  );
}

function MasterLink({
  children,
  href,
  onClick,
  mono = false,
  size = "12px",
  weight = 800,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  mono?: boolean;
  size?: string;
  weight?: number;
  className?: string;
}) {
  return (
    <Text
      component={onClick ? "button" : "a"}
      onClick={onClick}
      href={href}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      size={size}
      fw={weight}
      ff={mono ? "monospace" : undefined}
      className={className}
      style={{
        color: "var(--mantine-color-cyan-3)",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        maxWidth: "100%",
        textDecoration: "none",
        cursor: "pointer",
        background: "none",
        border: "none",
        padding: 0,
        textAlign: "left",
      }}
    >
      <span className="truncate">{children}</span>
      <ExternalLink size={12} />
    </Text>
  );
}

function ReferenceLink({
  icon: Icon,
  label,
  value,
  href,
  onClick,
  isButton,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  href?: string;
  onClick?: () => void;
  isButton?: boolean;
}) {
  const inner = (
    <>
      <Group gap={7} wrap="nowrap" className="min-w-0">
        <Icon size={14} color="var(--mantine-color-cyan-4)" />
        <div className="min-w-0">
          <Text size="9px" fw={800} c="dimmed">{label.toUpperCase()}</Text>
          <Text size="11px" fw={800} c="cyan.3" truncate>{value}</Text>
        </div>
      </Group>
      <ExternalLink size={13} color="var(--mantine-color-cyan-4)" />
    </>
  );

  if (isButton || onClick) {
    return (
      <button
        onClick={onClick}
        type="button"
        className="flex items-center justify-between gap-2 rounded-md border border-cyan-400/10 bg-slate-950/30 px-2 py-2 no-underline transition hover:border-cyan-300/30 hover:bg-cyan-400/10 w-full text-left cursor-pointer"
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-2 rounded-md border border-cyan-400/10 bg-slate-950/30 px-2 py-2 no-underline transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
    >
      {inner}
    </a>
  );
}

function EmptyInline({ message }: { message: string }) {
  return (
    <Group gap="sm" mt="xs" wrap="nowrap" className="rounded-md border border-slate-700/60 px-2 py-2">
      <AlertTriangle size={15} color="var(--mantine-color-yellow-4)" />
      <Text size="xs" c="dimmed">{message}</Text>
    </Group>
  );
}

function StockCheckHistoryMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [reports, setReports] = useState<StockCheckReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [checkType, setCheckType] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await stockCheckReportsApi.getAll({
        checkType: checkType || undefined,
        search: search.trim() || undefined,
        page: 1,
        pageSize: 100,
      });
      setReports(result.data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load stock check reports");
    } finally {
      setIsLoading(false);
    }
  }, [checkType, search]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <OperationsPage
      title="Report History"
      description="View past stock check reports. Filter by type, date, and search."
      icon={History}
      actions={
        <Button variant="outline" leftIcon={<ArrowLeft size={16} />} onClick={onBack}>
          Back to Hub
        </Button>
      }
    >
      <ModeHeader title="Report History" icon={History} onBack={onBack} isMobile={isMobile} />

      <OperationsPanel title="History" icon={History} description="Saved stock check snapshots.">
        <Stack gap="sm">
          <Group gap="xs" align="end">
            <Box style={{ flex: 1, minWidth: 180 }}>
              <Text size="10px" fw={800} c="dimmed" mb={4}>SEARCH</Text>
              <TextInput
                size={isMobile ? "md" : "sm"}
                placeholder="Reference, user, notes..."
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                leftSection={<Search size={14} />}
              />
            </Box>
            <Box style={{ width: isMobile ? "100%" : 180 }}>
              <Text size="10px" fw={800} c="dimmed" mb={4}>CHECK TYPE</Text>
              <Select
                size={isMobile ? "md" : "sm"}
                clearable
                placeholder="All types"
                value={checkType}
                onChange={setCheckType}
                data={[
                  { value: "LOCATION", label: "Location" },
                  { value: "MANUFACTURER", label: "Manufacturer" },
                  { value: "PRODUCT", label: "Product" },
                ]}
              />
            </Box>
            <Button
              size={isMobile ? "md" : "sm"}
              variant="outline"
              loading={isLoading}
              onClick={() => void loadReports()}
              leftIcon={<RefreshCw size={15} />}
            >
              Refresh
            </Button>
          </Group>

          {reports.length === 0 ? (
            <OperationsEmptyState
              icon={History}
              title="No Reports Found"
              description="Paused and completed stock checks will appear here."
            />
          ) : (
            <ScrollArea type="auto">
              <Table striped highlightOnHover withTableBorder withColumnBorders miw={860}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Reference</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>System</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Scanned</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Variance</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Items</Table.Th>
                    <Table.Th>By</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {reports.map((report) => (
                    <Table.Tr key={report.id}>
                      <Table.Td>{format(new Date(report.createdAt), "dd MMM yyyy HH:mm")}</Table.Td>
                      <Table.Td>
                        <MBadge size="xs" variant="light" color="cyan">{report.checkType}</MBadge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="12px" fw={700}>{report.referenceName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <MBadge
                          size="xs"
                          variant="light"
                          color={report.status === "COMPLETED" ? "green" : report.status === "PAUSED" ? "yellow" : "blue"}
                        >
                          {report.status}
                        </MBadge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{report.totalSystemQty}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{report.totalScannedQty}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text
                          size="12px"
                          fw={800}
                          ff="monospace"
                          c={report.totalVariance === 0 ? "green.4" : report.totalVariance > 0 ? "yellow.4" : "red.4"}
                        >
                          {report.totalVariance > 0 ? "+" : ""}{report.totalVariance}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{report.itemsChecked}</Table.Td>
                      <Table.Td>{report.performedByName || "-"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      </OperationsPanel>
    </OperationsPage>
  );
}

export default StockCheck;
