import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
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
  QrCode,
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
import { StickerPrintModal } from "../components/organisms/StickerPrintModal";
import {
  MantineDataTable,
  DataTableColumn,
} from "../components/molecules/MantineDataTable";
import { toast } from "../lib/toast";
import {
  productsApi,
  manufacturersApi,
  commoditiesApi,
  partiesApi,
  productQuantitiesApi,
  productAllottedLocationsApi,
  Product,
  Manufacturer,
  Commodity,
  Party,
  CreateProductDto,
  ProductUploadResult,
} from "../services/masterApi";
import { exportToExcel, formatExcelDate, formatExcelNumber } from "../hooks/useExcelExport";
type ProductFilterMode = "all" | "mapped" | "unpriced";
const DEFAULT_PRODUCT_FACTOR = "1";
const DEFAULT_PRODUCT_UNIT_TYPE = "pcs";

const createDefaultProductForm = (): CreateProductDto => ({
  name: "",
  sku: "",
  alias: "",
  commodityId: undefined,
  manufacturerId: undefined,
  countryOfOrigin: "India",
  factor: DEFAULT_PRODUCT_FACTOR,
  netQuantity: "1N",
  unitType: DEFAULT_PRODUCT_UNIT_TYPE,
  ussp: 0,
  weight: 0,
  ownership: "Self",
  mrp: 0,
  bestBeforeMonths: 84,
  note: "",
  cartonQr: "",
  cartonPerItem: null,
});

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
  const [formData, setFormData] = useState<CreateProductDto>(
    createDefaultProductForm,
  );

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateFields, setUpdateFields] = useState<string[]>([]);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Upload result / skipped rows modal state
  const [uploadResultData, setUploadResultData] = useState<ProductUploadResult | null>(null);

  const [selectedPrintProduct, setSelectedPrintProduct] =
    useState<Product | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [skuQrDataUrl, setSkuQrDataUrl] = useState<string | null>(null);
  const [isSkuQrModalOpen, setIsSkuQrModalOpen] = useState(false);

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
    const sku = formData.sku?.trim().toUpperCase() || "";
    if (!isModalOpen || !sku) {
      setSkuQrDataUrl(null);
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(sku, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) setSkuQrDataUrl(url);
      })
      .catch(() => {
        if (isMounted) setSkuQrDataUrl(null);
      });

    return () => {
      isMounted = false;
    };
  }, [formData.sku, isModalOpen]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [
        productsData,
        manufacturersData,
        commoditiesData,
        partiesData,
        quantitiesData,
        locationsData,
      ] = await Promise.all([
        productsApi.getAll(),
        manufacturersApi.getAll(),
        commoditiesApi.getAll(),
        partiesApi.getAll(),
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setProducts(productsData);
      setManufacturers(manufacturersData);
      setCommodities(commoditiesData);
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
      const normalizedFactor = formData.factor?.trim() || DEFAULT_PRODUCT_FACTOR;
      const normalizedUnitType =
        formData.unitType?.trim() || DEFAULT_PRODUCT_UNIT_TYPE;

      // Auto-calculate USSP from MRP / Factor
      const ussp =
        formData.mrp && normalizedFactor
          ? formData.mrp / parseFloat(normalizedFactor) || 0
          : 0;

      const payload = {
        id: isEditing?.id || 0,
        name: formData.name,
        sku: formData.sku,
        alias: formData.alias || null,
        commodityId: formData.commodityId || null,
        manufacturerId: formData.manufacturerId || null,
        countryOfOrigin: formData.countryOfOrigin || null,
        factor: normalizedFactor,
        netQuantity: formData.netQuantity || "1N",
        unitType: normalizedUnitType,
        ussp: ussp,
        weight: formData.weight || 0,
        ownership: formData.ownership || null,
        mrp: formData.mrp || 0,
        bestBeforeMonths: formData.bestBeforeMonths || 84,
        note: formData.note || null,
        cartonQr: formData.cartonQr || null,
        cartonPerItem: formData.cartonPerItem && formData.cartonPerItem > 0 ? formData.cartonPerItem : null,
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
    setFormData(createDefaultProductForm());
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
      factor: product.factor || DEFAULT_PRODUCT_FACTOR,
      netQuantity: product.netQuantity || "",
      unitType: product.unitType || DEFAULT_PRODUCT_UNIT_TYPE,
      ussp: product.ussp || 0,
      weight: product.weight || 0,
      ownership: product.ownership || "Self",
      mrp: product.mrp || 0,
      bestBeforeMonths: product.bestBeforeMonths || 84,
      note: product.note || "",
      cartonQr: product.cartonQr || "",
      cartonPerItem: product.cartonPerItem ?? null,
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
  };

  const handleClosePrintModal = () => {
    setSelectedPrintProduct(null);
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
              // ── Import template columns (same order as import file) ──
              { header: "Name", accessor: (row) => row.name },
              { header: "SKU", accessor: (row) => row.sku || "" },
              { header: "Country of Origin", accessor: (row) => row.countryOfOrigin || "" },
              { header: "MRP Quantity", accessor: (row) => row.netQuantity || "" },
              { header: "Factor", accessor: (row) => row.factor || "" },
              { header: "USP", accessor: (row) => formatExcelNumber(row.ussp), format: "currency" },
              { header: "MRP", accessor: (row) => formatExcelNumber(row.mrp), format: "currency" },
              { header: "Best Before", accessor: (row) => row.bestBeforeMonths || 0 },
              { header: "Stock", accessor: (row) => row.stockQty, format: "number" },
              { header: "Alias", accessor: (row) => row.alias || "" },
              { header: "Manufacturer Name", accessor: (row) => row.manufacturer?.name || "" },
              { header: "Commodity Name", accessor: (row) => row.commodity?.name || "" },
              { header: "Unit Type", accessor: (row) => row.unitType || "" },
              { header: "Weight", accessor: (row) => formatExcelNumber(row.weight), format: "number" },
              { header: "Ownership", accessor: (row) => row.ownership || "" },
              { header: "Note", accessor: (row) => row.note || "" },
              // ── Additional columns (not in import template) ──
              { header: "Carton QR", accessor: (row) => row.cartonQr || "" },
              { header: "Carton Per Item", accessor: (row) => row.cartonPerItem || "", format: "number" },
              { header: "Location Summary", accessor: (row) => row.locationSummary || "" },
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

  const ownershipOptions = useMemo(() => {
    const options = [
      { value: "Self", label: "Self" },
      ...parties.map((item) => ({
        value: item.name.trim(),
        label: item.name.trim(),
      })),
    ];

    const savedOwnership = formData.ownership?.trim();
    const hasSavedOwnership = savedOwnership
      ? options.some(
        (option) => option.value.toLowerCase() === savedOwnership.toLowerCase(),
      )
      : true;

    if (savedOwnership && !hasSavedOwnership) {
      options.push({ value: savedOwnership, label: savedOwnership });
    }

    return options;
  }, [formData.ownership, parties]);

  const ownershipSelectValue = useMemo(() => {
    const ownership = formData.ownership?.trim();
    if (!ownership) return null;
    return (
      ownershipOptions.find(
        (option) => option.value.toLowerCase() === ownership.toLowerCase(),
      )?.value ?? ownership
    );
  }, [formData.ownership, ownershipOptions]);

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
  const isMrpMissing = (product: Product) => Number(product.mrp || 0) <= 0;

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
              {row.countryOfOrigin || "No origin"} • {row.unitType || DEFAULT_PRODUCT_UNIT_TYPE}
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
      render: (row) =>
        isMrpMissing(row) ? (
          <Badge size="sm" radius="md" variant="light" color="orange">
            Missing
          </Badge>
        ) : (
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
              pageSize={100}
              rowClassName={(row) =>
                isMrpMissing(row)
                  ? "bg-orange-500/10 hover:bg-orange-500/15"
                  : undefined
              }
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
              "Net Qnty", "Factor", "Best Before (Months)", "Ownership", "Note", "Carton QR", "Carton Per Item", "Stock Quantity"
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
            <Tooltip label={formData.sku ? "SKU QR generated" : "Enter SKU to generate QR"}>
              <ActionIcon
                size="md"
                radius="md"
                variant="light"
                color="violet"
                disabled={!formData.sku?.trim()}
                onClick={() => setIsSkuQrModalOpen(true)}
                aria-label="SKU QR code"
              >
                <QrCode size={18} />
              </ActionIcon>
            </Tooltip>
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
          <Stack gap="xs">
            <Paper radius="md" p="xs" withBorder bg="transparent">
              <Stack gap={6}>
                <Group justify="space-between" gap="xs">
                  <Text size="10px" fw={800} c="dimmed" tt="uppercase">
                    Product Details
                  </Text>
                  <Text size="10px" c="dimmed">
                    Compact view
                  </Text>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, xl: 5 }} spacing={8} verticalSpacing={6}>
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
                  <Select
                    label="Manufacturer"
                    placeholder="Select manufacturer"
                    data={manufacturerOptions}
                    value={
                      formData.manufacturerId
                        ? String(formData.manufacturerId)
                        : null
                    }
                    onChange={(value) => {
                      const mfgId = value ? Number(value) : undefined;
                      const selectedMfg = manufacturers.find((m) => m.id === mfgId);
                      setFormData((prev) => {
                        const isDefaultCountry = !prev.countryOfOrigin || prev.countryOfOrigin.trim().toLowerCase() === "india";
                        return {
                          ...prev,
                          manufacturerId: mfgId,
                          countryOfOrigin: (selectedMfg?.country && isDefaultCountry)
                            ? selectedMfg.country
                            : prev.countryOfOrigin,
                        };
                      });
                    }}
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
                    value={ownershipSelectValue}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        ownership: value?.trim() || undefined,
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
                  <Input
                    label="Product Note"
                    placeholder="Sticker note"
                    value={formData.note || ""}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        note: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="MRP"
                    type="number"
                    step="0.01"
                    min="0"
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
                    placeholder="pcs, kg, ml"
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
                  <Input
                    label="Carton QR"
                    placeholder="Carton QR / barcode"
                    value={formData.cartonQr || ""}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        cartonQr: event.target.value,
                      }))
                    }
                    leftElement={<Tag size={16} />}
                  />
                  <Input
                    label="Carton Per Item"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Items per carton"
                    value={formData.cartonPerItem == null ? "" : String(formData.cartonPerItem)}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        cartonPerItem: event.target.value ? Number(event.target.value) : null,
                      }))
                    }
                    leftElement={<Package size={16} />}
                  />
                </SimpleGrid>
              </Stack>
            </Paper>
            <Group justify="flex-end" pt={4} gap="xs">
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
        isOpen={isSkuQrModalOpen}
        onClose={() => setIsSkuQrModalOpen(false)}
        title="SKU QR Code"
        size="sm"
        headerActions={
          <ActionIcon size="md" radius="md" variant="light" color="violet" aria-label="SKU QR code">
            <QrCode size={18} />
          </ActionIcon>
        }
      >
        <Stack align="center" gap="md">
          <Paper radius="lg" p="md" withBorder bg="white">
            {skuQrDataUrl ? (
              <Image src={skuQrDataUrl} alt="SKU QR code" w={240} h={240} fit="contain" />
            ) : (
              <Center w={240} h={240}>
                <QrCode size={54} color="var(--mantine-color-dimmed)" />
              </Center>
            )}
          </Paper>
          <Stack gap={2} align="center">
            <Text size="10px" fw={800} c="dimmed" tt="uppercase">
              SKU
            </Text>
            <Text size="sm" fw={900} ff="monospace">
              {formData.sku?.trim() || "No SKU"}
            </Text>
          </Stack>
        </Stack>
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

      <StickerPrintModal
        isOpen={Boolean(selectedPrintProduct)}
        onClose={handleClosePrintModal}
        product={selectedPrintProduct}
        initialManufacturers={manufacturers}
        title="Print Sticker"
      />

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
