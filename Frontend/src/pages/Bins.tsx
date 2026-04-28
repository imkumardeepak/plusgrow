import React, { memo, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  Box,
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
  Loader2,
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
import { binsApi, Bin, CreateBinDto } from "../services/masterApi";

export const Bins = memo(function Bins() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Bin | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<CreateBinDto>({
    binCode: "",
  });

  const loadBins = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await binsApi.getAll();
      setBins(data);
    } catch {
      toast.error("Failed to load bins");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBins();
  }, [loadBins]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.binCode.trim()) {
      toast.error("Bin code is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await binsApi.update(isEditing.id, formData);
        toast.success("Bin updated successfully");
      } else {
        await binsApi.create(formData);
        toast.success("Bin created successfully");
      }
      await loadBins();
      closeModal();
    } catch (error: any) {
      toast.error(error.message || "Failed to save bin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ binCode: "" });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bin: Bin) => {
    setFormData({
      binCode: bin.binCode,
      id: bin.id,
    });
    setIsEditing(bin);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ binCode: "" });
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await binsApi.delete(deleteTarget.id);
      toast.success("Bin deleted successfully");
      await loadBins();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete bin");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    binsApi.downloadTemplate();
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
      const result = await binsApi.uploadExcel(uploadFile);
      if (result.success) {
        toast.success(`Successfully imported ${result.importedCount} bins`);
        await loadBins();
        setIsUploadModalOpen(false);
        setUploadFile(null);
      } else {
        toast.error("Import failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Error uploading file");
    } finally {
      setIsUploading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
  };

  const columns = createTableColumns<Bin>(
    [
      {
        accessorKey: "binCode",
        header: "Bin Code",
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
              <Box size={18} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              {row.binCode}
            </Text>
          </Group>
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

  return (
    <>
      <OperationsPage
        title="Bin Master"
        description="Storage bins use same Mantine-first admin patterns as every master screen."
        icon={Box}
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
              New Bin
            </Button>
          </Group>
        }
        metrics={[{ label: "Bins", value: bins.length, tone: "brand" }]}
      >
        <OperationsPanel
          title="Bin Directory"
          description="Search, import, edit, and delete within one shared table shell."
          icon={Box}
        >
          <DataTable
            columns={columns}
            data={bins}
            loading={isLoading}
            searchPlaceholder="Search bins..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </OperationsPanel>
      </OperationsPage>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Bin" : "New Bin"}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Input
              label="Bin Code"
              placeholder="A-101-B"
              value={formData.binCode}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  binCode: event.target.value,
                }))
              }
              leftElement={<Box size={16} />}
              required
            />
            <Group justify="flex-end" pt="sm">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Update Bin" : "Create Bin"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Import Bins from Excel"
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
                <Text fw={700}>Bin Import Template</Text>
                <Text size="sm" c="dimmed">
                  Download template first. Each row should contain one bin code.
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
              Select Excel file to import bin master data.
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
              Import Bins
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Bin"
        message={`Delete "${deleteTarget?.binCode}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
});

export default Bins;
