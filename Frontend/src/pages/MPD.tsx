import React, { memo, useEffect, useState } from "react";
import { format } from "date-fns";
import { Group, Select, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  Building,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Globe,
  IndianRupee,
  Loader2,
  Package,
  Plus,
  Tag,
  Trash2,
  Edit2,
  Upload,
} from "lucide-react";
import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Modal, ConfirmDialog } from "../components/atoms/Modal";
import {
  DataTable,
  createTableColumns,
} from "../components/molecules/DataTable";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
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

export const MPD = memo(function MPD() {
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
    mrpQuantity: "",
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
      // Auto-calculate USSP from MRP / MRP Quantity
      const ussp =
        formData.mrp && formData.mrpQuantity
          ? formData.mrp / parseFloat(formData.mrpQuantity) || 0
          : 0;

      const payload = {
        id: isEditing?.id || 0,
        name: formData.name,
        sku: formData.sku,
        commodityId: formData.commodityId || null,
        manufacturerId: formData.manufacturerId || null,
        countryOfOrigin: formData.countryOfOrigin || null,
        mrpQuantity: formData.mrpQuantity || null,
        unitType: (formData.unitType || "UNIT").toUpperCase(),
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
      mrpQuantity: "",
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
      mrpQuantity: product.mrpQuantity || "",
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

  const columns = createTableColumns<Product>(
    [
      {
        accessorKey: "sku",
        header: "SKU",
        cell: (row) => (
          <Text size="11px" ff="monospace" c="cyan.2" fw={700}>
            {row.sku || "N/A"}
          </Text>
        ),
      },
      {
        accessorKey: "name",
        header: "Product",
        cell: (row) => (
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon
              size={40}
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
            <Stack gap={2}>
              <Text fw={700} size="sm">
                {row.name}
              </Text>
              <Text size="11px" c="dimmed">
                {row.countryOfOrigin || "No origin"} • {row.unitType || "UNIT"}
              </Text>
            </Stack>
          </Group>
        ),
      },
      {
        accessorKey: "manufacturer",
        header: "Manufacturer",
        cell: (row) => <Text size="sm">{row.manufacturer?.name || "N/A"}</Text>,
      },
      {
        accessorKey: "commodity",
        header: "Commodity",
        cell: (row) => <Text size="sm">{row.commodity?.name || "N/A"}</Text>,
      },
      {
        accessorKey: "mrp",
        header: "MRP",
        cell: (row) => (
          <Stack gap={0} align="flex-end">
            <Text fw={800} size="sm" c="green.3">
              Rs {Number(row.mrp || 0).toFixed(2)}
            </Text>
            <Text size="10px" c="dimmed">
              {row.bestBeforeMonths || 12} months
            </Text>
          </Stack>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: (row) => (
          <Text size="11px" c="dimmed">
            {row.createdAt
              ? format(new Date(row.createdAt), "dd MMM yyyy")
              : "N/A"}
          </Text>
        ),
      },
    ],
    [
      {
        label: "Edit",
        icon: <Edit2 className="h-4 w-4" />,
        onClick: (row) => openEditModal(row),
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: (row) => setDeleteTarget(row),
        variant: "destructive",
      },
    ],
  );

  const manufacturerOptions = manufacturers.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  const commodityOptions = commodities.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  return (
    <>
      <OperationsPage
        title="Master Product Data"
        description="Catalog products with one shared enterprise UI system for forms, tables, and bulk import."
        icon={Package}
        actions={
          <Group gap="xs">
            <Button
              variant="outline"
              leftIcon={<Upload size={16} />}
              onClick={() => setIsUploadModalOpen(true)}
            >
              Import Excel
            </Button>
            <Button onClick={openCreateModal} leftIcon={<Plus size={16} />}>
              New Product
            </Button>
          </Group>
        }
        metrics={[
          { label: "Products", value: products.length, tone: "brand" },
          { label: "Manufacturers", value: manufacturers.length },
          { label: "Commodities", value: commodities.length },
        ]}
      >
        <OperationsPanel
          title="Product Directory"
          description="Unified admin table with common search, row actions, and density."
          icon={Package}
        >
          <DataTable
            columns={columns}
            data={products}
            loading={isLoading}
            searchPlaceholder="Search products..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </OperationsPanel>
      </OperationsPage>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Product" : "New Product"}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Input
              label="Product Name"
              placeholder="Mechanical keyboard pro"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
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
            <Group grow align="flex-start">
              <Input
                label="MRP (Total Amount)"
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
                label="MRP/Unit (Single Price)"
                placeholder="1L or 500g"
                value={formData.mrpQuantity}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    mrpQuantity: event.target.value,
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
                  formData.mrp && formData.mrpQuantity
                    ? formData.mrp / parseFloat(formData.mrpQuantity) || 0
                    : 0,
                )}
                disabled
                leftElement={<IndianRupee size={16} />}
              />
              <Input
                label="Unit Type"
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
                  Download template first. Manufacturer and commodity names are
                  auto-created if missing. Use Stock Qnty column to set initial
                  inventory.
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

          <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} />

          {uploadFile ? (
            <Group gap="sm" wrap="nowrap">
              <CheckCircle2 size={18} color="var(--mantine-color-green-4)" />
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
