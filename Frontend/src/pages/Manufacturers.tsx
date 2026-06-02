import React, { memo, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  Building,
  CheckCircle2,
  Download,
  Edit2,
  Factory,
  FileSpreadsheet,
  Globe,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
  manufacturersApi,
  Manufacturer,
  CreateManufacturerDto,
} from "../services/masterApi";

export const Manufacturers = memo(function Manufacturers() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Manufacturer | null>(null);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<CreateManufacturerDto>({
    name: "",
    country: "",
    address: "",
  });

  useEffect(() => {
    loadManufacturers();
  }, []);

  const loadManufacturers = async () => {
    try {
      setIsLoading(true);
      const data = await manufacturersApi.getAll();
      setManufacturers(data);
    } catch {
      toast.error("Failed to load manufacturers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Manufacturer name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await manufacturersApi.update(isEditing.id, formData);
        toast.success("Manufacturer updated successfully");
      } else {
        await manufacturersApi.create(formData);
        toast.success("Manufacturer created successfully");
      }
      await loadManufacturers();
      closeModal();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to save manufacturer",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "", country: "", address: "" });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (manufacturer: Manufacturer) => {
    setFormData({
      name: manufacturer.name,
      country: manufacturer.country || "",
      address: manufacturer.address || "",
    });
    setIsEditing(manufacturer);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ name: "", country: "", address: "" });
  };

  const handleDownloadTemplate = () => {
    manufacturersApi.downloadTemplate();
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
      const result = await manufacturersApi.uploadExcel(uploadFile);
      if (result.success) {
        toast.success(
          `Successfully imported ${result.importedCount} manufacturers`,
        );
        if (result.errors?.length) {
          toast.warning(`${result.errors.length} rows had errors`);
        }
        await loadManufacturers();
        setIsUploadModalOpen(false);
        setUploadFile(null);
      } else {
        toast.error("Failed to import manufacturers");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to import manufacturers",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await manufacturersApi.delete(deleteTarget.id);
      toast.success("Manufacturer deleted successfully");
      await loadManufacturers();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete manufacturer");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredManufacturers = useMemo(() => {
    if (!search.trim()) return manufacturers;
    const searchLower = search.toLowerCase();
    return manufacturers.filter(
      (m) =>
        m.name.toLowerCase().includes(searchLower) ||
        (m.country && m.country.toLowerCase().includes(searchLower)) ||
        (m.address && m.address.toLowerCase().includes(searchLower)),
    );
  }, [manufacturers, search]);

  const columns: DataTableColumn<Manufacturer>[] = [
    {
      key: "name",
      header: "Manufacturer",
      sortable: true,
      sortAccessor: (row) => row.name,
      render: (row) => (
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon
            size={36}
            radius="lg"
            variant="light"
            color="cyan"
            style={{
              background: "rgba(30, 192, 243, 0.12)",
              border: "1px solid rgba(30, 192, 243, 0.18)",
            }}
          >
            <Factory size={16} />
          </ThemeIcon>
          <Text fw={700} size="sm">
            {row.name}
          </Text>
        </Group>
      ),
    },
    {
      key: "country",
      header: "Country",
      sortable: true,
      sortAccessor: (row) => row.country,
      render: (row) => (
        <Text size="xs" c="cyan.3">
          {row.country || "N/A"}
        </Text>
      ),
      width: 120,
    },
    {
      key: "address",
      header: "Address",
      sortable: true,
      sortAccessor: (row) => row.address,
      render: (row) => (
        <Text size="xs" lineClamp={1} maw={240}>
          {row.address || "N/A"}
        </Text>
      ),
    },

    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit manufacturer">
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
          <Tooltip label="Delete manufacturer">
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
      width: 120,
    },
  ];

  const manufacturerStats = useMemo(() => {
    const withCountry = manufacturers.filter((m) => m.country).length;
    const withAddress = manufacturers.filter((m) => m.address).length;
    return { withCountry, withAddress };
  }, [manufacturers]);

  return (
    <>
      <OperationsPage
        title="Manufacturers"
        description="Keep production partners and origin details under one shared SaaS master-data style."
        icon={Factory}
        hideHeader
      >
        <Stack gap="sm">
          <OperationsPanel
            title="Manufacturer Directory"
            description="Same table system, same spacing, same action model."
            icon={Factory}
            action={
              <Group gap="xs" wrap="nowrap">
                <Badge size="sm" radius="md" variant="light" color="gray">
                  {manufacturers.length} partners
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="blue">
                  {manufacturerStats.withCountry} with country
                </Badge>
                <Input
                  size="xs"
                  radius="md"
                  w={240}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search manufacturers, country..."
                  leftElement={<Search size={14} />}
                />
                <ActionIcon
                  size="sm"
                  radius="md"
                  variant="light"
                  color="gray"
                  onClick={() => void loadManufacturers()}
                  loading={isLoading}
                  aria-label="Refresh manufacturer data"
                >
                  <RefreshCw size={14} />
                </ActionIcon>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Upload size={14} />}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  Import Excel
                </Button>
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  leftIcon={<Plus size={14} />}
                >
                  New Manufacturer
                </Button>
              </Group>
            }
            contentClassName="p-0"
          >
            <MantineDataTable<Manufacturer>
              data={filteredManufacturers}
              columns={columns}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyIcon={Factory}
              emptyTitle="No manufacturers found"
              emptyDescription="No manufacturer records match current search."
              itemLabel="partners"
              resetPageKey={search}
            />
          </OperationsPanel>
        </Stack>
      </OperationsPage>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Manufacturer" : "New Manufacturer"}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Input
              label="Company Name"
              placeholder="Partner legal name"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              leftElement={<Building size={16} />}
              required
            />
            <Group grow align="flex-start">
              <Input
                label="Country"
                placeholder="Country of origin"
                value={formData.country}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    country: event.target.value,
                  }))
                }
                leftElement={<Globe size={16} />}
              />
              <Input
                label="Address"
                placeholder="Location summary"
                value={formData.address}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
                leftElement={<MapPin size={16} />}
              />
            </Group>
            <Group justify="flex-end" pt="sm">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Update Manufacturer" : "Create Manufacturer"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Manufacturer"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      <Modal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Import Manufacturers from Excel"
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
                <Text fw={700}>Manufacturer Import Template</Text>
                <Text size="sm" c="dimmed">
                  Download template first. Existing manufacturers will be
                  skipped.
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
              Select Excel file to import manufacturer data.
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
              Import Manufacturers
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
});

export default Manufacturers;
