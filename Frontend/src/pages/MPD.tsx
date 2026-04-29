import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Paper,
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
  CheckCircle2,
  Download,
  Search,
  FileSpreadsheet,
  Globe,
  IndianRupee,
  Loader2,
  Package,
  Plus,
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
  Product,
  Manufacturer,
  Commodity,
  CreateProductDto,
} from "../services/masterApi";

type ProductFilterMode = "all" | "mapped" | "unpriced";

export const MPD = memo(function MPD() {
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<ProductFilterMode>("all");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<CreateProductDto>({
    name: "",
    sku: "",
    commodityId: undefined,
    manufacturerId: undefined,
    countryOfOrigin: "India",
    factor: "",
    netQuantity: "",
    unitType: "UNIT",
    ussp: 0,
    mrp: 0,
    bestBeforeMonths: 12,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productsData, manufacturersData, commoditiesData] =
        await Promise.all([
          productsApi.getAll(),
          manufacturersApi.getAll(),
          commoditiesApi.getAll(),
        ]);
      setProducts(productsData);
      setManufacturers(manufacturersData);
      setCommodities(commoditiesData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
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
        commodityId: formData.commodityId || null,
        manufacturerId: formData.manufacturerId || null,
        countryOfOrigin: formData.countryOfOrigin || null,
        factor: formData.factor || null,
        netQuantity: formData.netQuantity || null,
        unitType: formData.unitType || null,
        ussp: ussp,
        mrp: formData.mrp || 0,
        bestBeforeMonths: formData.bestBeforeMonths || 12,
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
      commodityId: undefined,
      manufacturerId: undefined,
      countryOfOrigin: "India",
      factor: "",
      netQuantity: "",
      unitType: "UNIT",
      ussp: 0,
      mrp: 0,
      bestBeforeMonths: 12,
    });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      sku: product.sku || "",
      commodityId: product.commodityId,
      manufacturerId: product.manufacturerId,
      countryOfOrigin: product.countryOfOrigin || "India",
      factor: product.factor || "",
      netQuantity: product.netQuantity || "",
      unitType: product.unitType || "UNIT",
      ussp: product.ussp || 0,
      mrp: product.mrp || 0,
      bestBeforeMonths: product.bestBeforeMonths || 12,
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

  const handleDownloadTemplate = () => {
    productsApi.downloadTemplate();
    toast.success("Template downloaded successfully");
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
        if (result.errors?.length) {
          toast.warning(`${result.errors.length} rows had errors`);
        }
        await loadData();
        setIsUploadModalOpen(false);
        setUploadFile(null);
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
        (item.manufacturer?.name || "").toLowerCase().includes(query) ||
        (item.commodity?.name || "").toLowerCase().includes(query);

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
      render: (row) => (
        <Text size="11px" ff="monospace" c="cyan.2" fw={700} lineClamp={1}>
          {row.sku || "N/A"}
        </Text>
      ),
      width: 120,
    },
    {
      key: "name",
      header: "Product",
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
            <Text size="xs" fw={700} lineClamp={1} maw={190}>
              {row.name}
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
      render: (row) => (
        <Text size="xs" lineClamp={1} maw={130}>
          {row.commodity?.name || "N/A"}
        </Text>
      ),
      width: 150,
    },
    {
      key: "mrp",
      header: "MRP",
      align: "right",
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
      render: (row) => (
        <Text size="xs" lineClamp={1}>
          {row.netQuantity || "N/A"} • {row.bestBeforeMonths || 12} mo
        </Text>
      ),
      width: 150,
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit product">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="blue"
              onClick={() => openEditModal(row)}
            >
              <Edit2 size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete product">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="red"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
      width: 110,
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
                placeholder="Search SKU, product, manufacturer..."
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
                <Badge size="sm" radius="md" variant="light" color="gray">
                  {products.length} products
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="cyan">
                  {mappedProducts} mapped
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="green">
                  {withPricing} priced
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="orange">
                  {unpricedProducts} no MRP
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="blue">
                  {manufacturers.length + commodities.length} masters
                </Badge>
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Product" : "New Product"}
        size="xl"
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
                </Group>
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
                    label="Best Before Months"
                    type="number"
                    min="0"
                    value={String(formData.bestBeforeMonths ?? 12)}
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
