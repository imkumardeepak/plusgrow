import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
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
  Radio,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  ArrowDownToLine,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Tag,
  Upload,
} from "lucide-react";
import { toast } from "../lib/toast";

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
  PoInvoiceFilters,
  PoInvoice,
  PaginationInfo,
  Product,
  importersApi,
  manufacturersApi,
  poInvoicesApi,
  productsApi,
} from "../services/masterApi";
import { StickerTemplate, stickersApi } from "../services/stickersApi";
import {
  StickerPrinterConfig,
  stickerPrinterConfigsApi,
} from "../services/stickerPrinterConfigsApi";

type DeleteTarget = { kind: "invoice"; row: PoInvoice } | null;
type InwardStatusFilter = "all" | "pending" | "printed";
type StickerMode = "Combined" | "Separate";

const rowStatusColor = (printed: boolean) => (printed ? "green" : "orange");
const labelModeText: Record<StickerMode, string> = {
  Combined: "Imported & Marketed By",
  Separate: "Marketed / Imported",
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
});

export const Inward = memo(function Inward() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [poInvoices, setPoInvoices] = useState<PoInvoice[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [importers, setImporters] = useState<Importer[]>([]);
  const [templates, setTemplates] = useState<StickerTemplate[]>([]);
  const [printerConfigs, setPrinterConfigs] = useState<StickerPrinterConfig[]>(
    [],
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRowsLoading, setIsRowsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<InwardStatusFilter>("all");
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const [editingInvoice, setEditingInvoice] = useState<PoInvoice | null>(null);

  const [invoiceForm, setInvoiceForm] =
    useState<CreatePoInvoiceDto>(emptyInvoiceForm());

  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
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
  const [manufacturerSearch, setManufacturerSearch] = useState("");
  const [importerSearch, setImporterSearch] = useState("");
  const [reprintFrom, setReprintFrom] = useState<number | "">(1);
  const [reprintTo, setReprintTo] = useState<number | "">(1);
  const [stickerNote, setStickerNote] = useState("");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        productsData,
        manufacturerData,
        importerData,
        templateData,
        configData,
      ] = await Promise.all([
        productsApi.search(""),
        manufacturersApi.getPaged({ page: 1, pageSize: 25 }),
        importersApi.getPaged({ page: 1, pageSize: 25 }),
        stickersApi.getTemplates(),
        stickerPrinterConfigsApi.getAll(),
      ]);

      setProducts(productsData);
      setManufacturers(manufacturerData.data);
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
      void loadImporterLookup(importerSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [importerSearch, loadImporterLookup]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setImporterId(null);
  }, [stickerType]);

  useEffect(() => {
    if (!selectedPrintRow) return;
    setReprintFrom(1);
    setReprintTo(selectedPrintRow.billedQty || 1);
    setStickerNote("");
  }, [selectedPrintRow]);

  const loadInvoiceRows = useCallback(async (filters: PoInvoiceFilters) => {
    try {
      setIsRowsLoading(true);
      const result = await poInvoicesApi.getPaged(filters);
      setPoInvoices(result.data);
      setPagination(result.pagination);
    } catch {
      toast.error("Failed to load inward rows");
    } finally {
      setIsRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoiceRows({
      search,
      status: statusFilter,
      fromDate,
      toDate,
      page,
      pageSize: 25,
    });
  }, [fromDate, loadInvoiceRows, page, search, statusFilter, toDate]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, search, statusFilter, toDate]);

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: `${product.sku || "NO-SKU"} - ${product.name}`,
      })),
    [products],
  );

  const manufacturerOptions = useMemo(
    () =>
      manufacturers.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [manufacturers],
  );

  const importerOptions = useMemo(
    () =>
      importers.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [importers],
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
    const pendingPrint = poInvoices.filter((row) => !row.printed).length;
    const printedCount = poInvoices.length - pendingPrint;
    const totalBilled = poInvoices.reduce((sum, row) => sum + row.billedQty, 0);
    const totalRemaining = poInvoices.reduce(
      (sum, row) => sum + row.remainingAllocation,
      0,
    );
    const allottedCount = poInvoices.filter(
      (row) => row.locationAllotted,
    ).length;

    return {
      pendingPrint,
      printedCount,
      totalBilled,
      totalRemaining,
      allottedCount,
    };
  }, [poInvoices]);

  const columns: DataTableColumn<PoInvoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice No.",
      sortable: true,
      sortAccessor: (row) => row.invoiceNumber,
      render: (row) => (
        <Text size="11px" ff="monospace" c="cyan.2" fw={700} lineClamp={1}>
          {row.invoiceNumber}
        </Text>
      ),
      width: 160,
    },
    {
      key: "product",
      header: "Product Name",
      sortable: true,
      sortAccessor: (row) => row.productName,
      render: (row) => (
        <Text size="xs" fw={600} lineClamp={1} maw={200}>
          {row.productName}
        </Text>
      ),
      width: 200,
    },
    {
      key: "date",
      header: "Invoice Date",
      sortable: true,
      sortAccessor: (row) => row.invoiceDate,
      render: (row) => (
        <Text size="xs" fw={500} lineClamp={1}>
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
        <Text size="xs" lineClamp={1} maw={160}>
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
      sortAccessor: (row) => row.billedQty,
      render: (row) => (
        <Text size="xs" fw={800} c="cyan.3">
          {row.billedQty}
        </Text>
      ),
      width: 90,
    },
    {
      key: "remaining",
      header: "Location Allot Pending",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.remainingAllocation,
      render: (row) => (
        <Text
          size="xs"
          fw={800}
          c={row.remainingAllocation > 0 ? "orange.3" : "green.3"}
        >
          {row.remainingAllocation}
        </Text>
      ),
      width: 140,
    },
    {
      key: "printed",
      header: "Sticker Print",
      sortable: true,
      sortAccessor: (row) => (row.printed ? "1" : "0"),
      render: (row) => (
        <Badge
          size="sm"
          radius="md"
          variant="light"
          color={row.printed ? "green" : "orange"}
        >
          {row.printed ? "Printed" : "Pending"}
        </Badge>
      ),
      width: 130,
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Print sticker">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="cyan"
              onClick={() => setSelectedPrintRow(row)}
              aria-label="Print sticker"
            >
              <Printer size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
      width: 80,
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

  const buildStickerPayload = useCallback(
    (row: PoInvoice, quantity: number) => ({
      productId: row.productId,
      manufacturerId: manufacturerId ? Number(manufacturerId) : undefined,
      importerId:
        stickerType === "Separate" && importerId
          ? Number(importerId)
          : undefined,
      size: stickerSize,
      type: stickerType,
      monthYear: format(new Date(row.invoiceDate), "MMM/yyyy").toUpperCase(),
      batchNumber: row.invoiceNumber,
      note: stickerNote.trim(),
      quantity,
    }),
    [importerId, manufacturerId, stickerNote, stickerSize, stickerType],
  );

  const refreshPreview = useCallback(async () => {
    if (!selectedPrintRow) {
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
  }, [buildStickerPayload, selectedPrintRow]);

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

    const printerAddress = getPrinterAddress();
    if (!printerAddress) {
      toast.error("Active printer profile not found for selected sticker size");
      return;
    }

    const from = Number(reprintFrom || 1);
    const to = Number(reprintTo || from);
    const reprintQuantity = Math.max(1, to - from + 1);
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
          page,
          pageSize: 25,
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
    setInvoiceModalOpen(false);
  };

  const openCreateInvoice = () => {
    setEditingInvoice(null);
    setInvoiceForm(emptyInvoiceForm());
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
    });
    setInvoiceModalOpen(true);
  };

  const handleInvoiceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!invoiceForm.invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return;
    }

    if (!invoiceForm.productId || !invoiceForm.partyName.trim()) {
      toast.error("Party name and product are required");
      return;
    }

    setIsSavingInvoice(true);
    try {
      if (editingInvoice) {
        await poInvoicesApi.update(editingInvoice.id, invoiceForm);
        toast.success("PO invoice updated");
      } else {
        await poInvoicesApi.create(invoiceForm);
        toast.success("PO invoice created");
      }
      await loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
        page,
        pageSize: 25,
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
        page,
        pageSize: 25,
      });
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete row");
    } finally {
      setIsDeleting(false);
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
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const result = await poInvoicesApi.uploadExcel(uploadFile);
      if (result.success) {
        toast.success(`Imported ${result.importedCount} invoice rows`);
        if (result.errors?.length) {
          toast.warning(`${result.errors.length} rows had errors`);
        }
        await loadData();
        await loadInvoiceRows({
          search,
          status: statusFilter,
          fromDate,
          toDate,
          page: 1,
          pageSize: 25,
        });
        setIsUploadModalOpen(false);
        setUploadFile(null);
      } else {
        toast.error("Invoice upload failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload invoice file");
    } finally {
      setIsUploading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
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
                    page,
                    pageSize: 25,
                  })
                }
                loading={isRowsLoading}
                aria-label="Refresh inward data"
              >
                <RefreshCw size={14} />
              </ActionIcon>
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
          <MantineDataTable<PoInvoice>
            data={poInvoices}
            columns={columns}
            rowKey={(row) => row.id}
            isLoading={isLoading || isRowsLoading}
            pageSize={pagination?.pageSize ?? 25}
            currentPage={pagination?.page ?? page}
            totalItems={pagination?.total}
            onPageChange={setPage}
            emptyIcon={FileText}
            emptyTitle="No inward rows"
            emptyDescription="No PO invoice rows match current search or filter."
            itemLabel="invoices"
            resetPageKey={`${search}-${statusFilter}-${fromDate}-${toDate}`}
          />
        </OperationsPanel>
      </Stack>

      <Modal
        isOpen={invoiceModalOpen}
        onClose={resetInvoiceModal}
        title={editingInvoice ? "Edit PO Invoice" : "New PO Invoice"}
        size="xl"
      >
        <form onSubmit={handleInvoiceSubmit}>
          <Stack gap="md">
            <Paper radius="lg" p="md" withBorder bg="transparent">
              <Stack gap="md">
                <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                  Invoice Details
                </Text>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Input
                    label="Invoice Number"
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        invoiceNumber: e.target.value,
                      }))
                    }
                    placeholder="Enter invoice number"
                  />
                  <Input
                    label="Invoice Date"
                    type="date"
                    value={invoiceForm.invoiceDate}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        invoiceDate: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Party Name"
                    value={invoiceForm.partyName}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        partyName: e.target.value,
                      }))
                    }
                    placeholder="Enter party name"
                  />
                </SimpleGrid>
                <Select
                  label="Product"
                  placeholder="Select product"
                  data={productOptions.map((p) => ({
                    value: String(p.value),
                    label: p.label,
                  }))}
                  searchValue={productSearch}
                  onSearchChange={setProductSearch}
                  value={
                    invoiceForm.productId ? String(invoiceForm.productId) : null
                  }
                  onChange={(value) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      productId: value ? Number(value) : 0,
                    }))
                  }
                  searchable
                  styles={{
                    input: {
                      backgroundColor: "rgba(255,255,255,0.03)",
                      borderColor: "rgba(255,255,255,0.12)",
                    },
                    dropdown: {
                      background:
                        "linear-gradient(180deg, rgba(16,25,41,0.98) 0%, rgba(8,14,26,0.98) 100%)",
                      borderColor: "rgba(148, 163, 184, 0.16)",
                    },
                  }}
                />
                <Input
                  label="Billed Qty."
                  type="number"
                  min="0"
                  value={invoiceForm.billedQty}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      billedQty: Number(e.target.value),
                    }))
                  }
                />
              </Stack>
            </Paper>

            <Group justify="flex-end" pt="sm">
              <Button
                type="button"
                variant="outline"
                onClick={resetInvoiceModal}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSavingInvoice}>
                {editingInvoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Import PO Invoices from Excel"
        size="lg"
      >
        <Stack gap="lg">
          <Paper radius="lg" p="md" withBorder bg="transparent">
            <Group justify="space-between" align="flex-start">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon
                  size={42}
                  radius="lg"
                  variant="light"
                  color="cyan"
                  style={{
                    background: "rgba(30, 192, 243, 0.12)",
                    border: "1px solid rgba(30, 192, 243, 0.18)",
                  }}
                >
                  <FileSpreadsheet size={20} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={700}>PO Invoice Import Template</Text>
                  <Text size="sm" c="dimmed">
                    Download template first. SKU or product name must match an
                    existing product.
                  </Text>
                </Stack>
              </Group>
              <Button
                variant="outline"
                leftIcon={<Download size={16} />}
                onClick={handleDownloadTemplate}
              >
                Download Template
              </Button>
            </Group>
          </Paper>

          <Paper radius="lg" p="md" withBorder bg="transparent">
            <Stack gap="sm">
              <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                Excel File
              </Text>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
              />

              {uploadFile ? (
                <Group gap="sm" wrap="nowrap">
                  <CheckCircle2
                    size={18}
                    color="var(--mantine-color-green-4)"
                  />
                  <Stack gap={2}>
                    <Text fw={600}>{uploadFile.name}</Text>
                    <Text size="sm" c="dimmed">
                      {(uploadFile.size / 1024).toFixed(1)} KB ready
                    </Text>
                  </Stack>
                </Group>
              ) : (
                <Text size="sm" c="dimmed">
                  Select Excel file to import PO invoice data.
                </Text>
              )}
            </Stack>
          </Paper>

          <Group justify="flex-end">
            <Button variant="outline" onClick={closeUploadModal}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile}
              loading={isUploading}
              leftIcon={
                isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )
              }
            >
              Import Invoices
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        isOpen={Boolean(selectedPrintRow)}
        onClose={() => setSelectedPrintRow(null)}
        title="Sticker Print"
        size="xl"
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
                        { value: "50x50", label: "50x50" },
                        { value: "60x60", label: "60x60" },
                        { value: "75x75", label: "75x75" },
                      ]}
                    />
                  </Box>
                  <Box>
                    <Text size="10px" fw={800} c="dimmed" mb={5}>
                      LABEL MODE
                    </Text>
                    <Radio.Group
                      value={stickerType}
                      onChange={(value) => setStickerType(value as StickerMode)}
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
                      </Stack>
                    </Radio.Group>
                  </Box>
                  <Select
                    label="Manufacturer"
                    size="xs"
                    radius="md"
                    placeholder="Default"
                    value={manufacturerId}
                    onChange={setManufacturerId}
                    searchable
                    searchValue={manufacturerSearch}
                    onSearchChange={setManufacturerSearch}
                    clearable
                    data={manufacturerOptions}
                  />
                  {stickerType === "Separate" ? (
                    <Select
                      label="Importer"
                      size="xs"
                      radius="md"
                      placeholder="Select importer"
                      value={importerId}
                      onChange={setImporterId}
                      searchable
                      searchValue={importerSearch}
                      onSearchChange={setImporterSearch}
                      clearable
                      data={importerOptions}
                    />
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
                    <Text fw={700} size="lg" mb="xs">
                      No preview
                    </Text>
                    <Text size="sm" c="dimmed">
                      Preview not available for this row.
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
                  >
                    Reprint Range
                  </Button>
                  <Button
                    size="xs"
                    leftIcon={<Printer size={14} />}
                    onClick={() => void handlePrint("normal")}
                    loading={isPrinting}
                    disabled={selectedPrintRow.printed}
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
    </OperationsPage>
  );
});

export default Inward;
