import React, { memo, useEffect, useMemo, useState } from "react";
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
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { exportToExcel } from "../hooks/useExcelExport";
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
  commoditiesApi,
  Commodity,
  CreateCommodityDto,
} from "../services/masterApi";

export const Commodities = memo(function Commodities() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Commodity | null>(null);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Commodity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<CreateCommodityDto>({
    name: "",
  });

  useEffect(() => {
    loadCommodities();
  }, []);

  const loadCommodities = async () => {
    try {
      setIsLoading(true);
      const data = await commoditiesApi.getAll();
      setCommodities(data);
    } catch {
      toast.error("Failed to load commodities");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Commodity name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await commoditiesApi.update(isEditing.id, formData);
        toast.success("Commodity updated successfully");
      } else {
        await commoditiesApi.create(formData);
        toast.success("Commodity created successfully");
      }
      await loadCommodities();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save commodity");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "" });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (commodity: Commodity) => {
    setFormData({ name: commodity.name });
    setIsEditing(commodity);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ name: "" });
  };

  const handleDownloadTemplate = () => {
    commoditiesApi.downloadTemplate();
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
      const result = await commoditiesApi.uploadExcel(uploadFile);
      if (result.success) {
        toast.success(
          `Successfully imported ${result.importedCount} commodities`,
        );
        if (result.errors?.length) {
          toast.warning(`${result.errors.length} rows had errors`);
        }
        await loadCommodities();
        setIsUploadModalOpen(false);
        setUploadFile(null);
      } else {
        toast.error("Failed to import commodities");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to import commodities",
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
      await commoditiesApi.delete(deleteTarget.id);
      toast.success("Commodity deleted successfully");
      await loadCommodities();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete commodity");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCommodities = useMemo(() => {
    if (!search.trim()) return commodities;
    const searchLower = search.toLowerCase();
    return commodities.filter((c) =>
      c.name.toLowerCase().includes(searchLower),
    );
  }, [commodities, search]);

  const columns: DataTableColumn<Commodity>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      sortAccessor: (row) => row.id,
      render: (row) => (
        <Text size="xs" c="dimmed" ff="monospace">
          #{row.id}
        </Text>
      ),
      width: 80,
    },
    {
      key: "name",
      header: "Commodity",
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
            <Tag size={16} />
          </ThemeIcon>
          <Text fw={700} size="sm">
            {row.name}
          </Text>
        </Group>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit commodity">
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
          <Tooltip label="Delete commodity">
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

  return (
    <>
      <OperationsPage
        title="Commodities"
        description="Category management follows same SaaS form and table language as all master modules."
        icon={Tag}
        hideHeader
      >
        <Stack gap="sm">
          <OperationsPanel
            title="Commodity Registry"
            description="Single search, single action menu, single visual system."
            icon={Tag}
            action={
              <Group gap="xs" wrap="nowrap">
                <Badge size="sm" radius="md" variant="light" color="gray">
                  {commodities.length} categories
                </Badge>
                <Input
                  size="xs"
                  radius="md"
                  w={240}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search commodities..."
                  leftElement={<Search size={14} />}
                />
                <ActionIcon
                  size="sm"
                  radius="md"
                  variant="light"
                  color="gray"
                  onClick={() => void loadCommodities()}
                  loading={isLoading}
                  aria-label="Refresh commodity data"
                >
                  <RefreshCw size={14} />
                </ActionIcon>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Download size={14} />}
                  onClick={() => {
                    exportToExcel({
                      fileName: "Commodities_Export",
                      sheets: [{
                        sheetName: "Commodities",
                        data: filteredCommodities,
                        columns: [
                          { header: "Commodity Name", accessor: (row) => row.name },
                        ],
                      }],
                    });
                    toast.success("Commodities exported successfully");
                  }}
                >
                  Export Excel
                </Button>
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
                  New Commodity
                </Button>
              </Group>
            }
            contentClassName="p-0"
          >
            <MantineDataTable<Commodity>
              data={filteredCommodities}
              columns={columns}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyIcon={Tag}
              emptyTitle="No commodities found"
              emptyDescription="No commodity records match current search."
              itemLabel="categories"
              resetPageKey={search}
            />
          </OperationsPanel>
        </Stack>
      </OperationsPage>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Commodity" : "New Commodity"}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Input
              label="Commodity Name"
              placeholder="Raw materials, packaging, finished goods..."
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              leftElement={<Tag size={16} />}
              required
            />
            <Group justify="flex-end" pt="sm">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Update Commodity" : "Create Commodity"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Commodity"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      <Modal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Import Commodities from Excel"
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
                <Text fw={700}>Commodity Import Template</Text>
                <Text size="sm" c="dimmed">
                  Download template first. Existing commodities will be skipped.
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
              Select Excel file to import commodity data.
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
              Import Commodities
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
});

export default Commodities;
