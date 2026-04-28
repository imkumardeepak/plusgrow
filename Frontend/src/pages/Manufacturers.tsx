import React, { memo, useEffect, useState } from "react";
import { format } from "date-fns";
import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
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
  Trash2,
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
  manufacturersApi,
  Manufacturer,
  CreateManufacturerDto,
} from "../services/masterApi";

export const Manufacturers = memo(function Manufacturers() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Manufacturer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const columns = createTableColumns<Manufacturer>(
    [
      {
        accessorKey: "name",
        header: "Manufacturer",
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
              <Factory size={18} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text fw={700} size="sm">
                {row.name}
              </Text>
              <Group gap="xs">
                {row.country ? (
                  <Group gap={4} wrap="nowrap">
                    <Globe size={12} color="var(--mantine-color-gray-5)" />
                    <Text size="11px" c="dimmed">
                      {row.country}
                    </Text>
                  </Group>
                ) : null}
                {row.address ? (
                  <Group gap={4} wrap="nowrap">
                    <MapPin size={12} color="var(--mantine-color-gray-5)" />
                    <Text size="11px" c="dimmed" lineClamp={1}>
                      {row.address}
                    </Text>
                  </Group>
                ) : null}
              </Group>
            </Stack>
          </Group>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Registered",
        cell: (row) => (
          <Text size="11px" c="dimmed">
            {row.created_at
              ? format(new Date(row.created_at), "dd MMM yyyy")
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

  return (
    <>
      <OperationsPage
        title="Manufacturers"
        description="Keep production partners and origin details under one shared SaaS master-data style."
        icon={Factory}
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
              New Manufacturer
            </Button>
          </Group>
        }
        metrics={[
          { label: "Partners", value: manufacturers.length, tone: "brand" },
          {
            label: "With Country",
            value: manufacturers.filter((item) => item.country).length,
          },
        ]}
      >
        <OperationsPanel
          title="Manufacturer Directory"
          description="Same table system, same spacing, same action model."
          icon={Factory}
        >
          <DataTable
            columns={columns}
            data={manufacturers}
            loading={isLoading}
            searchPlaceholder="Search manufacturers..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </OperationsPanel>
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
