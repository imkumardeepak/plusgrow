import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  Box as BoxIcon,
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  ScanBarcode,
} from "lucide-react";
import { exportToExcel, formatExcelDate } from "../hooks/useExcelExport";
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
import { binsApi, Bin, CreateBinDto } from "../services/masterApi";

export const Bins = memo(function Bins() {
  const navigate = useNavigate();
  const [bins, setBins] = useState<Bin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Bin | null>(null);
  const [search, setSearch] = useState("");
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

  const filteredBins = useMemo(() => {
    if (!search.trim()) return bins;
    const searchLower = search.toLowerCase();
    return bins.filter((b) => b.binCode.toLowerCase().includes(searchLower));
  }, [bins, search]);

  const columns: DataTableColumn<Bin>[] = [
    {
      key: "binCode",
      header: "Bin Code",
      sortable: true,
      sortAccessor: (row) => row.binCode,
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
            <BoxIcon size={16} />
          </ThemeIcon>
          <Text fw={700} size="sm" ff="monospace">
            {row.binCode}
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
          <Tooltip label="Edit bin">
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
          <Tooltip label="Delete bin">
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
        title="Bin Master"
        description="Storage bins use same Mantine-first admin patterns as every master screen."
        icon={BoxIcon}
        hideHeader
      >
        <Stack gap="sm">
          <OperationsPanel
            title="Bin Directory"
            description="Search, import, edit, and delete within one shared table shell."
            icon={BoxIcon}
            action={
              <Group gap="xs" wrap="nowrap">
                <Badge size="sm" radius="md" variant="light" color="gray">
                  {bins.length} bins
                </Badge>
                <Input
                  size="xs"
                  radius="md"
                  w={240}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search bin codes..."
                  leftElement={<Search size={14} />}
                />
                <ActionIcon
                  size="sm"
                  radius="md"
                  variant="light"
                  color="gray"
                  onClick={() => void loadBins()}
                  loading={isLoading}
                  aria-label="Refresh bin data"
                >
                  <RefreshCw size={14} />
                </ActionIcon>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Download size={14} />}
                  onClick={() => {
                    exportToExcel({
                      fileName: "Bins_Export",
                      sheets: [{
                        sheetName: "Bins",
                        data: filteredBins,
                        columns: [
                          { header: "Bin Code", accessor: (row) => row.binCode },
                          { header: "Created At", accessor: (row) => formatExcelDate(row.createdAt) },
                        ],
                      }],
                    });
                    toast.success("Bins exported successfully");
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
                  variant="outline"
                  leftIcon={<ScanBarcode size={14} />}
                  onClick={() => navigate("/bin-movement")}
                >
                  Bin Movement
                </Button>
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  leftIcon={<Plus size={14} />}
                >
                  New Bin
                </Button>
              </Group>
            }
            contentClassName="p-0"
          >
            <MantineDataTable<Bin>
              data={filteredBins}
              columns={columns}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyIcon={BoxIcon}
              emptyTitle="No bins found"
              emptyDescription="No bin records match current search."
              itemLabel="bins"
              resetPageKey={search}
            />
          </OperationsPanel>
        </Stack>
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
