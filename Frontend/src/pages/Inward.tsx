import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  ArrowDownToLine,
  CircleCheck,
  CircleX,
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
import { ProductUpdateModal } from "../components/organisms/ProductUpdateModal";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { StickerPrintModal } from "../components/organisms/StickerPrintModal";
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
import { findMarketingCompanyForProduct } from "../utils/stickerMarketingCompany";
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
type InwardStatusFilter =
  | "all"
  | "open"
  | "printed"
  | "verified"
  | "putaway"
  | "closed"
  | "canceled";
type StickerMode = StickerTemplate["type"];
type InvoiceSummary = PoInvoiceHeaderSummary & {
  invoiceKey: string;
};
type InvoiceUploadSkippedRow = {
  rowNumber: number;
  skuCode: string;
  quantity: string;
  reason: string;
};

const INVOICE_PAGE_SIZE = 100;
const EXPORT_PAGE_SIZE = 50000;

const isInvoiceCanceled = (summary?: Pick<InvoiceSummary, "status"> | null) =>
  summary?.status === "Canceled";
const inwardStatusTone: Record<InvoiceSummary["status"], string> = {
  Open: "blue",
  Printed: "green",
  Verified: "cyan",
  "Put Away": "violet",
  Closed: "gray",
  Canceled: "red",
};
const hasInvoicePutAwayStarted = (summary?: Pick<InvoiceSummary, "items"> | null) =>
  summary?.items.some((item) => item.remainingAllocation < item.billedQty || item.locationAllotted) ?? false;
const getStickerStatus = (row: PoInvoice) =>
  row.printed ? "Printed" : "Pending";

const toDateInputValue = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};
const getDefaultDateRange = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 14);

  return {
    fromDate: toDateInputValue(from),
    toDate: toDateInputValue(to),
  };
};
const getLast30DayRange = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 30);

  return {
    fromDate: toDateInputValue(from),
    toDate: toDateInputValue(to),
  };
};

const stickerModeLabel: Record<StickerMode, string> = {
  Combined: "Imported & Marketed By",
  Separate: "Marketed / Imported",
  Manufacture: "Marketed By / Manufacture By",
};

const emptyInvoiceForm = (): CreatePoInvoiceDto => ({
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  partyName: "",
  productId: 0,
  billedQty: 0,
  mrp: null,
});

export const Inward = memo(function Inward() {
  const navigate = useNavigate();
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
  const [invoicePage, setInvoicePage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<InwardStatusFilter>("open");
  const defaultRange = getDefaultDateRange();
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);

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
  const [isProductUpdateOpen, setIsProductUpdateOpen] = useState(false);
  const [invoiceManufacturerSearch, setInvoiceManufacturerSearch] = useState("");
  const [invoicePartySearch, setInvoicePartySearch] = useState("");

  const [printAllSizePickerOpen, setPrintAllSizePickerOpen] = useState(false);
  const [printAllSize, setPrintAllSize] = useState("50x50");
  const [printAllType, setPrintAllType] = useState<StickerMode>("Combined");
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProductLookup(productSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadProductLookup, productSearch]);

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
    void loadData();
  }, [loadData]);

  const withInvoiceKey = useCallback(
    (row: PoInvoiceHeaderSummary): InvoiceSummary => ({
      ...row,
      invoiceKey: `${row.invoiceNumber}__${row.invoiceDate}__${row.partyName}`,
    }),
    [],
  );

  const loadInvoiceRows = useCallback(async (filters: PoInvoiceFilters) => {
    try {
      setIsRowsLoading(true);
      const result = await poInvoicesApi.getHeaders({
        ...filters,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? INVOICE_PAGE_SIZE,
      });
      const summaries: InvoiceSummary[] = result.data.map((row) => withInvoiceKey(row));
      setInvoiceSummaries(summaries);
      setPoInvoices(summaries.flatMap((row) => row.items));
      setPagination(result.pagination);
    } catch {
      toast.error("Failed to load inward rows");
    } finally {
      setIsRowsLoading(false);
    }
  }, [withInvoiceKey]);

  useEffect(() => {
    const fetchRows = () => {
      void loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
        page: invoicePage,
        pageSize: INVOICE_PAGE_SIZE,
      });
    };

    fetchRows();

    const interval = setInterval(() => {
      fetchRows();
    }, 30000);

    return () => clearInterval(interval);
  }, [fromDate, invoicePage, loadInvoiceRows, search, statusFilter, toDate]);

  const handleInvoicePageChange = useCallback((page: number) => {
    setInvoicePage(page);
  }, []);

  const productOptions = useMemo(
    () => {
      const selectedManufacturerName =
        inwardEntryMode === "manufacturer"
          ? invoiceForm.partyName.trim().toLowerCase()
          : "";

      const selectedManufacturer = selectedManufacturerName
        ? manufacturers.find(
          (item) => item.name.trim().toLowerCase() === selectedManufacturerName,
        )
        : null;

      return products
        .filter((product) => {
          if (!selectedManufacturerName) return true;

          const productManufacturerName = product.manufacturer?.name
            ?.trim()
            .toLowerCase();

          return (
            productManufacturerName === selectedManufacturerName ||
            Boolean(
              selectedManufacturer &&
              product.manufacturerId === selectedManufacturer.id,
            )
          );
        })
        .map((product) => ({
          value: product.id,
          label: `${product.sku || "NO-SKU"} - ${product.name}`,
          sku: product.sku || "",
          alias: product.alias || "",
          mrp: product.mrp ?? null,
        }));
    },
    [inwardEntryMode, invoiceForm.partyName, manufacturers, products],
  );

  const handleProductLookupByCode = useCallback(async (value: string) => {
    try {
      const lookup = await productsApi.lookup(value);
      const product = lookup.product;
      if (!product?.id) return null;

      setProducts((current) => {
        if (current.some((item) => item.id === product.id)) return current;
        return [product, ...current];
      });

      return {
        value: product.id,
        label: `${product.sku || "NO-SKU"} - ${product.name}`,
        sku: product.sku || "",
        alias: product.alias || "",
        mrp: product.mrp ?? null,
      };
    } catch {
      return null;
    }
  }, []);

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
      header: "Inv No.",
      sortable: true,
      sortAccessor: (row) => row.invoiceNumber,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "11px"} ff="monospace" c="cyan.2" fw={700} lineClamp={1}>
          {row.invoiceNumber}
        </Text>
      ),
      width: 100,
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
      width: 180,
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortAccessor: (row) => row.invoiceDate,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"} fw={500} lineClamp={1}>
          {format(new Date(row.invoiceDate), "dd MMM yyyy")}
        </Text>
      ),
      width: 100,
    },
    {
      key: "partyName",
      header: "Party",
      sortable: true,
      sortAccessor: (row) => row.partyName,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"} lineClamp={1} maw={160}>
          {row.partyName || "N/A"}
        </Text>
      ),
      width: 100,
    },
    {
      key: "billed",
      header: "Qty",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.totalBilledQty,
      render: (row) => (
        <Text size={isLargeScreen ? "sm" : "xs"} fw={800} c="cyan.3">
          {row.totalBilledQty}
        </Text>
      ),
      width: 70,
    },

    {
      key: "missing",
      header: "Data",
      align: "center",
      sortable: true,
      sortAccessor: (row) => (row.items.some((item) => item.hasMissingData) ? 1 : 0),
      render: (row) => {
        const hasMissing = row.items.some((item) => item.hasMissingData);
        return (
          <Tooltip label={hasMissing ? "Some products have missing sticker data" : "All products ready for printing"}>
            <Center>
              {hasMissing ? (
                <CircleX size={18} color="var(--mantine-color-red-5)" />
              ) : (
                <CircleCheck size={18} color="var(--mantine-color-green-5)" />
              )}
            </Center>
          </Tooltip>
        );
      },
      width: 60,
    },
    {
      key: "printed",
      header: "Status",
      sortable: true,
      sortAccessor: (row) => row.status,
      render: (row) => {
        return (
          <Badge
            size="sm"
            radius="md"
            variant="light"
            color={inwardStatusTone[row.status]}
          >
            {row.status}
          </Badge>
        );
      },
      width: 100,
    },
    {
      key: "actions",
      header: "View",
      align: "right",
      render: (row) => (
        <Tooltip label="View products">
          <ActionIcon
            size="sm"
            radius="md"
            variant="light"
            color="cyan"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedInvoiceSummary(row);
            }}
            aria-label="View invoice products"
          >
            <Eye size={15} />
          </ActionIcon>
        </Tooltip>
      ),
      width: 70,
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

  const openProductUpdateFromSticker = useCallback(() => {
    if (!selectedProduct) {
      toast.error("Product master not loaded for this SKU");
      return;
    }

    setIsProductUpdateOpen(true);
  }, [selectedProduct]);

  const handleStickerProductSaved = useCallback((product: Product) => {
    setSelectedProduct(product);
    setProducts((current) => {
      if (current.some((item) => item.id === product.id)) {
        return current.map((item) => (item.id === product.id ? product : item));
      }

      return [product, ...current];
    });
  }, []);

  const handleStickerPrintComplete = useCallback(async () => {
    if (!selectedPrintRow) return;

    await poInvoicesApi.markPrinted([selectedPrintRow.id]);
    await loadInvoiceRows({
      search,
      status: statusFilter,
      fromDate,
      toDate,
      page: invoicePage,
      pageSize: INVOICE_PAGE_SIZE,
    });
    setSelectedPrintRow((current) =>
      current ? { ...current, printed: true } : current,
    );
  }, [
    fromDate,
    invoicePage,
    loadInvoiceRows,
    search,
    selectedPrintRow,
    statusFilter,
    toDate,
  ]);
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

  const handleAddInvoiceLine = async () => {
    if (!invoiceForm.productId) {
      toast.error("Select product first");
      return;
    }

    if (!invoiceForm.billedQty || invoiceForm.billedQty <= 0) {
      toast.error("Billed quantity must be greater than zero");
      return;
    }

    let product = products.find((item) => item.id === invoiceForm.productId);
    if (!product) {
      try {
        product = await productsApi.getById(invoiceForm.productId);
        setProducts((current) => {
          if (current.some((item) => item.id === product!.id)) return current;
          return [...current, product!];
        });
      } catch {
        // Fallback
      }
    }

    const sku = product?.sku || "";
    const productName = product?.name || `Product #${invoiceForm.productId}`;

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
          sku,
          productName,
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
            sku: lookup.product.sku || "",
            productName: lookup.product.name,
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
        await poInvoicesApi.createWithItems({
          invoiceNumber: invoiceForm.invoiceNumber,
          invoiceDate: invoiceForm.invoiceDate,
          partyName: invoiceForm.partyName,
          items: invoiceLines.map((line) => ({
            productId: line.productId,
            billedQty: line.billedQty,
            mrp: line.mrp ?? null,
          })),
        });
        toast.success(`PO invoice created with ${invoiceLines.length} product${invoiceLines.length === 1 ? "" : "s"}`);
      }
      await loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
        page: invoicePage,
        pageSize: INVOICE_PAGE_SIZE,
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
        page: invoicePage,
        pageSize: INVOICE_PAGE_SIZE,
      });
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete row");
    } finally {
      setIsDeleting(false);
    }
  };

  const buildExportRows = useCallback((summaries: InvoiceSummary[]) => {
    return summaries.flatMap((invoice) => {
      if (!invoice.items || invoice.items.length === 0) {
        return [{
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          partyName: invoice.partyName,
          skuCode: "",
          mrp: "",
          productName: "",
          billedQty: invoice.totalBilledQty,
        }];
      }

      return invoice.items.map((item) => ({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        partyName: invoice.partyName,
        skuCode: item.skuCode,
        mrp: item.mrp ?? "",
        productName: item.productName,
        billedQty: item.billedQty,
      }));
    });
  }, []);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const firstResult = await poInvoicesApi.getHeaders({
        search,
        status: statusFilter,
        fromDate,
        toDate,
        page: 1,
        pageSize: EXPORT_PAGE_SIZE,
      });
      const allSummaries = firstResult.data.map(withInvoiceKey);
      const totalPages = Math.max(
        1,
        Math.ceil(firstResult.pagination.total / EXPORT_PAGE_SIZE),
      );

      for (let page = 2; page <= totalPages; page += 1) {
        const result = await poInvoicesApi.getHeaders({
          search,
          status: statusFilter,
          fromDate,
          toDate,
          page,
          pageSize: EXPORT_PAGE_SIZE,
        });
        allSummaries.push(...result.data.map(withInvoiceKey));
      }

      exportToExcel({
        fileName: "Inward_Invoices",
        sheets: [{
          sheetName: "Invoices",
          data: buildExportRows(allSummaries),
          columns: [
            { header: "Inv No.", accessor: (row) => row.invoiceNumber },
            { header: "Inv. Date", accessor: (row) => formatExcelDate(row.invoiceDate) },
            { header: "Party Name", accessor: (row) => row.partyName },
            { header: "Part No.", accessor: (row) => row.skuCode },
            { header: "MRP", accessor: (row) => row.mrp, format: "currency" },
            { header: "Item Name", accessor: (row) => row.productName },
            { header: "Qty", accessor: (row) => row.billedQty, format: "number" },
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
        page: invoicePage,
        pageSize: INVOICE_PAGE_SIZE,
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
        setStatusFilter("open");
        // Maintain current date selection for pagination
        setInvoicePage(1);
        await loadData();
        await loadInvoiceRows({
          search: "",
          status: "open",
          fromDate,
          toDate,
          page: 1,
          pageSize: INVOICE_PAGE_SIZE,
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
    setPrintAllType("Combined");
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

    if (printAllSize !== "25x25" && importers.length === 0) {
      toast.error("Importer master has no records. Please add an importer before printing Imported & Marketed By stickers.");
      return;
    }

    const template = templates.find(
      (t) => t.size === printAllSize && t.type === printAllType,
    );
    if (!template) {
      toast.error(
        `Sticker template not found for selected size (${stickerModeLabel[printAllType]})`,
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

        const rowMarketingCompany = printAllSize !== "25x25"
          ? findMarketingCompanyForProduct(product, importers)
          : null;
        if (printAllSize !== "25x25" && !rowMarketingCompany) {
          setPrintAllErrors((prev) => [
            ...prev,
            `${row.skuCode}: Marketing company not found for ownership ${product.ownership || "-"}`,
          ]);
          continue;
        }

        const payload = {
          productId: row.productId,
          importerId: rowMarketingCompany?.id ?? undefined,
          size: printAllSize,
          type: printAllType,
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
        page: invoicePage,
        pageSize: INVOICE_PAGE_SIZE,
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
          <Group align="flex-end" gap={8} wrap="wrap">
            <Select
              size="xs"
              radius="md"
              label="Status"
              w={150}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter((value || "open") as InwardStatusFilter);
                setInvoicePage(1);
              }}
              data={[
                { value: "open", label: "Open" },
                { value: "printed", label: "Printed" },
                { value: "verified", label: "Verified" },
                { value: "putaway", label: "Put Away" },
                { value: "closed", label: "Closed" },
                { value: "canceled", label: "Canceled" },
                { value: "all", label: "All" },
              ]}
            />

            <TextInput
              size="xs"
              radius="md"
              label="From Date"
              type="date"
              w={140}
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.currentTarget.value);
                setInvoicePage(1);
              }}
            />

            <TextInput
              size="xs"
              radius="md"
              label="To Date"
              type="date"
              w={140}
              value={toDate}
              onChange={(event) => {
                setToDate(event.currentTarget.value);
                setInvoicePage(1);
              }}
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
                    const range = getLast30DayRange();
                    setFromDate(range.fromDate);
                    setToDate(range.toDate);
                    setInvoicePage(1);
                  }}
                >
                  Last 30 Days
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    const range = getDefaultDateRange();
                    setFromDate(range.fromDate);
                    setToDate(range.toDate);
                    setStatusFilter("open");
                    setInvoicePage(1);
                  }}
                >
                  Clear
                </Button>
              </Group>
            </Box>
          </Group>
        </OperationsPanel>

        <OperationsPanel
          title="Inward Ledger"
          icon={FileText}
          description="Compact PO invoice view for upload, edit, delete, and downstream sticker or put-away flow."
          action={
            <Group gap="xs" wrap="wrap" justify="flex-end">
              <Badge size="sm" radius="md" variant="light" color="gray">
                {pagination?.total ?? invoiceSummaries.length} Invoices
              </Badge>
              <TextInput
                size="xs"
                radius="md"
                w={{ base: 180, sm: 240 }}
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setInvoicePage(1);
                }}
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
                    page: invoicePage,
                    pageSize: INVOICE_PAGE_SIZE,
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
            pageSize={INVOICE_PAGE_SIZE}
            totalItems={pagination?.total}
            currentPage={invoicePage}
            onPageChange={handleInvoicePageChange}
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
        onProductLookupByCode={handleProductLookupByCode}
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
                title={
                  hasInvoicePutAwayStarted(selectedInvoiceSummary)
                    ? "Cannot cancel after put-away has started"
                    : undefined
                }
                disabled={
                  !selectedInvoiceSummary ||
                  isInvoiceCanceled(selectedInvoiceSummary) ||
                  hasInvoicePutAwayStarted(selectedInvoiceSummary)
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
              rowClassName={(row) => row.hasMissingData ? "bg-red-900/30" : undefined}
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
                  header: "Qty",
                  align: "right",
                  sortable: true,
                  sortAccessor: (row) => row.billedQty,
                  render: (row) => <Text size="xs">{row.billedQty}</Text>,
                  width: 70,
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
                  width: 70,
                },
                {
                  key: "missing",
                  header: "Data",
                  align: "center",
                  sortable: true,
                  sortAccessor: (row) => (row.hasMissingData ? 1 : 0),
                  render: (row) => (
                    <Tooltip label={row.hasMissingData ? "Missing sticker data" : "Ready for printing"}>
                      <Center>
                        {row.hasMissingData ? (
                          <CircleX size={18} color="var(--mantine-color-red-5)" />
                        ) : (
                          <CircleCheck size={18} color="var(--mantine-color-green-5)" />
                        )}
                      </Center>
                    </Tooltip>
                  ),
                  width: 60,
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

      <StickerPrintModal
        isOpen={Boolean(selectedPrintRow)}
        onClose={() => setSelectedPrintRow(null)}
        product={selectedProduct}
        invoiceRow={selectedPrintRow}
        initialManufacturers={manufacturers}
        title="Sticker Print"
        onProductLinkClick={openProductUpdateFromSticker}
        onNormalPrintComplete={handleStickerPrintComplete}
      />

      <ProductUpdateModal
        isOpen={isProductUpdateOpen}
        onClose={() => setIsProductUpdateOpen(false)}
        product={selectedProduct}
        onProductSaved={handleStickerProductSaved}
      />
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
            .
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
          <Paper radius="md" p="md" withBorder bg="transparent">
            <Text size="10px" fw={800} c="dimmed" mb={8} tt="uppercase">
              Sticker Type
            </Text>
            <Radio.Group
              value={printAllType}
              onChange={(value) => setPrintAllType(value as StickerMode)}
            >
              <Stack gap={8}>
                <Radio
                  value="Combined"
                  label={stickerModeLabel.Combined}
                  size="sm"
                />
                <Radio
                  value="Separate"
                  label={stickerModeLabel.Separate}
                  size="sm"
                />
                <Radio
                  value="Manufacture"
                  label={stickerModeLabel.Manufacture}
                  size="sm"
                />
              </Stack>
            </Radio.Group>
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
