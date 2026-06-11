import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Divider,
  FileInput,
  Group,
  Image,
  Loader,
  MultiSelect,
  NumberInput,
  Paper,
  Radio,
  ScrollArea,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Search,
  FileSpreadsheet,
  Globe,
  IndianRupee,
  Loader2,
  MapPin,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Tag,
  Trash2,
  Edit2,
  Upload,
} from "lucide-react";
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
import { toast } from "../lib/toast";
import {
  productsApi,
  manufacturersApi,
  commoditiesApi,
  importersApi,
  partiesApi,
  productQuantitiesApi,
  productAllottedLocationsApi,
  Product,
  Manufacturer,
  Commodity,
  Importer,
  Party,
  CreateProductDto,
  ProductUploadResult,
  validateProductForSticker,
} from "../services/masterApi";
import { exportToExcel, formatExcelDate, formatExcelNumber } from "../hooks/useExcelExport";
import { stickersApi, StickerTemplate } from "../services/stickersApi";
import {
  stickerPrinterConfigsApi,
  StickerPrinterConfig,
} from "../services/stickerPrinterConfigsApi";
import { findMarketingCompanyForProduct } from "../utils/stickerMarketingCompany";

type ProductFilterMode = "all" | "mapped" | "unpriced";
type StickerMode = "Combined" | "Separate" | "Manufacture";

const stickerModeLabel: Record<StickerMode, string> = {
  Combined: "Imported & Marketed By",
  Separate: "Marketed / Imported",
  Manufacture: "Marketed By / Manufacture By",
};

export const MPD = memo(function MPD() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filterMode, setFilterMode] = useState<ProductFilterMode>("all");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [productStockById, setProductStockById] = useState<Record<number, number>>({});
  const [productLocationsById, setProductLocationsById] = useState<
    Record<number, Record<string, number>>
  >({});
  const [locationProduct, setLocationProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductDto>({
    name: "",
    sku: "",
    alias: "",
    commodityId: undefined,
    manufacturerId: undefined,
    countryOfOrigin: "India",
    factor: "",
    netQuantity: "",
    unitType: "UNIT",
    ussp: 0,
    weight: 0,
    ownership: "Self",
    mrp: 0,
    bestBeforeMonths: 84,
    note: "",
  });

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateFields, setUpdateFields] = useState<string[]>([]);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Upload result / skipped rows modal state
  const [uploadResultData, setUploadResultData] = useState<ProductUploadResult | null>(null);

  // Sticker print state
  const [printerConfigs, setPrinterConfigs] = useState<StickerPrinterConfig[]>(
    [],
  );
  const [templates, setTemplates] = useState<StickerTemplate[]>([]);
  const [importers, setImporters] = useState<Importer[]>([]);
  const [selectedPrintProduct, setSelectedPrintProduct] =
    useState<Product | null>(null);
  const [stickerSize, setStickerSize] = useState("50x50");
  const [stickerType, setStickerType] = useState<StickerMode>(
    "Combined",
  );
  const [printManufacturerId, setPrintManufacturerId] = useState<string | null>(
    null,
  );
  const [printImporterId, setPrintImporterId] = useState<string | null>(null);
  const [importDate, setImportDate] = useState<Date>(new Date());
  const [printQuantity, setPrintQuantity] = useState<number | "">(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const refreshTableData = useCallback(async () => {
    try {
      const [productsData, quantitiesData, locationsData] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setProducts(productsData);
      setProductStockById(
        Object.fromEntries(
          quantitiesData.map((item) => [item.productId, item.currentQuantity]),
        ),
      );
      setProductLocationsById(
        Object.fromEntries(
          locationsData.map((item) => [item.productId, item.locationJson || {}]),
        ),
      );
    } catch (error: any) {
      console.error("Failed to auto-refresh product list:", error);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => {
      void refreshTableData();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshTableData]);

  useEffect(() => {
    if (stickerSize === "25x25" && stickerType !== "Combined") {
      setStickerType("Combined");
    }
  }, [stickerSize, stickerType]);

  useEffect(() => {
    if (!selectedPrintProduct || stickerSize === "25x25") {
      setPrintImporterId(null);
      return;
    }

    const marketingCompany = findMarketingCompanyForProduct(selectedPrintProduct, importers);
    setPrintImporterId(marketingCompany ? String(marketingCompany.id) : null);
  }, [importers, selectedPrintProduct, stickerSize]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [
        productsData,
        manufacturersData,
        commoditiesData,
        templateData,
        configData,
        importerData,
        partiesData,
        quantitiesData,
        locationsData,
      ] = await Promise.all([
        productsApi.getAll(),
        manufacturersApi.getAll(),
        commoditiesApi.getAll(),
        stickersApi.getTemplates(),
        stickerPrinterConfigsApi.getAll(),
        importersApi.getAll(),
        partiesApi.getAll(),
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setProducts(productsData);
      setManufacturers(manufacturersData);
      setCommodities(commoditiesData);
      setTemplates(templateData);
      setPrinterConfigs(configData);
      setImporters(importerData);
      setParties(partiesData);
      setProductStockById(
        Object.fromEntries(
          quantitiesData.map((item) => [item.productId, item.currentQuantity]),
        ),
      );
      setProductLocationsById(
        Object.fromEntries(
          locationsData.map((item) => [item.productId, item.locationJson || {}]),
        ),
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadUpdateTemplate = () => {
    if (updateFields.length === 0) {
      toast.error("Please select fields to update");
      return;
    }
    // Update all filtered products to match current view
    const productsToUpdate = products.filter((p) => {
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.sku || "").toLowerCase().includes(query) ||
        (p.alias || "").toLowerCase().includes(query) ||
        (p.manufacturer?.name || "").toLowerCase().includes(query) ||
        (p.commodity?.name || "").toLowerCase().includes(query);

      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "mapped" && (p.manufacturerId || p.commodityId)) ||
        (filterMode === "unpriced" && Number(p.mrp || 0) <= 0);

      return matchesSearch && matchesFilter;
    }).map((p) => ({
      ...p,
      stockQty: productStockById[p.id] ?? 0
    }));

    productsApi.downloadUpdateTemplate(productsToUpdate, updateFields);
    toast.success("Template downloaded successfully");
  };

  const handleUpdateFromExcel = async () => {
    if (!updateFile) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setIsUpdating(true);
      const result = await productsApi.updateFromExcel(updateFile);
      toast.success(`Successfully updated ${result.importedCount} products`);
      setIsUpdateModalOpen(false);
      setUpdateFile(null);
      setUpdateFields([]);
      loadData();

      // Show skipped rows modal if there are skipped rows or errors
      const hasSkipped = (result.skippedRows?.length ?? 0) > 0;
      const hasErrors = (result.errors?.length ?? 0) > 0;
      if (hasSkipped || hasErrors) {
        setUploadResultData(result);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update from Excel");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name || !formData.sku) {
      toast.error("Product name and SKU are required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-calculate USSP from MRP / Factor
      const ussp =
        formData.mrp && formData.factor
          ? formData.mrp / parseFloat(formData.factor) || 0
          : 0;

      const payload = {
        id: isEditing?.id || 0,
        name: formData.name,
        sku: formData.sku,
        alias: formData.alias || null,
        commodityId: formData.commodityId || null,
        manufacturerId: formData.manufacturerId || null,
        countryOfOrigin: formData.countryOfOrigin || null,
        factor: formData.factor || null,
        netQuantity: formData.netQuantity || null,
        unitType: formData.unitType || null,
        ussp: ussp,
        weight: formData.weight || 0,
        ownership: formData.ownership || null,
        mrp: formData.mrp || 0,
        bestBeforeMonths: formData.bestBeforeMonths || 84,
        note: formData.note || null,
      };

      if (isEditing) {
        await productsApi.update(isEditing.id, payload);
        toast.success("Product updated successfully");
      } else {
        await productsApi.create(payload);
        toast.success("Product created successfully");
      }

      await loadData();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: "",
      sku: "",
      alias: "",
      commodityId: undefined,
      manufacturerId: undefined,
      countryOfOrigin: "India",
      factor: "",
      netQuantity: "",
      unitType: "UNIT",
      ussp: 0,
      weight: 0,
      ownership: "Self",
      mrp: 0,
      bestBeforeMonths: 84,
      note: "",
    });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      sku: product.sku || "",
      alias: product.alias || "",
      commodityId: product.commodityId,
      manufacturerId: product.manufacturerId,
      countryOfOrigin: product.countryOfOrigin || "India",
      factor: product.factor || "",
      netQuantity: product.netQuantity || "",
      unitType: product.unitType || "UNIT",
      ussp: product.ussp || 0,
      weight: product.weight || 0,
      ownership: product.ownership || "Self",
      mrp: product.mrp || 0,
      bestBeforeMonths: product.bestBeforeMonths || 84,
      note: product.note || "",
    });
    setIsEditing(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await productsApi.delete(deleteTarget.id);
      toast.success("Product deleted successfully");
      await loadData();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  // Sticker print handlers
  const handleOpenPrintModal = (product: Product) => {
    setSelectedPrintProduct(product);
    setStickerSize("50x50");
    setStickerType("Combined");
    setPrintManufacturerId(
      product.manufacturerId ? String(product.manufacturerId) : null,
    );
    const marketingCompany = findMarketingCompanyForProduct(product, importers);
    setPrintImporterId(marketingCompany ? String(marketingCompany.id) : null);
    setImportDate(new Date());
    setPrintQuantity(1);
    setPreviewUrl(null);
  };

  const handleClosePrintModal = () => {
    setSelectedPrintProduct(null);
    setPreviewUrl(null);
  };

  const getPrinterAddress = () => {
    const config = printerConfigs.find(
      (c) => c.stickerSize === stickerSize && c.isActive,
    );
    if (!config?.printerIp?.trim()) return null;
    return `${config.printerIp.trim()}:${config.printerPort}`;
  };

  const buildStickerPayload = useCallback(
    (product: Product, quantity: number) => ({
      productId: product.id,
      manufacturerId: printManufacturerId
        ? Number(printManufacturerId)
        : undefined,
      importerId:
        stickerSize !== "25x25" && printImporterId
          ? Number(printImporterId)
          : undefined,
      size: stickerSize,
      type: stickerType,
      monthYear: format(importDate, "MMM/yyyy").toUpperCase(),
      batchNumber: "N/A",
      note: product.note?.trim() || "",
      quantity,
    }),
    [
      printManufacturerId,
      printImporterId,
      stickerSize,
      stickerType,
      importDate,
    ],
  );

  const refreshPreview = useCallback(async () => {
    if (!selectedPrintProduct) {
      setPreviewUrl(null);
      return;
    }

    const validationErrors = validateProductForSticker(
      selectedPrintProduct,
      stickerSize,
    );
    if (validationErrors.length > 0) {
      setPreviewUrl(null);
      return;
    }

    if (stickerSize !== "25x25" && !printImporterId) {
      setPreviewUrl(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const nextPreview = await stickersApi.getPreview(
        buildStickerPayload(selectedPrintProduct, Number(printQuantity) || 1),
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
  }, [buildStickerPayload, selectedPrintProduct, printQuantity, stickerSize]);

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

  const handlePrint = async () => {
    if (!selectedPrintProduct) return;

    const validationErrors = validateProductForSticker(
      selectedPrintProduct,
      stickerSize,
    );
    if (validationErrors.length > 0) {
      toast.error("Cannot print sticker. Missing product data: " + validationErrors.join(", "));
      return;
    }

    if (stickerSize !== "25x25" && !printImporterId) {
      toast.error("Please select Marketing Company");
      return;
    }

    const printerAddress = getPrinterAddress();
    if (!printerAddress) {
      toast.error("Active printer profile not found for selected sticker size");
      return;
    }

    const quantity = Number(printQuantity) || 1;
    setIsPrinting(true);
    try {
      await stickersApi.print({
        printerIp: printerAddress,
        items: [
          {
            config: buildStickerPayload(selectedPrintProduct, quantity),
            quantity,
          },
        ],
      });
      toast.success(`${quantity} stickers sent to printer`);
    } catch (error: any) {
      toast.error(error.message || "Sticker print job failed");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadTemplate = () => {
    productsApi.downloadTemplate();
    toast.success("Template downloaded successfully");
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const [quantities, allottedLocations] = await Promise.all([
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);

      const qtyMap = new Map<number, number>();
      for (const q of quantities) {
        qtyMap.set(q.productId, q.currentQuantity);
      }

      const locationMap = new Map<number, Record<string, number>>();
      for (const loc of allottedLocations) {
        locationMap.set(loc.productId, loc.locationJson || {});
      }

      type LocationRow = { sku: string; productName: string; locationCode: string; quantity: number };

      const locationBreakdown: LocationRow[] = [];
      const enrichedProducts = filteredProducts.map((p) => {
        const locJson = locationMap.get(p.id) || {};
        const locationParts = Object.entries(locJson)
          .filter(([, qty]) => qty > 0)
          .map(([code, qty]) => `${code}: ${qty}`);

        const entries = Object.entries(locJson).filter(([, qty]) => qty > 0);
        if (entries.length === 0) {
          locationBreakdown.push({ sku: p.sku || "", productName: p.name, locationCode: "No location", quantity: 0 });
        } else {
          for (const [code, qty] of entries) {
            locationBreakdown.push({ sku: p.sku || "", productName: p.name, locationCode: code, quantity: qty });
          }
        }

        return {
          ...p,
          stockQty: qtyMap.get(p.id) || 0,
          locationSummary: locationParts.join(" | ") || "No location",
        };
      });

      exportToExcel({
        fileName: "Products_Export",
        sheets: [
          {
            sheetName: "Products",
            data: enrichedProducts,
            columns: [
              { header: "SKU Code", accessor: (row) => row.sku || "" },
              { header: "Alias", accessor: (row) => row.alias || "" },
              { header: "Product Name", accessor: (row) => row.name },
              { header: "Commodity", accessor: (row) => row.commodity?.name || "" },
              { header: "Manufacturer", accessor: (row) => row.manufacturer?.name || "" },
              { header: "Country of Origin", accessor: (row) => row.countryOfOrigin || "" },
              { header: "Unit Type", accessor: (row) => row.unitType || "" },
              { header: "MRP", accessor: (row) => formatExcelNumber(row.mrp), format: "currency" },
              { header: "USSP", accessor: (row) => formatExcelNumber(row.ussp), format: "currency" },
              { header: "Net Quantity", accessor: (row) => row.netQuantity || "" },
              { header: "Factor", accessor: (row) => row.factor || "" },
              { header: "Best Before (Months)", accessor: (row) => row.bestBeforeMonths || 0 },
              { header: "Weight", accessor: (row) => formatExcelNumber(row.weight), format: "number" },
              { header: "Ownership", accessor: (row) => row.ownership || "" },
              { header: "Stock Quantity", accessor: (row) => row.stockQty, format: "number" },
              { header: "Location Details", accessor: (row) => row.locationSummary, width: 40 },
              { header: "Note", accessor: (row) => row.note || "" },
            ],
          },
          {
            sheetName: "Location Breakdown",
            data: locationBreakdown,
            columns: [
              { header: "SKU Code", accessor: (row) => row.sku },
              { header: "Product Name", accessor: (row) => row.productName },
              { header: "Location Code", accessor: (row) => row.locationCode },
              { header: "Quantity at Location", accessor: (row) => row.quantity, format: "number" },
            ],
          },
        ],
      });

      toast.success("Products exported with stock & location details");
    } catch (error: any) {
      toast.error(error.message || "Failed to export products");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload a valid Excel file");
      return;
    }

    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await productsApi.uploadExcel(uploadFile);
      if (result.success) {
        toast.success(`Successfully imported ${result.importedCount} products`);
        await loadData();
        setIsUploadModalOpen(false);
        setUploadFile(null);

        // Show skipped rows modal if there are skipped rows or errors
        const hasSkipped = (result.skippedRows?.length ?? 0) > 0;
        const hasErrors = (result.errors?.length ?? 0) > 0;
        if (hasSkipped || hasErrors) {
          setUploadResultData(result);
        }
      } else {
        toast.error("Failed to import products");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to import products");
    } finally {
      setIsUploading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
  };

  const manufacturerOptions = manufacturers.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  const commodityOptions = commodities.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  const importerOptions = useMemo(
    () =>
      importers.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [importers],
  );

  const ownershipOptions = useMemo(
    () => [
      { value: "Self", label: "Self" },
      ...parties.map((item) => ({
        value: item.name,
        label: item.name,
      })),
    ],
    [parties],
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

  const locationEntries = useMemo(() => {
    if (!locationProduct) return [];
    return Object.entries(productLocationsById[locationProduct.id] || {})
      .filter(([, quantity]) => Number(quantity) > 0)
      .sort(([left], [right]) => left.localeCompare(right));
  }, [locationProduct, productLocationsById]);

  const mappedProducts = products.filter(
    (item) => item.manufacturerId || item.commodityId,
  ).length;

  const withPricing = products.filter(
    (item) => Number(item.mrp || 0) > 0,
  ).length;
  const unpricedProducts = products.length - withPricing;

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.sku || "").toLowerCase().includes(query) ||
        (item.alias || "").toLowerCase().includes(query) ||
        (item.manufacturer?.name || "").toLowerCase().includes(query) ||
        (item.commodity?.name || "").toLowerCase().includes(query) ||
        (item.ownership || "").toLowerCase().includes(query);

      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "mapped" &&
          (item.manufacturerId || item.commodityId)) ||
        (filterMode === "unpriced" && Number(item.mrp || 0) <= 0);

      return matchesSearch && matchesFilter;
    });
  }, [filterMode, products, search]);

  const columns: DataTableColumn<Product>[] = [
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      sortAccessor: (row) => row.sku,
      render: (row) => (
        <Text
          size="11px"
          ff="monospace"
          c="blue.4"
          fw={700}
          style={{ cursor: "pointer", textDecoration: "underline", wordBreak: "break-all" }}
          onClick={(event) => {
            event.stopPropagation();
            openEditModal(row);
          }}
        >
          {row.sku || "N/A"}
        </Text>
      ),
      width: 150,
    },
    {
      key: "alias",
      header: "Alias",
      sortable: true,
      sortAccessor: (row) => row.alias,
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
      sortAccessor: (row) => row.name,
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
            <Package size={18} />
          </ThemeIcon>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text size="xs" fw={700}>
              {row.name}
            </Text>
            <Text size="11px" c="dimmed" lineClamp={1}>
              {row.countryOfOrigin || "No origin"} • {row.unitType || "UNIT"}
            </Text>
          </Stack>
        </Group>
      ),
      width: 430,
    },
    {
      key: "stockQty",
      header: "Stock Qty",
      align: "right",
      sortable: true,
      sortAccessor: (row) => productStockById[row.id] ?? 0,
      render: (row) => {
        const stockQty = productStockById[row.id] ?? 0;
        return (
          <Text size="xs" fw={800} c={stockQty > 0 ? "green.3" : "dimmed"}>
            {stockQty}
          </Text>
        );
      },
      width: 100,
    },
    {
      key: "mrp",
      header: "MRP",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.mrp,
      render: (row) => (
        <Text size="xs" fw={800} c="green.3">
          Rs {Number(row.mrp || 0).toFixed(2)}
        </Text>
      ),
      width: 110,
    },
    {
      key: "ussp",
      header: "USSP",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.ussp,
      render: (row) => (
        <Text size="xs" fw={700} c="cyan.3">
          Rs {Number(row.ussp || 0).toFixed(2)}
        </Text>
      ),
      width: 110,
    },
    {
      key: "pack",
      header: "Pack",
      sortable: true,
      sortAccessor: (row) => `${row.netQuantity}-${row.bestBeforeMonths}`,
      render: (row) => (
        <Text size="xs" lineClamp={1}>
          {row.netQuantity || "N/A"} • {row.bestBeforeMonths || 84} mo
        </Text>
      ),
      width: 110,
    },
    {
      key: "actions",
      header: "Print",
      align: "center",
      render: (row) => (
        <Tooltip label="Print sticker">
          <ActionIcon
            size="sm"
            radius="md"
            variant="light"
            color="cyan"
            aria-label="Print sticker"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenPrintModal(row);
            }}
          >
            <Printer size={16} />
          </ActionIcon>
        </Tooltip>
      ),
      width: 90,
    },
  ];

  return (
    <>
      <OperationsPage
        title="Master Product Data"
        description="Catalog products with one shared enterprise UI system for forms, tables, and bulk import."
        icon={Package}
        hideHeader
      >
        <Stack gap="sm">
          <OperationsPanel
            title="Filters"
            description="Compact product scope and search controls."
            icon={Package}
          >
            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="sm">
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
                    setFilterMode(value as ProductFilterMode)
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
                leftSection={<Search size={14} />}
              />

              <Box>
                <Text size="10px" fw={800} c="dimmed" mb={5}>
                  QUICK ACTION
                </Text>
                <Group gap="xs" wrap="nowrap">
                  <Button
                    size="xs"
                    variant="light"
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
                    onClick={() => {
                      setFilterMode("all");
                      setSearch("");
                    }}
                  >
                    Clear
                  </Button>
                </Group>
              </Box>
            </SimpleGrid>
          </OperationsPanel>

          <OperationsPanel
            title="Product Directory"
            description="Same compact search, action menu, import flow, and pricing visibility used across operations pages."
            icon={Package}
            action={
              <Group gap="xs" wrap="nowrap">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Download size={16} />}
                  onClick={() => void handleExportExcel()}
                  loading={isExporting}
                >
                  Export Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsUpdateModalOpen(true)}
                  leftIcon={<Edit2 size={16} />}
                >
                  Bulk Update via Excel
                </Button>

                <ActionIcon
                  size="sm"
                  radius="md"
                  variant="light"
                  color="gray"
                  onClick={loadData}
                  loading={isLoading}
                  aria-label="Refresh product data"
                >
                  <RefreshCw size={14} />
                </ActionIcon>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Upload size={16} />}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  Import Excel
                </Button>
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  leftIcon={<Plus size={16} />}
                >
                  New Product
                </Button>
              </Group>
            }
            contentClassName="p-0"
          >
            <MantineDataTable<Product>
              data={filteredProducts}
              columns={columns}
              rowKey={(row) => row.id}
              onRowClick={(row) => openEditModal(row)}
              isLoading={isLoading}
              emptyIcon={Package}
              emptyTitle="No product rows"
              emptyDescription="No products match current search or filter."
              itemLabel="products"
              resetPageKey={`${search}-${filterMode}`}
            />
          </OperationsPanel>
        </Stack>
      </OperationsPage>

      {/* Update via Excel Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setUpdateFields([]);
          setUpdateFile(null);
        }}
        title="Update Products via Excel"
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Updating {filteredProducts.length} filtered products. Select the fields you want to change, download the pre-filled template, edit it, and upload the updated file.
          </Text>

          <MultiSelect
            label="Fields to Update"
            description="Select one or more columns you want to modify."
            placeholder="Select fields"
            data={[
              "MRP", "Weight", "Alias", "Product Name", "Manufacturer Name",
              "Commodity Name", "Country of Origin", "Unit Type",
              "Net Qnty", "Factor", "Best Before (Months)", "Ownership", "Note", "Stock Quantity"
            ]}
            value={updateFields}
            onChange={setUpdateFields}
            searchable
            clearable
          />

          <Group grow>
            <Button
              variant="outline"
              onClick={handleDownloadUpdateTemplate}
              leftIcon={<Download size={16} />}
              disabled={updateFields.length === 0}
            >
              Download Pre-filled Template
            </Button>
          </Group>

          <Divider my="sm" label="Then upload your changes" labelPosition="center" />

          <FileInput
            label="Updated Excel File"
            placeholder="Click to select file"
            accept=".xlsx,.xls"
            value={updateFile}
            onChange={setUpdateFile}
            icon={<FileSpreadsheet size={16} />}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => {
                setIsUpdateModalOpen(false);
                setUpdateFields([]);
                setUpdateFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFromExcel}
              loading={isUpdating}
              disabled={!updateFile}
            >
              Update Products
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Product" : "New Product"}
        size="xxl"
        headerActions={
          <>
            <Tooltip label={isEditing ? "View product locations" : "Save product first to view locations"}>
              <ActionIcon
                size="md"
                radius="md"
                variant="light"
                color="teal"
                disabled={!isEditing}
                onClick={() => {
                  if (isEditing) setLocationProduct(isEditing);
                }}
                aria-label="View product locations"
              >
                <MapPin size={18} />
              </ActionIcon>
            </Tooltip>
            {isEditing ? (
              <>
                <Tooltip label="Print sticker">
                  <ActionIcon
                    size="md"
                    radius="md"
                    variant="light"
                    color="cyan"
                    onClick={() => handleOpenPrintModal(isEditing)}
                  >
                    <Printer size={18} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete product">
                  <ActionIcon
                    size="md"
                    radius="md"
                    variant="light"
                    color="red"
                    onClick={() => setDeleteTarget(isEditing)}
                  >
                    <Trash2 size={18} />
                  </ActionIcon>
                </Tooltip>
              </>
            ) : null}
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Paper radius="lg" p="md" withBorder bg="transparent">
              <Stack gap="md">
                <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                  Identity
                </Text>
                <Input
                  label="Product Name"
                  placeholder="Mechanical keyboard pro"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  leftElement={<Package size={16} />}
                  required
                />
                <Group grow align="flex-start">
                  <Input
                    label="SKU"
                    placeholder="SKU-1001"
                    value={formData.sku}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        sku: event.target.value.toUpperCase(),
                      }))
                    }
                    leftElement={<Tag size={16} />}
                    required
                  />
                  <Input
                    label="Alias"
                    placeholder="Alternative name or code"
                    value={formData.alias}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        alias: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Country of Origin"
                    placeholder="India"
                    value={formData.countryOfOrigin}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        countryOfOrigin: event.target.value,
                      }))
                    }
                    leftElement={<Globe size={16} />}
                  />
                </Group>
                <Group grow align="flex-start">
                  <Select
                    label="Manufacturer"
                    placeholder="Select manufacturer"
                    data={manufacturerOptions}
                    value={
                      formData.manufacturerId
                        ? String(formData.manufacturerId)
                        : null
                    }
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        manufacturerId: value ? Number(value) : undefined,
                      }))
                    }
                    searchable
                    clearable
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
                  <Select
                    label="Commodity"
                    placeholder="Select commodity"
                    data={commodityOptions}
                    value={
                      formData.commodityId ? String(formData.commodityId) : null
                    }
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        commodityId: value ? Number(value) : undefined,
                      }))
                    }
                    searchable
                    clearable
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
                  <Select
                    label="Ownership"
                    placeholder="Self or Party"
                    data={ownershipOptions}
                    value={formData.ownership || null}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        ownership: value || undefined,
                      }))
                    }
                    clearable
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
                </Group>
                <Input
                  label="Product Note"
                  placeholder="Note to print on stickers (optional)"
                  value={formData.note || ""}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                />
              </Stack>
            </Paper>

            <Paper radius="lg" p="md" withBorder bg="transparent">
              <Stack gap="md">
                <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                  Pricing and Packaging
                </Text>
                <Group grow align="flex-start">
                  <Input
                    label="MRP"
                    type="number"
                    step="0.01"
                    value={String(formData.mrp ?? 0)}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        mrp: Number(event.target.value),
                      }))
                    }
                    leftElement={<IndianRupee size={16} />}
                  />
                  <Input
                    label="Factor"
                    placeholder="1 or 500"
                    type="number"
                    step="1"
                    min="1"
                    value={formData.factor}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        factor: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Net Qnty"
                    placeholder="1L or 500ml"
                    value={formData.netQuantity}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        netQuantity: event.target.value,
                      }))
                    }
                  />
                </Group>
                <Group grow align="flex-start">
                  <Input
                    label="USSP (Auto-calculated)"
                    type="number"
                    step="0.01"
                    value={String(
                      formData.mrp && formData.factor
                        ? formData.mrp / parseFloat(formData.factor) || 0
                        : 0,
                    )}
                    disabled
                    leftElement={<IndianRupee size={16} />}
                  />
                  <Input
                    label="Unit"
                    placeholder="UNIT, KG, ML"
                    value={formData.unitType}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        unitType: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={String(formData.weight ?? 0)}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        weight: Number(event.target.value),
                      }))
                    }
                  />
                  <Input
                    label="Best Before Months"
                    type="number"
                    min="0"
                    value={String(formData.bestBeforeMonths ?? 84)}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        bestBeforeMonths: Number(event.target.value),
                      }))
                    }
                  />
                </Group>
              </Stack>
            </Paper>
            <Group justify="flex-end" pt="sm">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Update Product" : "Create Product"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(locationProduct)}
        onClose={() => setLocationProduct(null)}
        title="Product Locations"
        size="lg"
      >
        {locationProduct ? (
          <Stack gap="md">
            <Paper radius="md" p="sm" withBorder bg="transparent">
              <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Text size="xs" fw={800} ff="monospace" c="cyan.3">
                    {locationProduct.sku || "NO-SKU"}
                  </Text>
                  <Text size="sm" fw={700}>{locationProduct.name}</Text>
                </Stack>
                <Badge variant="light" color="green">
                  Stock Qty: {productStockById[locationProduct.id] ?? 0}
                </Badge>
              </Group>
            </Paper>

            {locationEntries.length > 0 ? (
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Location</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Quantity</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {locationEntries.map(([locationCode, quantity]) => (
                    <Table.Tr key={locationCode}>
                      <Table.Td>
                        <Text size="sm" fw={700}>{locationCode}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text size="sm" fw={800} c="green.3">
                          {quantity}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Paper radius="md" p="lg" withBorder bg="transparent" ta="center">
                <MapPin size={34} style={{ marginBottom: 8, opacity: 0.6 }} />
                <Text fw={700}>No location allotted</Text>
                <Text size="sm" c="dimmed">
                  This product does not have any location-wise stock yet.
                </Text>
              </Paper>
            )}
          </Stack>
        ) : null}
      </Modal>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Import Products from Excel"
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
                  <Text fw={700}>Product Import Template</Text>
                  <Text size="sm" c="dimmed">
                    Download template first. Manufacturer and commodity names
                    are auto-created if missing. Use Stock Qnty column to set
                    initial inventory.
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
                  Select Excel file to import product master data.
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
              Import Products
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        isOpen={Boolean(selectedPrintProduct)}
        onClose={handleClosePrintModal}
        title="Print Sticker"
        size="xxl"
      >
        {selectedPrintProduct ? (
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
                            label={stickerModeLabel.Combined}
                            size="xs"
                          />
                          <Radio
                            value="Separate"
                            label={stickerModeLabel.Separate}
                            size="xs"
                          />
                          <Radio
                            value="Manufacture"
                            label={stickerModeLabel.Manufacture}
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
                  {stickerSize !== "25x25" ? (
                    <Select
                      label="Marketing Company"
                      size="xs"
                      radius="md"
                      placeholder="Select Marketing Company from importer master"
                      value={printImporterId}
                      onChange={setPrintImporterId}
                      data={importerOptions}
                    />
                  ) : stickerSize !== "25x25" ? (
                    <Box>
                      <Text size="10px" fw={800} c="dimmed">
                        TEMPLATE
                      </Text>
                      <Text size="xs" fw={700} lineClamp={1} mt={4}>
                        {activeTemplate?.name || "Template missing"}
                      </Text>
                    </Box>
                  ) : null}
                </SimpleGrid>
                <TextInput
                  label="Import Date"
                  size="xs"
                  radius="md"
                  mt="sm"
                  type="date"
                  value={format(importDate, "yyyy-MM-dd")}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setImportDate(value ? new Date(value) : new Date());
                  }}
                />
              </Paper>

              <Paper radius="md" p="sm" withBorder>
                <Text size="xs" fw={800} mb="xs">
                  Product Info
                </Text>
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Text size="xs" c="dimmed">
                      SKU
                    </Text>
                    <Text size="sm" fw={800} ff="monospace" c="cyan.3">
                      {selectedPrintProduct.sku || "N/A"}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Product
                    </Text>
                    <Text size="sm" fw={700}>
                      {selectedPrintProduct.name}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      Origin
                    </Text>
                    <Text size="xs">
                      {selectedPrintProduct.countryOfOrigin || "N/A"} •{" "}
                      {selectedPrintProduct.unitType || "UNIT"}
                    </Text>
                  </Box>
                </Group>
                <Divider my="sm" />
                <Text size="xs" c="dimmed">
                  Import Date
                </Text>
                <Text size="xs" fw={700}>
                  {format(importDate, "MMM/yyyy").toUpperCase()}
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
                      {stickerModeLabel[stickerType]}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      PRINTER
                    </Text>
                    <Text size="xs" fw={800}>
                      {printerConfig
                        ? `${printerConfig.printerIp}:${printerConfig.printerPort}`
                        : "Not configured"}
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
                    <Text fw={700} size="lg" mb="xs" c={selectedPrintProduct && validateProductForSticker(selectedPrintProduct, stickerSize).length > 0 ? "red.4" : undefined}>
                      {selectedPrintProduct && validateProductForSticker(selectedPrintProduct, stickerSize).length > 0
                        ? "Missing Product Data"
                        : "No preview"}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {selectedPrintProduct && validateProductForSticker(selectedPrintProduct, stickerSize).length > 0
                        ? `Please fill missing product fields: ${validateProductForSticker(selectedPrintProduct, stickerSize).join(", ")}`
                        : "Preview not available for this configuration."}
                    </Text>
                  </Paper>
                )}
              </Paper>

              <Paper radius="md" p="sm" withBorder>
                <Text size="xs" fw={800} mb="xs">
                  Print Quantity
                </Text>
                <NumberInput
                  size="xs"
                  label="Quantity"
                  min={1}
                  max={999}
                  value={printQuantity}
                  onChange={(value) =>
                    setPrintQuantity(typeof value === "number" ? value : "")
                  }
                />
                <Group mt="sm" grow>
                  <Button
                    size="xs"
                    leftIcon={<Printer size={14} />}
                    onClick={() => void handlePrint()}
                    loading={isPrinting}
                  >
                    Print
                  </Button>
                </Group>
              </Paper>
            </Stack>
          </SimpleGrid>
        ) : null}
      </Modal>

      {/* Upload Result / Skipped Rows Modal */}
      <Modal
        isOpen={!!uploadResultData}
        onClose={() => setUploadResultData(null)}
        title="Upload Report"
        size="xl"
      >
        {uploadResultData && (
          <Stack gap="md">
            <Paper radius="lg" p="md" withBorder bg="transparent">
              <Group gap="md" wrap="nowrap">
                <ThemeIcon
                  size={48}
                  radius="lg"
                  variant="light"
                  color={uploadResultData.importedCount > 0 ? "green" : "orange"}
                  style={{
                    background: uploadResultData.importedCount > 0
                      ? "rgba(64, 192, 87, 0.12)"
                      : "rgba(255, 159, 64, 0.12)",
                    border: uploadResultData.importedCount > 0
                      ? "1px solid rgba(64, 192, 87, 0.18)"
                      : "1px solid rgba(255, 159, 64, 0.18)",
                  }}
                >
                  {uploadResultData.importedCount > 0 ? (
                    <CheckCircle2 size={24} />
                  ) : (
                    <AlertTriangle size={24} />
                  )}
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={700} size="lg">
                    {uploadResultData.importedCount} products imported successfully
                  </Text>
                  <Text size="sm" c="dimmed">
                    {(uploadResultData.skippedRows?.length ?? 0) > 0
                      ? `${uploadResultData.skippedRows!.length} rows were skipped`
                      : "All rows processed successfully"}
                    {(uploadResultData.errors?.length ?? 0) > 0 &&
                      ` • ${uploadResultData.errors!.length} rows had errors`}
                  </Text>
                </Stack>
              </Group>
            </Paper>

            {(uploadResultData.skippedRows?.length ?? 0) > 0 && (
              <Paper radius="lg" p="md" withBorder bg="transparent">
                <Group justify="space-between" mb="sm">
                  <Group gap="sm">
                    <AlertTriangle size={16} color="var(--mantine-color-orange-4)" />
                    <Text size="sm" fw={700} c="orange.4">
                      Skipped Rows ({uploadResultData.skippedRows!.length})
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    variant="light"
                    color="orange"
                    leftIcon={<Download size={14} />}
                    onClick={() => {
                      const wb = XLSX.utils.book_new();
                      const data = uploadResultData.skippedRows!.map((r) => ({
                        "Row #": r.rowNumber,
                        "SKU": r.sku || "",
                        "Product Name": r.productName || "",
                        "Reason": r.reason,
                      }));
                      const ws = XLSX.utils.json_to_sheet(data);
                      ws["!cols"] = [
                        { wch: 8 },
                        { wch: 20 },
                        { wch: 40 },
                        { wch: 30 },
                      ];
                      XLSX.utils.book_append_sheet(wb, ws, "Skipped Rows");
                      XLSX.writeFile(wb, `Skipped_Rows_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
                    }}
                  >
                    Download
                  </Button>
                </Group>
                <ScrollArea.Autosize mah={350}>
                  <Table
                    striped
                    highlightOnHover
                    withTableBorder
                    withColumnBorders
                    fz="xs"
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={70}>Row #</Table.Th>
                        <Table.Th w={120}>SKU</Table.Th>
                        <Table.Th>Product Name</Table.Th>
                        <Table.Th>Reason</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {uploadResultData.skippedRows!.map((row, idx) => (
                        <Table.Tr key={idx}>
                          <Table.Td>
                            <Badge size="xs" variant="light" color="gray">
                              {row.rowNumber}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" ff="monospace" c="blue.4" fw={600}>
                              {row.sku || "—"}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" lineClamp={1}>
                              {row.productName || "—"}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              size="xs"
                              variant="light"
                              color={
                                row.reason.includes("duplicate") || row.reason.includes("already exists")
                                  ? "yellow"
                                  : row.reason.includes("blank")
                                    ? "red"
                                    : "orange"
                              }
                            >
                              {row.reason}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              </Paper>
            )}

            {(uploadResultData.errors?.length ?? 0) > 0 && (
              <Paper radius="lg" p="md" withBorder bg="transparent">
                <Group gap="sm" mb="sm">
                  <AlertTriangle size={16} color="var(--mantine-color-red-4)" />
                  <Text size="sm" fw={700} c="red.4">
                    Errors ({uploadResultData.errors!.length})
                  </Text>
                </Group>
                <ScrollArea.Autosize mah={200}>
                  <Stack gap={4}>
                    {uploadResultData.errors!.map((err, idx) => (
                      <Text key={idx} size="xs" c="red.3">
                        • {err}
                      </Text>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              </Paper>
            )}

            <Group justify="flex-end">
              <Button onClick={() => setUploadResultData(null)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
});

export default MPD;
