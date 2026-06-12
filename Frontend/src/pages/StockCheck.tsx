import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Activity,
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
import { useQuery } from "@tanstack/react-query";
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
import { auditLogApi } from "../services/auditLogApi";
import { LocationCheckMode } from "./StockCheck/components/LocationCheckMode";
import { ManufacturerCheckMode } from "./StockCheck/components/ManufacturerCheckMode";
import { ModeHeader } from "./StockCheck/components/ModeHeader";
import { ProductCheckMode } from "./StockCheck/components/ProductCheckMode";
import { EmptyInline, Info, MasterLink, MetricLabel, ReferenceLink } from "./StockCheck/components/SharedComponents";
import { StockCheckHistoryMode } from "./StockCheck/components/StockCheckHistoryMode";

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
  const handleResumePausedCheck = useCallback((mode: Extract<ActiveMode, "location" | "manufacturer" | "product">) => {
    setActiveMode(mode);
  }, []);

  return (
    <>
      {activeMode === "hub" && <StockCheckHub onSelectMode={setActiveMode} isMobile={!!isMobile} />}
      {activeMode === "verify" && <StockVerifyMode onBack={handleBack} isMobile={!!isMobile} />}
      {activeMode === "location" && <LocationCheckMode onBack={handleBack} isMobile={!!isMobile} />}
      {activeMode === "manufacturer" && <ManufacturerCheckMode onBack={handleBack} isMobile={!!isMobile} />}
      {activeMode === "product" && <ProductCheckMode onBack={handleBack} isMobile={!!isMobile} />}
      {activeMode === "history" && <StockCheckHistoryMode onBack={handleBack} isMobile={!!isMobile} onResume={handleResumePausedCheck} />}
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
  const navigate = useNavigate();
  const { data: auditLogs, isLoading: auditLogsLoading } = useQuery({
    queryKey: ["stockCheckHubAuditLogs"],
    queryFn: () => auditLogApi.getLogs({ page: 1, pageSize: 6 }),
    staleTime: 30_000,
  });

  const getAuditActionColor = (action: string) => {
    switch (action?.toLowerCase()) {
      case "added": return "blue";
      case "modified": return "yellow";
      case "deleted": return "red";
      case "bulkstockupload": return "grape";
      case "cancelsalesorder": return "orange";
      default: return "gray";
    }
  };

  const cards: {
    mode?: ActiveMode;
    href?: string;
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
      href: "/product-mrp-wise-quantity",
      icon: FileText,
      title: "Product MRP Wise Quantity",
      description: "Current quantity grouped product and MRP wise.",
      color: "rgba(34, 211, 238, 0.8)",
      gradient: "linear-gradient(135deg, rgba(34,211,238,0.16) 0%, rgba(15,23,42,0.6) 100%)",
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

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing={isMobile ? "xs" : "sm"}>
        {cards.map((card) => (
          <Paper
            key={card.mode ?? card.href}
            radius="md"
            p={isMobile ? "xs" : "sm"}
            withBorder
            onClick={() => card.href ? navigate(card.href) : onSelectMode(card.mode!)}
            style={{
              cursor: "pointer",
              background: card.gradient,
              borderColor: card.color.replace("0.8", "0.25"),
              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: `0 4px 24px ${card.color.replace("0.8", "0.12")}`,
            }}
            className="hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            <Group gap="sm" wrap="nowrap" align="center">
              <ThemeIcon
                size={isMobile ? 34 : 38}
                radius="md"
                style={{
                  background: card.color.replace("0.8", "0.2"),
                  border: `1px solid ${card.color.replace("0.8", "0.35")}`,
                  color: card.color.replace("0.8", "1"),
                  flexShrink: 0,
                }}
              >
                <card.icon size={isMobile ? 17 : 19} />
              </ThemeIcon>
              <Box className="min-w-0" style={{ flex: 1 }}>
                <Group gap={6} wrap="nowrap">
                  <Text fw={800} size={isMobile ? "sm" : "13px"} c="white" truncate>
                    {card.title}
                  </Text>
                  {card.small && (
                    <MBadge size="xs" variant="light" color="indigo" radius="sm">
                      {card.href ? "Report" : "Quick"}
                    </MBadge>
                  )}
                </Group>
                <Text size={isMobile ? "10px" : "11px"} c="dimmed" truncate style={{ lineHeight: 1.25 }}>
                  {card.description}
                </Text>
              </Box>
              <ChevronRight size={16} color="rgba(255,255,255,0.35)" />
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <Paper
        radius="md"
        p={isMobile ? "sm" : "md"}
        mt="md"
        withBorder
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.72) 100%)",
          borderColor: "rgba(148,163,184,0.18)",
        }}
      >
        <Group justify="space-between" align="flex-start" mb="sm">
          <Group gap="sm">
            <ThemeIcon size={38} radius="md" variant="light" color="cyan">
              <Activity size={18} />
            </ThemeIcon>
            <Box>
              <Text fw={900} c="white">Recent Operations</Text>
              <Text size="xs" c="dimmed">Latest audit log activity across the application</Text>
            </Box>
          </Group>
          <Button size="sm" variant="outline" onClick={() => navigate("/audit-logs")}>View Audit Logs</Button>
        </Group>

        <Stack gap={0}>
          {auditLogsLoading ? (
            <Text size="xs" c="dimmed" py="sm">Loading recent operations...</Text>
          ) : auditLogs?.data?.length ? (
            auditLogs.data.map((log, index) => (
              <React.Fragment key={log.id}>
                <Group justify="space-between" align="center" py="xs" wrap="nowrap">
                  <Box className="min-w-0" style={{ flex: 1 }}>
                    <Group gap={8} wrap="nowrap" mb={3}>
                      <MBadge size="xs" color={getAuditActionColor(log.action)} variant="light" radius="sm">
                        {log.action}
                      </MBadge>
                      <Text size="sm" fw={800} c="white" truncate>
                        {log.entityType}{log.entityId ? ` #${log.entityId}` : ""}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" truncate>
                      {log.details || `Changed by ${log.username || "System"}`}
                    </Text>
                  </Box>
                  <Box ta="right" style={{ flexShrink: 0 }}>
                    <Text size="xs" c="gray.4" fw={700}>{log.username || "System"}</Text>
                    <Text size="10px" c="dimmed">{format(new Date(log.timestamp), "dd MMM HH:mm")}</Text>
                  </Box>
                </Group>
                {index < auditLogs.data.length - 1 && <Divider style={{ borderColor: "rgba(148,163,184,0.12)" }} />}
              </React.Fragment>
            ))
          ) : (
            <Text size="xs" c="dimmed" py="sm">No audit log operations found.</Text>
          )}
        </Stack>
      </Paper>
    </OperationsPage>
  );
}

function StockVerifyMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
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
      const [productsData, quantityData] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
      ]);
      setProducts(productsData);
      setQuantityRows(quantityData);
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

  const openProductFromSku = useCallback((sku?: string | null, productName?: string | null) => {
    const normalizedSku = normalizeSku(sku);
    const normalizedName = (productName || "").trim().toLowerCase();
    const product =
      products.find(
        (item) =>
          (normalizedSku &&
            (normalizeSku(item.sku) === normalizedSku || normalizeSku(item.alias) === normalizedSku)) ||
          (normalizedName && item.name.trim().toLowerCase() === normalizedName),
      ) ?? lookupResult?.product ?? null;

    if (product) {
      setLookupResult((prev) => (prev ? { ...prev, product } : prev));
      setIsEditModalOpen(true);
      return;
    }

    navigate(masterHref("/mpd", normalizedSku || productName || ""));
  }, [lookupResult?.product, navigate, products]);

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
      setLookupResult({
        sku,
        product,
        quantityRow,
        allottedLocation: null,
        invoices,
        movements,
        locations: [],
        totalPoQuantity: 0,
        totalLocationStock: 0,
      });

      if (!product && !quantityRow && movements.length === 0) {
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
    "Product Details";
  const displayedCurrentStock = lookupResult?.quantityRow?.currentQuantity ?? 0;

  return (
    <OperationsPage
      title="Stock Verify"
      description="Quick single-SKU lookup to view current stock and product master data."
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
              <Text size="10px" fw={800} c="dimmed">STOCK ROWS</Text>
              <Text mt={6} size="lg" fw={800} c="white">{quantityRows.length}</Text>
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
                  onClick={() => openProductFromSku(lookupResult.sku, productTitle)}
                  isButton
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
                  This page is read-only. It shows current stock without changing inventory.
                </Text>
              </Group>
            </Paper>
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Inventory Details"
          icon={Boxes}
          description="Reference-linked product master and current stock quantity."
          className="lg:col-span-8 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          {!lookupResult ? (
            <OperationsEmptyState
              icon={ClipboardCheck}
              title="Enter SKU To View Product Details"
              description="Search a SKU code to see current stock quantity and product details."
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
                      <MasterLink onClick={() => openProductFromSku(lookupResult.sku, productTitle)} mono>
                        {lookupResult.sku}
                      </MasterLink>
                      <Badge size="sm" radius="md" variant={lookupResult.quantityRow ? "success" : "warning"}>
                        {lookupResult.quantityRow ? "Stock Available" : "No Stock Row"}
                      </Badge>
                    </Group>
                    <MasterLink
                      onClick={() => openProductFromSku(lookupResult.sku, productTitle)}
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

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={Boxes} label="Current Stock" />
                  <Text mt={6} size="xl" fw={800} ff="monospace">{displayedCurrentStock}</Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={IndianRupee} label="Latest Invoice MRP" />
                  <Text mt={6} size="xl" fw={800} ff="monospace">{formatMoney(lookupResult.invoices[0]?.mrp)}</Text>
                </Paper>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={Package} label="Product Master" />
                  <SimpleGrid cols={2} spacing={6} mt="xs">
                    <Info label="Name" value={
                      <MasterLink onClick={() => openProductFromSku(lookupResult.sku, productTitle)}>
                        {lookupResult.product?.name || productTitle}
                      </MasterLink>
                    } />
                    <Info label="SKU" value={
                      <MasterLink onClick={() => openProductFromSku(lookupResult.sku, productTitle)} mono>
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
              </SimpleGrid>

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

export default StockCheck;
