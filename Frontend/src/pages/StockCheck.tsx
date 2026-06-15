import React, { memo, useCallback, useEffect, useState } from "react";
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
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Badge as MBadge,
  Box,
  Group,
  Paper,
  SimpleGrid,
  Text,
  ThemeIcon,
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
import { LocationCheckMode } from "./StockCheck/components/LocationCheckMode";
import { ManufacturerCheckMode } from "./StockCheck/components/ManufacturerCheckMode";
import { ModeHeader } from "./StockCheck/components/ModeHeader";
import { ProductCheckMode } from "./StockCheck/components/ProductCheckMode";
import { QuickSaleMode } from "./StockCheck/components/QuickSaleMode";
import { EmptyInline, Info, MasterLink, MetricLabel, ReferenceLink } from "./StockCheck/components/SharedComponents";
import { StockCheckHistoryMode } from "./StockCheck/components/StockCheckHistoryMode";
import { StockVerifyMode } from "./StockCheck/components/StockVerifyMode";

type ActiveMode = "hub" | "verify" | "quick-sale" | "location" | "manufacturer" | "product" | "history";
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


export const StockCheck = memo(function StockCheck({
  initialMode = "hub",
}: {
  initialMode?: ActiveMode;
}) {
  const [activeMode, setActiveMode] = useState<ActiveMode>(initialMode);
  const isMobile = useMediaQuery("(max-width: 48em)");

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  const handleBack = useCallback(() => setActiveMode("hub"), []);
  const handleResumePausedCheck = useCallback((mode: Extract<ActiveMode, "location" | "manufacturer" | "product">) => {
    setActiveMode(mode);
  }, []);

  return (
    <>
      {activeMode === "hub" && <StockCheckHub onSelectMode={setActiveMode} isMobile={!!isMobile} />}
      {activeMode === "verify" && <StockVerifyMode onBack={handleBack} isMobile={!!isMobile} />}
      {activeMode === "quick-sale" && <QuickSaleMode onBack={handleBack} isMobile={!!isMobile} />}
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
        mode: "quick-sale",
        icon: TrendingUp,
        title: "Quick Sale",
        description: "View most frequently sold products without leaving Stock Check.",
        color: "rgba(244, 114, 182, 0.8)",
        gradient: "linear-gradient(135deg, rgba(244,114,182,0.16) 0%, rgba(15,23,42,0.6) 100%)",
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
      {
        href: "/audit-logs",
        icon: Activity,
        title: "Audit Log",
        description: "View all system activity. Track changes, user actions, and operations with date filters.",
        color: "rgba(148, 163, 184, 0.8)",
        gradient: "linear-gradient(135deg, rgba(148,163,184,0.14) 0%, rgba(15,23,42,0.6) 100%)",
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
    </OperationsPage>
  );
}
export default StockCheck;
