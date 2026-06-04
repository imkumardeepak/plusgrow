import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Divider,
  Group,
  Image,
  Loader,
  NumberInput,
  Paper,
  Progress,
  Radio,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  ArrowDownToLine,
  Download,
  Eye,
  FileText,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Tag,
  Upload,
} from "lucide-react";
import { toast } from "../lib/toast";
import { exportToExcel, formatExcelDate, formatExcelNumber } from "../hooks/useExcelExport";

import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Modal, ConfirmDialog } from "../components/atoms/Modal";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  MantineDataTable,
  DataTableColumn,
} from "../components/molecules/MantineDataTable";
import {
  CreatePoInvoiceDto,
  Importer,
  Manufacturer,
  Party,
  PoInvoiceFilters,
  PoInvoice,
  PoInvoiceHeaderSummary,
  PaginationInfo,
  Product,
  importersApi,
  manufacturersApi,
  partiesApi,
  poInvoicesApi,
  productsApi,
  validateProductForSticker,
} from "../services/masterApi";
import { StickerTemplate, stickersApi } from "../services/stickersApi";
import {
  StickerPrinterConfig,
  stickerPrinterConfigsApi,
} from "../services/stickerPrinterConfigsApi";
import {
  InwardInvoiceModal,
  InwardEntryMode,
  InvoiceLineDraft,
} from "./Inward/components/InwardInvoiceModal";
import {
  InwardSkippedRowsModal,
  InwardUploadModal,
} from "./Inward/components/InwardUploadModals";

type DeleteTarget = { kind: "invoice"; row: PoInvoice } | null;
type InwardStatusFilter = "all" | "pending" | "printed" | "canceled";
type StickerMode = "Combined" | "Separate" | "Manufacture";
type InvoiceSummary = PoInvoiceHeaderSummary & {
  invoiceKey: string;
};
type InvoiceUploadSkippedRow = {
  rowNumber: number;
  skuCode: string;
  quantity: string;
  reason: string;
};

const rowStatusColor = (printed: boolean) => (printed ? "green" : "orange");
const isInvoiceCanceled = (summary?: Pick<InvoiceSummary, "status"> | null) =>
  summary?.status === "Canceled";
const getStickerStatus = (row: PoInvoice) =>
  row.printed ? "Printed" : "Pending";
const labelModeText: Record<StickerMode, string> = {
  Combined: "Imported & Marketed By",
  Separate: "Marketed / Imported",
  Manufacture: "Marketed By / Manufacture By",
};

const defaultToDate = format(new Date(), "yyyy-MM-dd");
const defaultFromDate = format(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  "yyyy-MM-dd",
);

const emptyInvoiceForm = (): CreatePoInvoiceDto => ({
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  partyName: "",
  productId: 0,
  billedQty: 0,
  mrp: null,
});

export const Inward = memo(function Inward() {
  const isLargeScreen = useMediaQuery("(min-width: 90em)");
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [poInvoices, setPoInvoices] = useState<PoInvoice[]>([]);
  const [invoiceSummaries, setInvoiceSummaries] = useState<InvoiceSummary[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [importers, setImporters] = useState<Importer[]>([]);
  const [templates, setTemplates] = useState<StickerTemplate[]>([]);
  const [printerConfigs, setPrinterConfigs] = useState<StickerPrinterConfig[]>(
    [],
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRowsLoading, setIsRowsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<InwardStatusFilter>("all");
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const [editingInvoice, setEditingInvoice] = useState<PoInvoice | null>(null);

  const [invoiceForm, setInvoiceForm] =
    useState<CreatePoInvoiceDto>(emptyInvoiceForm());
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineDraft[]>([]);
  const [invoiceUploadSkippedRows, setInvoiceUploadSkippedRows] = useState<
    InvoiceUploadSkippedRow[]
  >([]);
  const [isInvoiceLineUploading, setIsInvoiceLineUploading] = useState(false);
  const [inwardEntryMode, setInwardEntryMode] =
    useState<InwardEntryMode>("manufacturer");

  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSkippedErrors, setUploadSkippedErrors] = useState<string[]>([]);
  const [isUploadSkippedModalOpen, setIsUploadSkippedModalOpen] =
    useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedInvoiceSummary, setSelectedInvoiceSummary] =
    useState<InvoiceSummary | null>(null);
  const [cancelInvoiceSummary, setCancelInvoiceSummary] =
    useState<InvoiceSummary | null>(null);
  const [cancelRemark, setCancelRemark] = useState("");
  const [isCancelingInvoice, setIsCancelingInvoice] = useState(false);
  const [selectedPrintRow, setSelectedPrintRow] = useState<PoInvoice | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [stickerSize, setStickerSize] = useState("50x50");
  const [stickerType, setStickerType] = useState<StickerMode>("Combined");
  const [manufacturerId, setManufacturerId] = useState<string | null>(null);
  const [importerId, setImporterId] = useState<string | null>(null);
  const [invoiceManufacturerSearch, setInvoiceManufacturerSearch] = useState("");
  const [invoicePartySearch, setInvoicePartySearch] = useState("");
  const [manufacturerSearch, setManufacturerSearch] = useState("");
  const [importerSearch, setImporterSearch] = useState("");
  const [reprintFrom, setReprintFrom] = useState<number | "">(1);
  const [reprintTo, setReprintTo] = useState<number | "">(1);
  const [stickerNote, setStickerNote] = useState("");

  const [printAllSizePickerOpen, setPrintAllSizePickerOpen] = useState(false);
  const [printAllSize, setPrintAllSize] = useState("50x50");
  const [printAllProgressOpen, setPrintAllProgressOpen] = useState(false);
  const [printAllCurrent, setPrintAllCurrent] = useState(0);
  const [printAllTotal, setPrintAllTotal] = useState(0);
  const [printAllCurrentProduct, setPrintAllCurrentProduct] = useState("");
  const [printAllErrors, setPrintAllErrors] = useState<string[]>([]);
  const [printAllDone, setPrintAllDone] = useState(false);
  const [printAllCancelled, setPrintAllCancelled] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        productsData,
        manufacturerData,
        partyData,
        importerData,
        templateData,
        configData,
      ] = await Promise.all([
        productsApi.search(""),
        manufacturersApi.getPaged({ page: 1, pageSize: 25 }),
        partiesApi.getPaged({ page: 1, pageSize: 25 }),
        importersApi.getPaged({ page: 1, pageSize: 25 }),
        stickersApi.getTemplates(),
        stickerPrinterConfigsApi.getAll(),
      ]);

      setProducts(productsData);
      setManufacturers(manufacturerData.data);
      setParties(partyData.data);
      setImporters(importerData.data);
      setTemplates(templateData);
      setPrinterConfigs(configData);
    } catch (error) {
      toast.error("Failed to load inward data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProductLookup = useCallback(async (query: string) => {
    try {
      const productsData = await productsApi.search(query);
      setProducts(productsData);
    } catch {
      toast.error("Failed to search products");
    }
  }, []);

  const loadManufacturerLookup = useCallback(async (query: string) => {
    try {
      const result = await manufacturersApi.getPaged({
        search: query,
        page: 1,
        pageSize: 25,
        sortBy: "name",
        sortDirection: "asc",
      });
      setManufacturers(result.data);
    } catch {
      toast.error("Failed to search manufacturers");
    }
  }, []);

  const loadPartyLookup = useCallback(async (query: string) => {
    try {
      const result = await partiesApi.getPaged({
        search: query,
        page: 1,
        pageSize: 25,
        sortBy: "name",
        sortDirection: "asc",
      });
      setParties(result.data);
    } catch {
      toast.error("Failed to search parties");
    }
  }, []);

  const loadImporterLookup = useCallback(async (query: string) => {
    try {
      const result = await importersApi.getPaged({
        search: query,
        page: 1,
        pageSize: 25,
        sortBy: "name",
        sortDirection: "asc",
      });
      setImporters(result.data);
    } catch {
      toast.error("Failed to search importers");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProductLookup(productSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadProductLookup, productSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadManufacturerLookup(manufacturerSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadManufacturerLookup, manufacturerSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadManufacturerLookup(invoiceManufacturerSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [invoiceManufacturerSearch, loadManufacturerLookup]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPartyLookup(invoicePartySearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [invoicePartySearch, loadPartyLookup]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadImporterLookup(importerSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [importerSearch, loadImporterLookup]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (stickerSize === "25x25" && stickerType !== "Combined") {
      setStickerType("Combined");
    }
  }, [stickerSize, stickerType]);

  useEffect(() => {
    if (!selectedPrintRow) return;
    setReprintFrom(1);
    setReprintTo(selectedPrintRow.billedQty || 1);
    setStickerNote("");
  }, [selectedPrintRow]);

  const loadInvoiceRows = useCallback(async (filters: PoInvoiceFilters) => {
    try {
      setIsRowsLoading(true);
      const result = await poInvoicesApi.getHeaders({
        ...filters,
        page: 1,
        pageSize: 1000,
      });
      const summaries = result.data.map((row) => ({
        ...row,
        invoiceKey: `${row.invoiceNumber}__${row.invoiceDate}__${row.partyName}`,
      }));
      setInvoiceSummaries(summaries);
      setPoInvoices(summaries.flatMap((row) => row.items));
      setPagination(result.pagination);
    } catch {
      toast.error("Failed to load inward rows");
    } finally {
      setIsRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchRows = () => {
      void loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
      });
    };

    fetchRows();

    const interval = setInterval(() => {
      fetchRows();
    }, 30000);

    return () => clearInterval(interval);
  }, [fromDate, loadInvoiceRows, search, statusFilter, toDate]);

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: `${product.sku || "NO-SKU"} - ${product.name}`,
        mrp: product.mrp ?? null,
      })),
    [products],
  );

  const invoiceManufacturerOptions = useMemo(() => {
    const seen = new Map<string, { value: string; label: string }>();
    for (const item of manufacturers) {
      const key = item.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { value: item.name, label: item.name });
      }
    }

    if (
      invoiceForm.partyName &&
      !seen.has(invoiceForm.partyName.trim().toLowerCase())
    ) {
      return [
        {
          value: invoiceForm.partyName,
          label: invoiceForm.partyName,
        },
        ...Array.from(seen.values()),
      ];
    }

    return Array.from(seen.values());
  }, [invoiceForm.partyName, manufacturers]);

  const invoicePartyOptions = useMemo(() => {
    const seen = new Map<string, { value: string; label: string }>();
    for (const item of parties) {
      const key = item.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { value: item.name, label: item.name });
      }
    }

    if (
      invoiceForm.partyName &&
      !seen.has(invoiceForm.partyName.trim().toLowerCase())
    ) {
      return [
        {
          value: invoiceForm.partyName,
          label: invoiceForm.partyName,
        },
        ...Array.from(seen.values()),
      ];
    }

    return Array.from(seen.values());
  }, [invoiceForm.partyName, parties]);

  const handleInwardEntryModeChange = (value: string | null) => {
    const nextMode = (value || "manufacturer") as InwardEntryMode;
    setInwardEntryMode(nextMode);
    setInvoiceForm((prev) => ({
      ...prev,
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().slice(0, 10),
      partyName: "",
    }));
    setInvoiceLines([]);
    setInvoiceUploadSkippedRows([]);
    setInvoiceManufacturerSearch("");
    setInvoicePartySearch("");
  };

  const importerOptions = useMemo(
    () =>
      importers.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [importers],
  );

  const selectedImporter = useMemo(
    () => importers.find((item) => String(item.id) === importerId) ?? null,
    [importerId, importers],
  );

  const findImporterByName = useCallback(
    (name?: string | null) => {
      const normalized = name?.trim().toLowerCase();
      if (!normalized) return null;

      return (
        importers.find((item) => item.name.trim().toLowerCase() === normalized) ??
        null
      );
    },
    [importers],
  );

  const resolveImporterId = useCallback(
    async (name?: string | null) => {
      const localMatch = findImporterByName(name);
      if (localMatch) return localMatch.id;

      const normalized = name?.trim();
      if (!normalized) return null;

      const result = await importersApi.getPaged({
        search: normalized,
        page: 1,
        pageSize: 25,
        sortBy: "name",
        sortDirection: "asc",
      });
      setImporters(result.data);

      return (
        result.data.find(
          (item) => item.name.trim().toLowerCase() === normalized.toLowerCase(),
        )?.id ?? null
      );
    },
    [findImporterByName],
  );

  const printerConfig = useMemo(
    () =>
      printerConfigs.find(
        (config) => config.stickerSize === stickerSize && config.isActive,
      ) ?? null,
    [printerConfigs, stickerSize],
  );

  const activeTemplate = useMemo(
    () =>
      templates.find(
        (template) =>
          template.size === stickerSize && template.type === stickerType,
      ) ?? null,
    [stickerSize, stickerType, templates],
  );

  const invoiceStats = useMemo(() => {
    const activeSummaries = invoiceSummaries.filter(
      (row) => !isInvoiceCanceled(row),
    );
    const activeItems = activeSummaries.flatMap((row) => row.items);
    const canceledCount = invoiceSummaries.length - activeSummaries.length;
    const pendingPrint = activeItems.filter((row) => !row.printed).length;
    const printedCount = activeItems.length - pendingPrint;
    const totalBilled = activeItems.reduce((sum, row) => sum + row.billedQty, 0);
    const totalRemaining = activeItems.reduce(
      (sum, row) => sum + row.remainingAllocation,
      0,
    );
    const allottedCount = activeItems.filter((row) => row.locationAllotted).length;

    return {
      pendingPrint,
      printedCount,
      canceledCount,
      totalBilled,
      totalRemaining,
      allottedCount,
    };
  }, [invoiceSummaries]);

  const columns: DataTableColumn<InvoiceSummary>[] = [
    {
      key: "invoiceNo",
      header: "Invoice No.",
      sortable: true,
      sortAccessor: (row) => row.invoiceNumber,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "11px"} ff="monospace" c="cyan.2" fw={700} lineClamp={1}>
          {row.invoiceNumber}
        </Text>
      ),
      width: 160,
    },
    {
      key: "items",
      header: "Items",
      sortable: true,
      sortAccessor: (row) => row.productCount,
      render: (row) => (
        <Stack gap={2}>
          <Text size={isLargeScreen ? "sm" : "xs"} fw={700}>
            {row.productCount} products
          </Text>
          <Text size={isLargeScreen ? "xs" : "11px"} c="dimmed" lineClamp={1} maw={240}>
            {row.items
              .slice(0, 2)
              .map((item) => item.productName)
              .join(", ")}
            {row.items.length > 2 ? ` +${row.items.length - 2} more` : ""}
          </Text>
        </Stack>
      ),
      width: 240,
    },
    {
      key: "date",
      header: "Invoice Date",
      sortable: true,
      sortAccessor: (row) => row.invoiceDate,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"} fw={500} lineClamp={1}>
          {format(new Date(row.invoiceDate), "dd MMM yyyy")}
        </Text>
      ),
      width: 120,
    },
    {
      key: "partyName",
      header: "Party / Supplier",
      sortable: true,
      sortAccessor: (row) => row.partyName,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"} lineClamp={1} maw={160}>
          {row.partyName || "N/A"}
        </Text>
      ),
      width: 160,
    },
    {
      key: "billed",
      header: "Billed Qty.",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.totalBilledQty,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"} fw={800} c="cyan.3">
          {row.totalBilledQty}
        </Text>
      ),
      width: 90,
    },
    {
      key: "remaining",
      header: "Location Allot Pending",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.totalRemainingAllocation,
      render: (row) => (
        <Text
          size={isLargeScreen ? "sm" : "xs"}
          fw={800}
          c={row.totalRemainingAllocation > 0 ? "orange.3" : "green.3"}
        >
          {row.totalRemainingAllocation}
        </Text>
      ),
      width: 140,
    },
    {
      key: "printed",
      header: "Status",
      sortable: true,
      sortAccessor: (row) =>
        isInvoiceCanceled(row) ? "canceled" : String(row.pendingCount),
      render: (row) => {
        const isCanceled = isInvoiceCanceled(row);
        return (
          <Badge
            size="sm"
            radius="md"
            variant="light"
            color={isCanceled ? "red" : row.pendingCount === 0 ? "green" : "orange"}
          >
            {isCanceled
              ? "Canceled"
              : row.pendingCount === 0
                ? "Fully Printed"
                : `${row.pendingCount} Pending`}
          </Badge>
        );
      },
      width: 130,
    },
  ];

  useEffect(() => {
    let isMounted = true;

    const loadSelectedProduct = async () => {
      if (!selectedPrintRow) {
        setSelectedProduct(null);
        return;
      }

      const product = await productsApi.getById(selectedPrintRow.productId);
      if (isMounted) setSelectedProduct(product);
    };

    void loadSelectedProduct();

    return () => {
      isMounted = false;
    };
  }, [selectedPrintRow]);

  useEffect(() => {
    if (!selectedPrintRow) {
      setManufacturerId(null);
      return;
    }

    setManufacturerId(
      selectedProduct?.manufacturerId
        ? String(selectedProduct.manufacturerId)
        : null,
    );
  }, [selectedPrintRow, selectedProduct]);

  useEffect(() => {
    setImporterId(null);
    setImporterSearch("");
  }, [selectedPrintRow?.id, stickerSize, stickerType]);

  const buildStickerPayload = useCallback(
    (row: PoInvoice, quantity: number) => ({
      productId: row.productId,
      manufacturerId:
        stickerType === "Manufacture" && manufacturerId
          ? Number(manufacturerId)
          : undefined,
      importerId:
        stickerType !== "Manufacture" && importerId
          ? Number(importerId)
          : undefined,
      size: stickerSize,
      type: stickerType,
      monthYear: format(new Date(row.invoiceDate), "MMM/yyyy").toUpperCase(),
      invoiceDate: format(new Date(row.invoiceDate), "dd/MM/yyyy"),
      batchNumber: row.invoiceNumber,
      note: stickerNote.trim(),
      quantity,
      mrp: row.mrp ?? null,
    }),
    [importerId, manufacturerId, stickerNote, stickerSize, stickerType],
  );

  const refreshPreview = useCallback(async () => {
    if (!selectedPrintRow || !selectedProduct) {
      setPreviewUrl(null);
      return;
    }

    const validationErrors = validateProductForSticker(
      selectedProduct,
      stickerSize,
    );
    if (validationErrors.length > 0) {
      setPreviewUrl(null);
      return;
    }

    if (stickerSize !== "25x25" && stickerType !== "Manufacture" && !importerId) {
      setPreviewUrl(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const nextPreview = await stickersApi.getPreview(
        buildStickerPayload(selectedPrintRow, selectedPrintRow.billedQty || 1),
      );
      setPreviewUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return nextPreview;
      });
    } catch {
      setPreviewUrl(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [buildStickerPayload, selectedPrintRow, selectedProduct, stickerSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshPreview();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [refreshPreview]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const getPrinterAddress = () => {
    if (!printerConfig?.printerIp?.trim()) return null;
    return `${printerConfig.printerIp.trim()}:${printerConfig.printerPort}`;
  };

  const handlePrint = async (mode: "normal" | "reprint") => {
    if (!selectedPrintRow) return;
    if (!selectedProduct) {
      toast.error("Product details not loaded yet");
      return;
    }

    if (mode === "reprint" && !selectedPrintRow.printed) {
      toast.error("Reprint is available only after full quantity has been printed");
      return;
    }

    const validationErrors = validateProductForSticker(
      selectedProduct,
      stickerSize,
    );
    if (validationErrors.length > 0) {
      toast.error("Cannot print sticker. Missing product data: " + validationErrors.join(", "));
      return;
    }

    if (stickerSize !== "25x25" && stickerType !== "Manufacture" && !importerId) {
      toast.error("Please select an importer from importer master for Imported & Marketed By sticker");
      return;
    }

    const printerAddress = getPrinterAddress();
    if (!printerAddress) {
      toast.error("Active printer profile not found for selected sticker size");
      return;
    }

    if (!activeTemplate) {
      toast.error("Sticker template not found for selected size and label mode");
      return;
    }

    const from = Number(reprintFrom || 1);
    const to = Number(reprintTo || from);
    if (mode === "reprint") {
      if (from < 1 || to < 1 || from > selectedPrintRow.billedQty || to > selectedPrintRow.billedQty) {
        toast.error("Reprint range must stay within billed quantity");
        return;
      }

      if (from > to) {
        toast.error("Reprint range is invalid. 'From sticker' cannot be greater than 'To sticker'");
        return;
      }
    }

    const reprintQuantity = to - from + 1;
    const quantity =
      mode === "normal" ? selectedPrintRow.billedQty : reprintQuantity;

    setIsPrinting(true);
    try {
      await stickersApi.print({
        printerIp: printerAddress,
        items: [
          {
            config: {
              ...buildStickerPayload(selectedPrintRow, quantity),
              note: stickerNote.trim(),
            },
            quantity,
          },
        ],
      });

      if (mode === "normal") {
        await poInvoicesApi.markPrinted([selectedPrintRow.id]);
        await loadInvoiceRows({
          search,
          status: statusFilter,
          fromDate,
          toDate,
        });
        setSelectedPrintRow((current) =>
          current ? { ...current, printed: true } : current,
        );
      }

      toast.success(
        mode === "normal"
          ? `${selectedPrintRow.billedQty} stickers sent`
          : `${quantity} stickers sent from ${from} to ${to}`,
      );
    } catch (error: any) {
      toast.error(error.message || "Sticker print job failed");
    } finally {
      setIsPrinting(false);
    }
  };

  const resetInvoiceModal = () => {
    setEditingInvoice(null);
    setInvoiceForm(emptyInvoiceForm());
    setInvoiceLines([]);
    setInvoiceUploadSkippedRows([]);
    setInwardEntryMode("manufacturer");
    setInvoiceManufacturerSearch("");
    setInvoicePartySearch("");
    setInvoiceModalOpen(false);
  };

  const openCreateInvoice = () => {
    setEditingInvoice(null);
    setInvoiceForm(emptyInvoiceForm());
    setInvoiceLines([]);
    setInvoiceUploadSkippedRows([]);
    setInwardEntryMode("manufacturer");
    setInvoiceManufacturerSearch("");
    setInvoicePartySearch("");
    setInvoiceModalOpen(true);
  };

  const openEditInvoice = (row: PoInvoice) => {
    setEditingInvoice(row);
    setInvoiceForm({
      invoiceNumber: row.invoiceNumber,
      invoiceDate: row.invoiceDate.slice(0, 10),
      partyName: row.partyName,
      productId: row.productId,
      billedQty: row.billedQty,
      mrp: row.mrp ?? null,
    });
    setInvoiceLines([]);
    setInvoiceUploadSkippedRows([]);
    setInwardEntryMode("manufacturer");
    setInvoiceManufacturerSearch(row.partyName);
    setInvoicePartySearch("");
    setInvoiceModalOpen(true);
  };

  const getProductLabel = (productId: number) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return `Product #${productId}`;
    return `${product.sku || "NO-SKU"} - ${product.name}`;
  };

  const handleAddInvoiceLine = () => {
    if (!invoiceForm.productId) {
      toast.error("Select product first");
      return;
    }

    if (!invoiceForm.billedQty || invoiceForm.billedQty <= 0) {
      toast.error("Billed quantity must be greater than zero");
      return;
    }

    const existing = invoiceLines.find(
      (line) =>
        line.productId === invoiceForm.productId &&
        Number(line.mrp || 0) === Number(invoiceForm.mrp || 0),
    );
    if (existing) {
      setInvoiceLines((current) =>
        current.map((line) =>
          line.productId === invoiceForm.productId
            ? { ...line, billedQty: line.billedQty + invoiceForm.billedQty }
            : line,
        ),
      );
    } else {
      setInvoiceLines((current) => [
        ...current,
        {
          id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          productId: invoiceForm.productId,
          billedQty: invoiceForm.billedQty,
          mrp: invoiceForm.mrp ?? null,
        },
      ]);
    }

    setInvoiceForm((prev) => ({
      ...prev,
      productId: 0,
      billedQty: 0,
      mrp: null,
    }));
    setProductSearch("");
  };

  const mergeInvoiceLines = (nextLines: InvoiceLineDraft[]) => {
    setInvoiceLines((current) => {
      const lineMap = new Map<string, InvoiceLineDraft>();

      [...current, ...nextLines].forEach((line) => {
        const key = `${line.productId}:${Number(line.mrp || 0).toFixed(2)}`;
        const existing = lineMap.get(key);
        if (existing) {
          lineMap.set(key, {
            ...existing,
            billedQty: existing.billedQty + line.billedQty,
          });
          return;
        }

        lineMap.set(key, line);
      });

      return Array.from(lineMap.values());
    });
  };

  const handleDownloadThirdPartyLineTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([
      {
        "SKU Code": "SKU-001",
        "Qnty": 10,
        MRP: 100,
      },
    ]);
    worksheet["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Product Lines");
    XLSX.writeFile(workbook, "Third_Party_Inward_Product_Lines.xlsx");
  };

  const handleDownloadSkippedInvoiceLines = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      invoiceUploadSkippedRows.map((row) => ({
        "Row #": row.rowNumber,
        "SKU Code": row.skuCode,
        "Qnty": row.quantity,
        Reason: row.reason,
      })),
    );
    worksheet["!cols"] = [{ wch: 8 }, { wch: 24 }, { wch: 12 }, { wch: 42 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Skipped Rows");
    XLSX.writeFile(workbook, `Skipped_Inward_Lines_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
  };

  const handleDownloadUploadSkippedRows = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      uploadSkippedErrors.map((error, index) => {
        const rowMatch = error.match(/^Row\s+(\d+):\s*(.*)$/i);
        return {
          "Row #": rowMatch?.[1] || index + 1,
          Reason: rowMatch?.[2] || error,
        };
      }),
    );
    worksheet["!cols"] = [{ wch: 8 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Skipped Upload Rows");
    XLSX.writeFile(workbook, `Skipped_PO_Upload_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
  };

  const getUploadCell = (
    row: Record<string, unknown>,
    names: string[],
  ) => {
    const entry = Object.entries(row).find(([key]) =>
      names.some((name) => key.trim().toLowerCase() === name.toLowerCase()),
    );

    return entry?.[1] == null ? "" : String(entry[1]).trim();
  };

  const handleThirdPartyLineUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!invoiceForm.invoiceNumber.trim()) {
      toast.error("Reference Number is required before upload");
      return;
    }
    if (!invoiceForm.partyName.trim()) {
      toast.error("Select Party before upload");
      return;
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload a valid Excel file");
      return;
    }

    setIsInvoiceLineUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const nextLines: InvoiceLineDraft[] = [];
      const skippedRows: InvoiceUploadSkippedRow[] = [];

      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2;
        const skuCode = getUploadCell(row, [
          "SKU Code",
          "SKU",
          "SkuCode",
          "Part No",
          "PartNo",
        ]);
        const quantityText = getUploadCell(row, [
          "Qnty",
          "Qty",
          "Quantity",
          "Billed Qty",
          "BilledQty",
        ]);
        const mrpText = getUploadCell(row, ["MRP", "Mrp"]);

        if (!skuCode && !quantityText) continue;

        const quantity = Number(quantityText);
        const mrp = mrpText ? Number(mrpText.replace(/,/g, "")) : null;
        if (!skuCode) {
          skippedRows.push({
            rowNumber,
            skuCode,
            quantity: quantityText,
            reason: "SKU Code is blank",
          });
          continue;
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
          skippedRows.push({
            rowNumber,
            skuCode,
            quantity: quantityText,
            reason: "Quantity must be greater than zero",
          });
          continue;
        }

        try {
          const lookup = await productsApi.lookup(skuCode);
          if (!lookup.product?.id) {
            skippedRows.push({
              rowNumber,
              skuCode,
              quantity: quantityText,
              reason: "SKU Code not found in Product Master",
            });
            continue;
          }

          nextLines.push({
            id: `line-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
            productId: lookup.product.id,
            billedQty: quantity,
            mrp: Number.isFinite(mrp) ? mrp : lookup.product.mrp ?? null,
          });
        } catch {
          skippedRows.push({
            rowNumber,
            skuCode,
            quantity: quantityText,
            reason: "SKU Code not found in Product Master",
          });
        }
      }

      mergeInvoiceLines(nextLines);
      setInvoiceUploadSkippedRows(skippedRows);

      if (nextLines.length > 0) {
        toast.success(`${nextLines.length} product lines added`);
      }
      if (skippedRows.length > 0) {
        toast.warning(`${skippedRows.length} rows skipped`);
      }
      if (nextLines.length === 0 && skippedRows.length === 0) {
        toast.warning("No product lines found in Excel");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to read Excel file");
    } finally {
      setIsInvoiceLineUploading(false);
    }
  };

  const handleInvoiceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!invoiceForm.invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return;
    }

    if (!invoiceForm.partyName.trim()) {
      toast.error(
        inwardEntryMode === "thirdParty"
          ? "Party is required"
          : "Manufacturer is required",
      );
      return;
    }

    if (editingInvoice && !invoiceForm.productId) {
      toast.error("Product is required");
      return;
    }

    if (!editingInvoice && invoiceLines.length === 0) {
      toast.error("Add at least one product line");
      return;
    }

    setIsSavingInvoice(true);
    try {
      if (editingInvoice) {
        await poInvoicesApi.update(editingInvoice.id, invoiceForm);
        toast.success("PO invoice updated");
      } else {
        await Promise.all(
          invoiceLines.map((line) =>
            poInvoicesApi.create({
              invoiceNumber: invoiceForm.invoiceNumber,
              invoiceDate: invoiceForm.invoiceDate,
              partyName: invoiceForm.partyName,
              productId: line.productId,
              billedQty: line.billedQty,
              mrp: line.mrp ?? null,
            }),
          ),
        );
        toast.success(`${invoiceLines.length} invoice rows created`);
      }
      await loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
      });
      resetInvoiceModal();
    } catch (error: any) {
      toast.error(error.message || "Failed to save PO invoice");
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.kind === "invoice") {
        await poInvoicesApi.delete(deleteTarget.row.id);
        toast.success("PO invoice deleted");
      }
      await loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
      });
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete row");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportToExcel({
        fileName: "Inward_Invoices",
        sheets: [{
          sheetName: "Invoices",
          data: invoiceSummaries,
          columns: [
            { header: "Invoice Number", accessor: (row) => row.invoiceNumber },
            { header: "Invoice Date", accessor: (row) => formatExcelDate(row.invoiceDate) },
            { header: "Party Name", accessor: (row) => row.partyName },
            { header: "Status", accessor: (row) => row.status },
            { header: "Cancel Remark", accessor: (row) => row.cancelRemark || "" },
            { header: "Product Count", accessor: (row) => row.productCount, format: "number" },
            { header: "Total Billed Qty", accessor: (row) => row.totalBilledQty, format: "number" },
            { header: "Printed Count", accessor: (row) => row.printedCount, format: "number" },
            { header: "Pending Count", accessor: (row) => row.pendingCount, format: "number" },
            { header: "Total Remaining Alloc", accessor: (row) => row.totalRemainingAllocation, format: "number" },
          ],
        }],
      });
      toast.success("Inward invoices exported successfully");
    } catch {
      toast.error("Failed to export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelInvoiceSummary) return;

    if (!cancelRemark.trim()) {
      toast.error("Cancel reason is required");
      return;
    }

    setIsCancelingInvoice(true);
    try {
      await poInvoicesApi.cancelInvoice(
        cancelInvoiceSummary.id,
        cancelRemark.trim(),
      );
      toast.success(`Invoice ${cancelInvoiceSummary.invoiceNumber} canceled`);
      await loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
      });
      setCancelInvoiceSummary(null);
      setCancelRemark("");
      setSelectedInvoiceSummary(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invoice");
    } finally {
      setIsCancelingInvoice(false);
    }
  };

  const handleDownloadTemplate = () => {
    poInvoicesApi.downloadTemplate();
    toast.success("Template downloaded successfully");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload a valid Excel file");
      return;
    }

    setUploadFile(file);
    setUploadSkippedErrors([]);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const result = await poInvoicesApi.uploadExcel(uploadFile);
      const errors = result.errors || [];
      setUploadSkippedErrors(errors);
      if (result.success) {
        if (result.importedCount > 0) {
          toast.success(
            errors.length > 0
              ? `Imported ${result.importedCount} rows, skipped ${errors.length}`
              : `Imported ${result.importedCount} invoice rows`,
          );
        } else if (errors.length > 0) {
          toast.warning(
            `No rows imported. ${errors.length} rows skipped.`,
          );
        } else {
          toast.warning("No valid rows found in uploaded file");
        }
        if (errors.length > 0) {
          setIsUploadSkippedModalOpen(true);
        }
        setSearch("");
        setStatusFilter("all");
        setFromDate("");
        setToDate("");
        await loadData();
        await loadInvoiceRows({
          search: "",
          status: "all",
          fromDate: "",
          toDate: "",
        });
        setIsUploadModalOpen(errors.length > 0);
        setUploadFile(null);
      } else {
        toast.error("Invoice upload failed");
      }
    } catch (error: any) {
      const responseErrors = error.response?.data?.errors;
      if (Array.isArray(responseErrors) && responseErrors.length > 0) {
        setUploadSkippedErrors(responseErrors);
        setIsUploadSkippedModalOpen(true);
      }
      toast.error(error.message || "Failed to upload invoice file", {
        description: Array.isArray(responseErrors) && responseErrors.length > 0
          ? responseErrors.slice(0, 3).join(" | ")
          : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openPrintForRow = (row: PoInvoice) => {
    const parentSummary = invoiceSummaries.find((summary) =>
      summary.items.some((item) => item.id === row.id),
    );
    if (isInvoiceCanceled(parentSummary)) {
      toast.error("Canceled invoice rows cannot be printed");
      return;
    }

    setSelectedPrintRow(row);
    setImporterId(null);
    setManufacturerSearch("");
    setImporterSearch("");
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setUploadSkippedErrors([]);
    setIsUploadSkippedModalOpen(false);
  };

  const handleReuploadFromSkippedRows = () => {
    setIsUploadSkippedModalOpen(false);
    setUploadFile(null);
    setUploadSkippedErrors([]);
    setIsUploadModalOpen(true);
  };

  const openPrintAllSizePicker = () => {
    if (!selectedInvoiceSummary) return;
    if (isInvoiceCanceled(selectedInvoiceSummary)) {
      toast.error("Canceled invoice cannot be printed");
      return;
    }
    const unprintedItems = selectedInvoiceSummary.items.filter(
      (item) => !item.printed && item.billedQty > 0,
    );
    if (unprintedItems.length === 0) {
      toast.error("All items in this invoice have already been printed");
      return;
    }
    setPrintAllSize("50x50");
    setPrintAllSizePickerOpen(true);
  };

  const cancelledRef = useRef(false);

  const handlePrintAll = async () => {
    if (!selectedInvoiceSummary) return;

    const unprintedItems = selectedInvoiceSummary.items.filter(
      (item) => !item.printed && item.billedQty > 0,
    );
    if (unprintedItems.length === 0) {
      toast.error("No unprinted items found");
      return;
    }

    const config = printerConfigs.find(
      (c) => c.stickerSize === printAllSize && c.isActive,
    );
    if (!config?.printerIp?.trim()) {
      toast.error(
        "Active printer profile not found for selected sticker size",
      );
      return;
    }
    const printerAddress = `${config.printerIp.trim()}:${config.printerPort}`;

    let invoiceImporterId: number | null = null;
    if (printAllSize !== "25x25") {
      try {
        invoiceImporterId = await resolveImporterId(selectedInvoiceSummary.partyName);
      } catch {
        invoiceImporterId = null;
      }
    }

    const template = templates.find(
      (t) => t.size === printAllSize && t.type === "Combined",
    );
    if (!template) {
      toast.error(
        "Sticker template not found for selected size (Combined mode)",
      );
      return;
    }

    setPrintAllSizePickerOpen(false);
    setPrintAllCurrent(0);
    setPrintAllTotal(unprintedItems.length);
    setPrintAllErrors([]);
    setPrintAllDone(false);
    setPrintAllCancelled(false);
    cancelledRef.current = false;
    setPrintAllProgressOpen(true);

    const printedIds: number[] = [];

    for (let i = 0; i < unprintedItems.length; i++) {
      if (cancelledRef.current) break;

      const row = unprintedItems[i];
      setPrintAllCurrent(i + 1);
      setPrintAllCurrentProduct(
        `${row.skuCode || "NO-SKU"} - ${row.productName}`,
      );

      try {
        const product = await productsApi.getById(row.productId);
        if (!product) {
          setPrintAllErrors((prev) => [
            ...prev,
            `${row.skuCode}: Product not found`,
          ]);
          continue;
        }

        const validationErrors = validateProductForSticker(
          product,
          printAllSize,
        );
        if (validationErrors.length > 0) {
          setPrintAllErrors((prev) => [
            ...prev,
            `${row.skuCode}: Missing ${validationErrors.join(", ")}`,
          ]);
          continue;
        }

        const payload = {
          productId: row.productId,
          importerId: invoiceImporterId ?? undefined,
          size: printAllSize,
          type: "Combined" as const,
          monthYear: format(
            new Date(row.invoiceDate),
            "MMM/yyyy",
          ).toUpperCase(),
          batchNumber: row.invoiceNumber,
          note: "",
          quantity: row.billedQty,
          mrp: row.mrp ?? null,
        };

        await stickersApi.print({
          printerIp: printerAddress,
          items: [{ config: payload, quantity: row.billedQty }],
        });

        printedIds.push(row.id);
      } catch (error: any) {
        setPrintAllErrors((prev) => [
          ...prev,
          `${row.skuCode}: ${error.message || "Print failed"}`,
        ]);
      }
    }

    if (printedIds.length > 0) {
      try {
        await poInvoicesApi.markPrinted(printedIds);
      } catch {
        // silent
      }
      await loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
      });

      setSelectedInvoiceSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            printedIds.includes(item.id)
              ? { ...item, printed: true }
              : item,
          ),
          pendingCount: Math.max(
            0,
            prev.pendingCount - printedIds.length,
          ),
        };
      });
    }

    setPrintAllDone(true);
    if (cancelledRef.current) {
      toast.warning(
        `Print All canceled. ${printedIds.length} of ${unprintedItems.length} printed.`,
      );
    } else if (printedIds.length === unprintedItems.length) {
      toast.success(
        `All ${printedIds.length} items printed successfully`,
      );
    } else {
      toast.warning(
        `${printedIds.length} of ${unprintedItems.length} items printed`,
      );
    }
  };

  return (
    <OperationsPage
      title="Purchase Invoices"
      description="Upload inward invoice rows here. Same records drive sticker printing and put-away."
      icon={ArrowDownToLine}
      hideHeader
    >
      <Stack gap="sm">
        <OperationsPanel
          title="Filters"
          icon={ArrowDownToLine}
          description="Status and invoice date window for inward rows."
        >
          <SimpleGrid cols={{ base: 1, lg: 4 }} spacing="sm">
            <Box>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                STATUS
              </Text>
              <SegmentedControl
                fullWidth
                size="xs"
                radius="md"
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(value as InwardStatusFilter)
                }
                data={[
                  { value: "all", label: "All" },
                  { value: "pending", label: "Pending" },
                  { value: "printed", label: "Printed" },
                  { value: "canceled", label: "Canceled" },
                ]}
              />
            </Box>

            <TextInput
              size="xs"
              radius="md"
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.currentTarget.value)}
            />

            <TextInput
              size="xs"
              radius="md"
              label="To Date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.currentTarget.value)}
            />

            <Box>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                QUICK RANGE
              </Text>
              <Group gap="xs" wrap="nowrap">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    setFromDate(defaultFromDate);
                    setToDate(defaultToDate);
                  }}
                >
                  Last 7 Days
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setStatusFilter("all");
                  }}
                >
                  Clear
                </Button>
              </Group>
            </Box>
          </SimpleGrid>
        </OperationsPanel>

        <OperationsPanel
          title="Inward Ledger"
          icon={FileText}
          description="Compact PO invoice view for upload, edit, delete, and downstream sticker or put-away flow."
          action={
            <Group gap="xs" wrap="nowrap">
              <Badge size="sm" radius="md" variant="light" color="gray">
                {poInvoices.length} Rows
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="orange">
                {invoiceStats.pendingPrint} Pending
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="green">
                {invoiceStats.printedCount} Printed
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="red">
                {invoiceStats.canceledCount} Canceled
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="cyan">
                {invoiceStats.totalRemaining} Remaining
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="blue">
                {invoiceStats.totalBilled} Billed
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="teal">
                {invoiceStats.allottedCount} Allotted
              </Badge>
              <TextInput
                size="xs"
                radius="md"
                w={240}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search invoice, party, SKU..."
                leftSection={<Search size={14} />}
              />
              <ActionIcon
                size="sm"
                radius="md"
                variant="light"
                color="gray"
                onClick={() =>
                  void loadInvoiceRows({
                    search,
                    status: statusFilter,
                    fromDate,
                    toDate,
                  })
                }
                loading={isRowsLoading}
                aria-label="Refresh inward data"
              >
                <RefreshCw size={14} />
              </ActionIcon>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                onClick={handleExportExcel}
                loading={isExporting}
              >
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<Upload className="h-3.5 w-3.5" />}
              >
                Upload Excel
              </Button>
              <Button
                size="sm"
                onClick={openCreateInvoice}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                New Row
              </Button>
            </Group>
          }
          contentClassName="p-0"
        >
          <MantineDataTable<InvoiceSummary>
            data={invoiceSummaries}
            columns={columns}
            rowKey={(row) => row.invoiceKey}
            isLoading={isLoading || isRowsLoading}
            pageSize={25}
            fontSize={isLargeScreen ? 14 : 12}
            emptyIcon={FileText}
            emptyTitle="No inward invoices"
            emptyDescription="No inward invoices match current search or filter."
            itemLabel="invoices"
            resetPageKey={`${search}-${statusFilter}-${fromDate}-${toDate}`}
            onRowClick={(row) => setSelectedInvoiceSummary(row)}
          />
        </OperationsPanel>
      </Stack>

      <InwardInvoiceModal
        isOpen={invoiceModalOpen}
        editingInvoice={editingInvoice}
        invoiceForm={invoiceForm}
        invoiceLines={invoiceLines}
        inwardEntryMode={inwardEntryMode}
        invoiceManufacturerOptions={invoiceManufacturerOptions}
        invoicePartyOptions={invoicePartyOptions}
        invoiceManufacturerSearch={invoiceManufacturerSearch}
        invoicePartySearch={invoicePartySearch}
        productOptions={productOptions}
        productSearch={productSearch}
        skippedRowCount={invoiceUploadSkippedRows.length}
        isInvoiceLineUploading={isInvoiceLineUploading}
        isSavingInvoice={isSavingInvoice}
        onClose={resetInvoiceModal}
        onSubmit={handleInvoiceSubmit}
        onInvoiceFormChange={setInvoiceForm}
        onInvoiceLinesChange={setInvoiceLines}
        onEntryModeChange={handleInwardEntryModeChange}
        onManufacturerSearchChange={setInvoiceManufacturerSearch}
        onPartySearchChange={setInvoicePartySearch}
        onProductSearchChange={setProductSearch}
        onAddLine={handleAddInvoiceLine}
        onDownloadThirdPartyTemplate={handleDownloadThirdPartyLineTemplate}
        onDownloadSkippedRows={handleDownloadSkippedInvoiceLines}
        onThirdPartyLineUpload={(event) =>
          void handleThirdPartyLineUpload(event)
        }
        getProductLabel={getProductLabel}
      />

      <InwardUploadModal
        isOpen={isUploadModalOpen}
        uploadFile={uploadFile}
        uploadSkippedErrors={uploadSkippedErrors}
        isUploading={isUploading}
        onClose={closeUploadModal}
        onDownloadTemplate={handleDownloadTemplate}
        onFileSelect={handleFileSelect}
        onOpenSkippedRows={() => setIsUploadSkippedModalOpen(true)}
        onDownloadSkippedRows={handleDownloadUploadSkippedRows}
        onUpload={handleUpload}
      />

      <InwardSkippedRowsModal
        isOpen={isUploadSkippedModalOpen}
        uploadSkippedErrors={uploadSkippedErrors}
        onClose={() => setIsUploadSkippedModalOpen(false)}
        onDownloadSkippedRows={handleDownloadUploadSkippedRows}
        onReupload={handleReuploadFromSkippedRows}
      />

      <Modal
        isOpen={Boolean(selectedInvoiceSummary)}
        onClose={() => setSelectedInvoiceSummary(null)}
        title="Invoice Items"
        size="xxl"
        footer={
          <Group justify="space-between">
            <Group gap="xs">
              <Button
                variant="outline"
                color="red"
                disabled={
                  !selectedInvoiceSummary ||
                  isInvoiceCanceled(selectedInvoiceSummary)
                }
                onClick={() => {
                  setCancelInvoiceSummary(selectedInvoiceSummary);
                  setCancelRemark("");
                }}
              >
                Cancel Invoice
              </Button>
              <Button
                variant="light"
                color="cyan"
                leftIcon={<Layers size={14} />}
                disabled={
                  !selectedInvoiceSummary ||
                  isInvoiceCanceled(selectedInvoiceSummary) ||
                  selectedInvoiceSummary.items.every(
                    (item) => item.printed || item.billedQty <= 0,
                  )
                }
                onClick={openPrintAllSizePicker}
              >
                Print All
              </Button>
            </Group>
            <Button
              variant="outline"
              onClick={() => setSelectedInvoiceSummary(null)}
            >
              Close
            </Button>
          </Group>
        }
      >
        {selectedInvoiceSummary ? (
          <Stack gap="md">
            <Paper radius="md" p="sm" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Text size="xs" fw={800} ff="monospace" c="cyan.3">
                    {selectedInvoiceSummary.invoiceNumber}
                  </Text>
                  <Text size="sm" fw={700}>
                    {selectedInvoiceSummary.partyName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {format(
                      new Date(selectedInvoiceSummary.invoiceDate),
                      "dd MMM yyyy",
                    )}
                  </Text>
                </Stack>
                <Group gap="xs">
                  <Badge variant="light" color="blue">
                    {selectedInvoiceSummary.productCount} Items
                  </Badge>
                  <Badge variant="light" color="cyan">
                    {selectedInvoiceSummary.totalBilledQty} Billed
                  </Badge>
                  <Badge
                    variant="light"
                    color={
                      selectedInvoiceSummary.totalRemainingAllocation > 0
                        ? "orange"
                        : "green"
                    }
                  >
                    {selectedInvoiceSummary.totalRemainingAllocation} Remaining
                  </Badge>
                </Group>
              </Group>
            </Paper>

            <MantineDataTable<PoInvoice>
              data={selectedInvoiceSummary.items}
              columns={[
                {
                  key: "sku",
                  header: "SKU",
                  sortable: true,
                  sortAccessor: (row) => row.skuCode,
                  render: (row) => (
                    <Text size="11px" ff="monospace" fw={700} c="cyan.2">
                      {row.skuCode || "N/A"}
                    </Text>
                  ),
                  width: 170,
                },
                {
                  key: "product",
                  header: "Product",
                  sortable: true,
                  sortAccessor: (row) => row.productName,
                  render: (row) => (
                    <Text size="xs" fw={600} maw={260}>
                      {row.productName}
                    </Text>
                  ),
                },
                {
                  key: "billedQty",
                  header: "Billed Qty.",
                  align: "right",
                  sortable: true,
                  sortAccessor: (row) => row.billedQty,
                  render: (row) => <Text size="xs">{row.billedQty}</Text>,
                  width: 90,
                },
                {
                  key: "mrp",
                  header: "MRP",
                  align: "right",
                  sortable: true,
                  sortAccessor: (row) => row.mrp ?? 0,
                  render: (row) => (
                    <Text size="xs" fw={700}>
                      {row.mrp ? `Rs ${Number(row.mrp).toFixed(2)}` : "-"}
                    </Text>
                  ),
                  width: 100,
                },
                {
                  key: "remainingQty",
                  header: "Remaining",
                  align: "right",
                  sortable: true,
                  sortAccessor: (row) => row.remainingAllocation,
                  render: (row) => (
                    <Text
                      size="xs"
                      c={row.remainingAllocation > 0 ? "orange.3" : "green.3"}
                    >
                      {row.remainingAllocation}
                    </Text>
                  ),
                  width: 90,
                },
                {
                  key: "status",
                  header: "Sticker",
                  sortable: true,
                  sortAccessor: (row) =>
                    isInvoiceCanceled(selectedInvoiceSummary)
                      ? "Canceled"
                      : getStickerStatus(row),
                  render: (row) => {
                    const status = isInvoiceCanceled(selectedInvoiceSummary)
                      ? "Canceled"
                      : getStickerStatus(row);
                    return (
                      <Stack gap={2}>
                        <Badge
                          size="sm"
                          variant="light"
                          color={
                            status === "Canceled"
                              ? "red"
                              : row.printed
                                ? "green"
                                : "orange"
                          }
                        >
                          {status === "Canceled"
                            ? "Canceled"
                            : row.printed
                              ? "Printed"
                              : "Pending"}
                        </Badge>
                        {status === "Canceled" && selectedInvoiceSummary.cancelRemark ? (
                          <Text size="10px" c="dimmed" lineClamp={1}>
                            {selectedInvoiceSummary.cancelRemark}
                          </Text>
                        ) : null}
                      </Stack>
                    );
                  },
                  width: 110,
                },
                {
                  key: "actions",
                  header: "Action",
                  align: "right",
                  render: (row) => (
                    <Group justify="flex-end" wrap="nowrap">
                      <Tooltip label="Print sticker">
                        <ActionIcon
                          size="sm"
                          radius="md"
                          variant="light"
                          color="cyan"
                          disabled={isInvoiceCanceled(selectedInvoiceSummary)}
                          onClick={(e) => {
                            e.stopPropagation();
                            openPrintForRow(row);
                          }}
                          aria-label="Print sticker"
                        >
                          <Printer size={15} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ),
                  width: 80,
                },
              ]}
              rowKey={(row) => row.id}
              emptyIcon={FileText}
              emptyTitle="No invoice items"
              emptyDescription="This invoice does not have any items."
              itemLabel="items"
              enablePagination={false}
              minWidth={860}
              onRowClick={(row) => openPrintForRow(row)}
            />
          </Stack>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(cancelInvoiceSummary)}
        onClose={() => {
          setCancelInvoiceSummary(null);
          setCancelRemark("");
        }}
        title="Cancel PO Invoice"
        size="md"
        footer={
          <Group justify="flex-end">
            <Button
              variant="outline"
              onClick={() => {
                setCancelInvoiceSummary(null);
                setCancelRemark("");
              }}
            >
              Close
            </Button>
            <Button
              color="red"
              onClick={() => void handleCancelInvoice()}
              loading={isCancelingInvoice}
            >
              Cancel Invoice
            </Button>
          </Group>
        }
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This will cancel every row under invoice{" "}
            <Text component="span" fw={800} c="red.3">
              {cancelInvoiceSummary?.invoiceNumber}
            </Text>
            . Reason is required.
          </Text>
          <Textarea
            label="Cancel Reason"
            minRows={3}
            autosize
            value={cancelRemark}
            onChange={(event) => setCancelRemark(event.currentTarget.value)}
            placeholder="Enter reason for canceling this PO invoice"
          />
        </Stack>
      </Modal>

      <Modal
        isOpen={Boolean(selectedPrintRow)}
        onClose={() => setSelectedPrintRow(null)}
        title="Sticker Print"
        size="xxl"
      >
        {selectedPrintRow ? (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Stack gap="sm">
              <Paper radius="md" p="sm" withBorder>
                <Text size="xs" fw={800} mb="xs">
                  Sticker Options
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  <Box>
                    <Text size="10px" fw={800} c="dimmed" mb={5}>
                      SIZE
                    </Text>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      radius="md"
                      value={stickerSize}
                      onChange={setStickerSize}
                      data={[
                        { value: "25x25", label: "25x25" },
                        { value: "38x38", label: "38x38" },
                        { value: "50x50", label: "50x50" },
                        { value: "60x60", label: "60x60" },
                        { value: "75x75", label: "75x75" },
                      ]}
                    />
                  </Box>
                  {stickerSize !== "25x25" ? (
                    <Box>
                      <Text size="10px" fw={800} c="dimmed" mb={5}>
                        LABEL MODE
                      </Text>
                      <Radio.Group
                        value={stickerType}
                        onChange={(value) =>
                          setStickerType(value as StickerMode)
                        }
                      >
                        <Stack gap={6}>
                          <Radio
                            value="Combined"
                            label={labelModeText.Combined}
                            size="xs"
                          />
                          <Radio
                            value="Separate"
                            label={labelModeText.Separate}
                            size="xs"
                          />
                          <Radio
                            value="Manufacture"
                            label={labelModeText.Manufacture}
                            size="xs"
                          />
                        </Stack>
                      </Radio.Group>
                    </Box>
                  ) : (
                    <Box>
                      <Text size="10px" fw={800} c="dimmed">
                        TEMPLATE
                      </Text>
                      <Text size="xs" fw={700} lineClamp={1} mt={4}>
                        {activeTemplate?.name || "Template missing"}
                      </Text>
                    </Box>
                  )}
                  {stickerSize !== "25x25" && stickerType === "Manufacture" ? (
                    <Box>
                      <Text size="10px" fw={800} c="dimmed">
                        MANUFACTURER
                      </Text>
                      <Text size="xs" fw={700} lineClamp={1} mt={4}>
                        {selectedProduct?.manufacturer?.name ||
                          manufacturers.find(
                            (item) => String(item.id) === manufacturerId,
                          )?.name ||
                          "Mapped from product"}
                      </Text>
                    </Box>
                  ) : null}
                  {stickerSize !== "25x25" && stickerType !== "Manufacture" ? (
                    <Select
                      label="Importer / Marketing Company"
                      size="xs"
                      radius="md"
                      placeholder="Select importer from importer master"
                      value={importerId}
                      onChange={setImporterId}
                      searchable
                      searchValue={importerSearch}
                      onSearchChange={setImporterSearch}
                      clearable
                      data={importerOptions}
                      description={
                        selectedImporter
                          ? `${selectedImporter.phone || "No phone"} • ${selectedImporter.email || "No email"}`
                          : "This importer fills company name, address, phone and email on Imported & Marketed By stickers."
                      }
                    />
                  ) : null}
                </SimpleGrid>
                <TextInput
                  label="Note"
                  size="xs"
                  radius="md"
                  mt="sm"
                  placeholder="Optional note for sticker"
                  value={stickerNote}
                  onChange={(event) =>
                    setStickerNote(event.currentTarget.value)
                  }
                />
              </Paper>

              <Paper radius="md" p="sm" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Text size="xs" fw={800} ff="monospace">
                      {selectedPrintRow.invoiceNumber}
                    </Text>
                    <Text size="sm" fw={700} mt={2}>
                      {selectedPrintRow.partyName}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      {format(
                        new Date(selectedPrintRow.invoiceDate),
                        "dd MMM yyyy",
                      )}
                    </Text>
                  </Box>
                  <Badge
                    color={rowStatusColor(selectedPrintRow.printed)}
                    variant={selectedPrintRow.printed ? "light" : "filled"}
                  >
                    {selectedPrintRow.printed ? "Printed" : "Pending"}
                  </Badge>
                </Group>
                <Divider my="sm" />
                <Text size="xs" c="dimmed">
                  SKU
                </Text>
                <Text size="sm" fw={800} ff="monospace" c="cyan.3">
                  {selectedPrintRow.skuCode}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Product
                </Text>
                <Text size="sm" fw={700}>
                  {selectedPrintRow.productName}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Product master
                </Text>
                <Text size="xs">
                  {selectedProduct?.name || "Not matched"} -{" "}
                  {selectedProduct?.unitType || "No unit"}
                </Text>
              </Paper>

              <Paper radius="md" p="sm" withBorder>
                <SimpleGrid cols={3} spacing="xs">
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      SIZE
                    </Text>
                    <Text size="xs" fw={800}>
                      {stickerSize}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      MODE
                    </Text>
                    <Text size="xs" fw={800}>
                      {labelModeText[stickerType]}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      QTY
                    </Text>
                    <Text size="xs" fw={800}>
                      {selectedPrintRow.billedQty}
                    </Text>
                  </Box>
                </SimpleGrid>
              </Paper>
            </Stack>

            <Stack gap="sm">
              <Paper radius="md" p="sm" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text size="xs" fw={800}>
                    Preview
                  </Text>
                  <Badge size="xs" variant="light" color="cyan">
                    {activeTemplate?.fileName || "Template missing"}
                  </Badge>
                </Group>
                {isPreviewLoading ? (
                  <Center h={300}>
                    <Loader size="sm" />
                  </Center>
                ) : previewUrl ? (
                  <Center h={300}>
                    <Image
                      src={previewUrl}
                      alt="Sticker preview"
                      fit="contain"
                      mah={280}
                      radius="sm"
                      style={{ background: "white", padding: 12 }}
                    />
                  </Center>
                ) : (
                  <Paper
                    withBorder
                    radius="md"
                    p="xl"
                    style={{ textAlign: "center" }}
                  >
                    <Tag size={48} style={{ marginBottom: 12 }} />
                    <Text fw={700} size="lg" mb="xs" c={selectedProduct && validateProductForSticker(selectedProduct, stickerSize).length > 0 ? "red.4" : undefined}>
                      {selectedProduct && validateProductForSticker(selectedProduct, stickerSize).length > 0
                        ? "Missing Product Data"
                        : "No preview"}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {selectedProduct && validateProductForSticker(selectedProduct, stickerSize).length > 0
                        ? `Please fill missing product fields: ${validateProductForSticker(selectedProduct, stickerSize).join(", ")}`
                        : "Preview not available for this row."}
                    </Text>
                  </Paper>
                )}
              </Paper>

              <Paper radius="md" p="sm" withBorder>
                <Text size="xs" fw={800} mb="xs">
                  Reprint Range
                </Text>
                <SimpleGrid cols={2} spacing="xs">
                  <NumberInput
                    size="xs"
                    label="From sticker"
                    min={1}
                    max={selectedPrintRow.billedQty}
                    value={reprintFrom}
                    disabled={!selectedPrintRow.printed}
                    onChange={(value) =>
                      setReprintFrom(typeof value === "number" ? value : "")
                    }
                  />
                  <NumberInput
                    size="xs"
                    label="To sticker"
                    min={1}
                    max={selectedPrintRow.billedQty}
                    value={reprintTo}
                    disabled={!selectedPrintRow.printed}
                    onChange={(value) =>
                      setReprintTo(typeof value === "number" ? value : "")
                    }
                  />
                </SimpleGrid>
                <Group mt="sm" grow>
                  <Button
                    size="xs"
                    variant="outline"
                    leftIcon={<Printer size={14} />}
                    onClick={() => void handlePrint("reprint")}
                    loading={isPrinting}
                    disabled={!selectedPrintRow.printed || selectedPrintRow.billedQty <= 0}
                  >
                    Reprint Range
                  </Button>
                  <Button
                    size="xs"
                    leftIcon={<Printer size={14} />}
                    onClick={() => void handlePrint("normal")}
                    loading={isPrinting}
                    disabled={selectedPrintRow.printed || selectedPrintRow.billedQty <= 0}
                  >
                    Print Full Qty
                  </Button>
                </Group>
              </Paper>
            </Stack>
          </SimpleGrid>
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Row"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Print All - Size Picker Modal */}
      <Modal
        isOpen={printAllSizePickerOpen}
        onClose={() => setPrintAllSizePickerOpen(false)}
        title="Print All Stickers"
        size="md"
        footer={
          <Group justify="flex-end">
            <Button
              variant="outline"
              onClick={() => setPrintAllSizePickerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              leftIcon={<Printer size={14} />}
              onClick={() => void handlePrintAll()}
            >
              Start Printing
            </Button>
          </Group>
        }
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            This will print stickers for all{" "}
            <Text component="span" fw={800} c="cyan.3">
              {selectedInvoiceSummary?.items.filter(
                (item) => !item.printed && item.billedQty > 0,
              ).length || 0}
            </Text>{" "}
            unprinted items in invoice{" "}
            <Text component="span" fw={800} ff="monospace" c="cyan.3">
              {selectedInvoiceSummary?.invoiceNumber}
            </Text>
            . Label mode will be set to Combined.
          </Text>
          <Paper radius="md" p="md" withBorder bg="transparent">
            <Text size="10px" fw={800} c="dimmed" mb={8} tt="uppercase">
              Sticker Size
            </Text>
            <SegmentedControl
              fullWidth
              size="sm"
              radius="md"
              value={printAllSize}
              onChange={setPrintAllSize}
              data={[
                { value: "25x25", label: "25×25" },
                { value: "38x38", label: "38×38" },
                { value: "50x50", label: "50×50" },
                { value: "60x60", label: "60×60" },
                { value: "75x75", label: "75×75" },
              ]}
            />
          </Paper>
        </Stack>
      </Modal>

      {/* Print All - Progress Modal */}
      <Modal
        isOpen={printAllProgressOpen}
        onClose={() => {
          if (!printAllDone) {
            cancelledRef.current = true;
            setPrintAllCancelled(true);
          } else {
            setPrintAllProgressOpen(false);
          }
        }}
        title="Printing All Stickers"
        size="lg"
        footer={
          <Group justify="flex-end">
            {!printAllDone ? (
              <Button
                variant="outline"
                color="red"
                disabled={printAllCancelled}
                onClick={() => {
                  cancelledRef.current = true;
                  setPrintAllCancelled(true);
                }}
              >
                {printAllCancelled ? "Canceling..." : "Cancel"}
              </Button>
            ) : (
              <Button onClick={() => setPrintAllProgressOpen(false)}>
                Close
              </Button>
            )}
          </Group>
        }
      >
        <Stack gap="md">
          <Paper radius="md" p="md" withBorder bg="transparent">
            <Group justify="space-between" mb="xs">
              <Text size="xs" fw={800} c="dimmed" tt="uppercase">
                Progress
              </Text>
              <Badge
                size="sm"
                variant="light"
                color={printAllDone ? "green" : "cyan"}
              >
                {printAllCurrent} / {printAllTotal}
              </Badge>
            </Group>
            <Progress
              value={
                printAllTotal > 0
                  ? (printAllCurrent / printAllTotal) * 100
                  : 0
              }
              size="lg"
              radius="md"
              color={printAllDone ? "green" : "cyan"}
              animated={!printAllDone}
              striped={!printAllDone}
            />
            {!printAllDone ? (
              <Text size="xs" c="dimmed" mt="xs" lineClamp={1}>
                Printing: {printAllCurrentProduct}
              </Text>
            ) : (
              <Text
                size="xs"
                fw={700}
                mt="xs"
                c={
                  printAllErrors.length > 0
                    ? "orange.3"
                    : "green.3"
                }
              >
                {printAllCancelled
                  ? "Print All was canceled"
                  : printAllErrors.length > 0
                    ? `Done with ${printAllErrors.length} error(s)`
                    : "All items printed successfully!"}
              </Text>
            )}
          </Paper>

          {printAllErrors.length > 0 ? (
            <Paper radius="md" p="md" withBorder bg="rgba(239, 68, 68, 0.06)">
              <Text size="xs" fw={800} c="red.4" mb="xs" tt="uppercase">
                Errors ({printAllErrors.length})
              </Text>
              <Stack gap={4} mah={200} style={{ overflowY: "auto" }}>
                {printAllErrors.map((error, index) => (
                  <Text key={`${error}-${index}`} size="xs" c="red.3">
                    • {error}
                  </Text>
                ))}
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Modal>
    </OperationsPage>
  );
});

export default Inward;
