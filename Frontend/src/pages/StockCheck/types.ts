export type ActiveMode = "hub" | "verify" | "location" | "manufacturer" | "product" | "history";

export type CheckSessionStatus = "idle" | "running" | "paused";

export type StockCheckReportStatus = "PAUSED" | "COMPLETED";

export type ScannedItem = {
  sku: string;
  productName: string;
  productId: number | null;
  scannedQty: number;
  systemQty: number;
  isUnexpected: boolean;
  alias?: string;
};

export type StockCheckDraft = {
  referenceId?: string | null;
  referenceCode?: string;
  isLocked?: boolean;
  sessionStatus: CheckSessionStatus;
  scanInput: string;
  scannedItems: ScannedItem[];
  updatedAt: string;
};

export type LocationStock = {
  locationCode: string;
  quantity: number;
};

export type ProductLookupResult = {
  sku: string;
  product: import("../../services/masterApi").Product | null;
  quantityRow: import("../../services/masterApi").ProductQuantityRecord | null;
  allottedLocation: import("../../services/masterApi").ProductAllottedLocationRecord | null;
  invoices: import("../../services/masterApi").PoInvoice[];
  movements: import("../../services/masterApi").ProductStockMovementRecord[];
  locations: LocationStock[];
  totalPoQuantity: number;
  totalLocationStock: number;
};

export const formatMoney = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value)
    : "-";

export const normalizeSku = (value?: string | null) =>
  (value || "").trim().toUpperCase();

export const masterHref = (path: string, search: string) =>
  `${path}?search=${encodeURIComponent(search)}`;

export const getLocationJson = (
  row: import("../../services/masterApi").ProductAllottedLocationRecord | null,
) => {
  if (!row) return {};
  return (
    row.locationJson ||
    (row as unknown as { LocationJson?: Record<string, number> }).LocationJson ||
    {}
  );
};

export const STOCK_CHECK_DRAFT_KEYS = {
  location: "plusgrow.stockCheck.locationDraft",
  manufacturer: "plusgrow.stockCheck.manufacturerDraft",
  product: "plusgrow.stockCheck.productDraft",
} as const;

export const readStockCheckDraft = (key: string): StockCheckDraft | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StockCheckDraft) : null;
  } catch {
    return null;
  }
};

export const writeStockCheckDraft = (key: string, draft: Omit<StockCheckDraft, "updatedAt">) => {
  window.localStorage.setItem(
    key,
    JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    }),
  );
};

export const clearStockCheckDraft = (key: string) => {
  window.localStorage.removeItem(key);
};

export const saveStockCheckReport = async (
  checkType: string,
  referenceName: string,
  scannedItems: ScannedItem[],
  status: StockCheckReportStatus,
) => {
  const totalSystem = scannedItems.reduce((s, i) => s + i.systemQty, 0);
  const totalScanned = scannedItems.reduce((s, i) => s + i.scannedQty, 0);
  const itemsWithVariance = scannedItems.filter((i) => i.scannedQty !== i.systemQty).length;

  const items: import("../../services/masterApi").StockCheckReportItem[] = scannedItems.map((i) => ({
    sku: i.sku,
    productName: i.productName,
    systemQty: i.systemQty,
    scannedQty: i.scannedQty,
    variance: i.scannedQty - i.systemQty,
    isUnexpected: i.isUnexpected,
  }));

  const { stockCheckReportsApi } = await import("../../services/masterApi");
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
