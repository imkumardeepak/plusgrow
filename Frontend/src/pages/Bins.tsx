import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  Box as BoxIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit2,
  FileSpreadsheet,
  Loader2,
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
  OperationsEmptyState,
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
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginationData = useMemo(() => {
    const totalItems = filteredBins.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedItems = filteredBins.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      paginatedItems,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  }, [filteredBins, currentPage, pageSize]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, paginationData.totalPages || 1)));
  };

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
                  New Bin
                </Button>
              </Group>
            }
            contentClassName="p-0"
          >
            {isLoading ? (
              <Center h={260}>
                <Loader2 size={18} className="animate-spin text-cyan-400" />
              </Center>
            ) : filteredBins.length === 0 ? (
              <OperationsEmptyState
                icon={BoxIcon}
                title="No bins found"
                description="No bin records match current search."
              />
            ) : (
              <>
                <ScrollArea>
                  <Table
                    highlightOnHover
                    stickyHeader
                    verticalSpacing={6}
                    horizontalSpacing="sm"
                    style={{ minWidth: 600, fontSize: 12 }}
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Bin Code</Table.Th>
                        <Table.Th>Created</Table.Th>
                        <Table.Th ta="right">Action</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginationData.paginatedItems.map((row) => (
                        <Table.Tr key={row.id}>
                          <Table.Td>
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
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              variant="light"
                              color="gray"
                              size="xs"
                              radius="sm"
                            >
                              {row.createdAt
                                ? format(new Date(row.createdAt), "dd-MMM-yy")
                                : "N/A"}
                            </Badge>
                          </Table.Td>
                          <Table.Td ta="right">
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
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {/* Pagination Controls */}
                {paginationData.totalItems > pageSize && (
                  <Group
                    justify="space-between"
                    align="center"
                    px="md"
                    py="sm"
                    style={{
                      borderTop: "1px solid rgba(255, 255, 255, 0.07)",
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      Showing{" "}
                      <Text component="span" fw={700} c="cyan.3">
                        {paginationData.startIndex + 1}-
                        {paginationData.endIndex}
                      </Text>{" "}
                      of{" "}
                      <Text component="span" fw={700} c="cyan.3">
                        {paginationData.totalItems}
                      </Text>{" "}
                      bins
                    </Text>

                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="gray"
                        onClick={() => goToPage(1)}
                        disabled={!paginationData.hasPrevPage}
                        aria-label="First page"
                      >
                        <ChevronsLeft size={16} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="gray"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={!paginationData.hasPrevPage}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </ActionIcon>

                      <Group gap={4} wrap="nowrap">
                        {Array.from(
                          { length: Math.min(5, paginationData.totalPages) },
                          (_, i) => {
                            let pageNum: number;
                            if (paginationData.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              currentPage >=
                              paginationData.totalPages - 2
                            ) {
                              pageNum = paginationData.totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <ActionIcon
                                key={pageNum}
                                size="sm"
                                variant={
                                  currentPage === pageNum ? "filled" : "light"
                                }
                                color={
                                  currentPage === pageNum ? "cyan" : "gray"
                                }
                                onClick={() => goToPage(pageNum)}
                                style={{
                                  fontWeight: 700,
                                  fontSize: 11,
                                }}
                              >
                                {pageNum}
                              </ActionIcon>
                            );
                          },
                        )}
                      </Group>

                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="gray"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={!paginationData.hasNextPage}
                        aria-label="Next page"
                      >
                        <ChevronRight size={16} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="gray"
                        onClick={() => goToPage(paginationData.totalPages)}
                        disabled={!paginationData.hasNextPage}
                        aria-label="Last page"
                      >
                        <ChevronsRight size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                )}
              </>
            )}
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
