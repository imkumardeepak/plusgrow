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
  ArrowDownToLine,
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "../lib/toast";

import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Modal, ConfirmDialog } from "../components/atoms/Modal";
import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  CreatePoInvoiceDto,
  PoInvoiceFilters,
  PoInvoice,
  Product,
  poInvoicesApi,
  productsApi,
} from "../services/masterApi";

type DeleteTarget = { kind: "invoice"; row: PoInvoice } | null;
type InwardStatusFilter = "all" | "pending" | "printed";

const defaultToDate = format(new Date(), "yyyy-MM-dd");
const defaultFromDate = format(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  "yyyy-MM-dd",
);

const emptyInvoiceForm = (): CreatePoInvoiceDto => ({
  invoiceDate: new Date().toISOString().slice(0, 10),
  partyName: "",
  productId: 0,
  billedQty: 0,
});

export const Inward = memo(function Inward() {
  const [products, setProducts] = useState<Product[]>([]);
  const [poInvoices, setPoInvoices] = useState<PoInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRowsLoading, setIsRowsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InwardStatusFilter>("all");
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const [editingInvoice, setEditingInvoice] = useState<PoInvoice | null>(null);

  const [invoiceForm, setInvoiceForm] =
    useState<CreatePoInvoiceDto>(emptyInvoiceForm());

  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [productsData, invoicesData] = await Promise.all([
        productsApi.getAll(),
        poInvoicesApi.getAll(),
      ]);

      setProducts(productsData);
      setPoInvoices(invoicesData);
    } catch (error) {
      toast.error("Failed to load inward data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadInvoiceRows = useCallback(async (filters: PoInvoiceFilters) => {
    try {
      setIsRowsLoading(true);
      const invoiceData = await poInvoicesApi.getAll(filters);
      setPoInvoices(invoiceData);
    } catch {
      toast.error("Failed to load inward rows");
    } finally {
      setIsRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoiceRows({
      search,
      status: statusFilter,
      fromDate,
      toDate,
    });
  }, [fromDate, loadInvoiceRows, search, statusFilter, toDate]);

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: `${product.sku || "NO-SKU"} - ${product.name}`,
      })),
    [products],
  );

  const invoiceStats = useMemo(() => {
    const pendingPrint = poInvoices.filter((row) => !row.printed).length;
    const printedCount = poInvoices.length - pendingPrint;
    const totalBilled = poInvoices.reduce((sum, row) => sum + row.billedQty, 0);
    const totalRemaining = poInvoices.reduce(
      (sum, row) => sum + row.remainingAllocation,
      0,
    );
    const allottedCount = poInvoices.filter(
      (row) => row.locationAllotted,
    ).length;

    return {
      pendingPrint,
      printedCount,
      totalBilled,
      totalRemaining,
      allottedCount,
    };
  }, [poInvoices]);

  const resetInvoiceModal = () => {
    setEditingInvoice(null);
    setInvoiceForm(emptyInvoiceForm());
    setInvoiceModalOpen(false);
  };

  const openCreateInvoice = () => {
    setEditingInvoice(null);
    setInvoiceForm(emptyInvoiceForm());
    setInvoiceModalOpen(true);
  };

  const openEditInvoice = (row: PoInvoice) => {
    setEditingInvoice(row);
    setInvoiceForm({
      invoiceDate: row.invoiceDate.slice(0, 10),
      partyName: row.partyName,
      productId: row.productId,
      billedQty: row.billedQty,
    });
    setInvoiceModalOpen(true);
  };

  const handleInvoiceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!invoiceForm.productId || !invoiceForm.partyName.trim()) {
      toast.error("Party name and product are required");
      return;
    }

    setIsSavingInvoice(true);
    try {
      if (editingInvoice) {
        await poInvoicesApi.update(editingInvoice.id, invoiceForm);
        toast.success("PO invoice updated");
      } else {
        await poInvoicesApi.create(invoiceForm);
        toast.success("PO invoice created");
      }
      await loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
      });
      resetInvoiceModal();
    } catch (error: any) {
      toast.error(error.message || "Failed to save PO invoice");
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.kind === "invoice") {
        await poInvoicesApi.delete(deleteTarget.row.id);
        toast.success("PO invoice deleted");
      }
      await loadInvoiceRows({
        search,
        status: statusFilter,
        fromDate,
        toDate,
      });
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete row");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    poInvoicesApi.downloadTemplate();
    toast.success("Template downloaded successfully");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload a valid Excel file");
      return;
    }

    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const result = await poInvoicesApi.uploadExcel(uploadFile);
      if (result.success) {
        toast.success(`Imported ${result.importedCount} invoice rows`);
        if (result.errors?.length) {
          toast.warning(`${result.errors.length} rows had errors`);
        }
        await loadData();
        setIsUploadModalOpen(false);
        setUploadFile(null);
      } else {
        toast.error("Invoice upload failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload invoice file");
    } finally {
      setIsUploading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
  };

  return (
    <OperationsPage
      title="Purchase Invoices"
      description="Upload inward invoice rows here. Same records drive sticker printing and put-away."
      icon={ArrowDownToLine}
      hideHeader
    >
      <Stack gap="sm">
        <OperationsPanel
          title="Filters"
          icon={ArrowDownToLine}
          description="Status and invoice date window for inward rows."
        >
          <SimpleGrid cols={{ base: 1, lg: 4 }} spacing="sm">
            <Box>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                STATUS
              </Text>
              <SegmentedControl
                fullWidth
                size="xs"
                radius="md"
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(value as InwardStatusFilter)
                }
                data={[
                  { value: "all", label: "All" },
                  { value: "pending", label: "Pending" },
                  { value: "printed", label: "Printed" },
                ]}
              />
            </Box>

            <TextInput
              size="xs"
              radius="md"
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.currentTarget.value)}
            />

            <TextInput
              size="xs"
              radius="md"
              label="To Date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.currentTarget.value)}
            />

            <Box>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                QUICK RANGE
              </Text>
              <Group gap="xs" wrap="nowrap">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    setFromDate(defaultFromDate);
                    setToDate(defaultToDate);
                  }}
                >
                  Last 7 Days
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setStatusFilter("all");
                  }}
                >
                  Clear
                </Button>
              </Group>
            </Box>
          </SimpleGrid>
        </OperationsPanel>

        <OperationsPanel
          title="Inward Ledger"
          icon={FileText}
          description="Compact PO invoice view for upload, edit, delete, and downstream sticker or put-away flow."
          action={
            <Group gap="xs" wrap="nowrap">
              <Badge size="sm" radius="md" variant="light" color="gray">
                {poInvoices.length} rows
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="orange">
                {invoiceStats.pendingPrint} pending
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="green">
                {invoiceStats.printedCount} printed
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="cyan">
                {invoiceStats.totalRemaining} remain
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="blue">
                {invoiceStats.totalBilled} billed
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="teal">
                {invoiceStats.allottedCount} allotted
              </Badge>
              <TextInput
                size="xs"
                radius="md"
                w={240}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search invoice, party, SKU..."
                leftSection={<Search size={14} />}
              />
              <ActionIcon
                size="sm"
                radius="md"
                variant="light"
                color="gray"
                onClick={() =>
                  void loadInvoiceRows({
                    search,
                    status: statusFilter,
                    fromDate,
                    toDate,
                  })
                }
                loading={isRowsLoading}
                aria-label="Refresh inward data"
              >
                <RefreshCw size={14} />
              </ActionIcon>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<Upload className="h-3.5 w-3.5" />}
              >
                Upload Excel
              </Button>
              <Button
                size="sm"
                onClick={openCreateInvoice}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                New Row
              </Button>
            </Group>
          }
          contentClassName="p-0"
        >
          {isLoading || isRowsLoading ? (
            <Center h={260}>
              <Loader2 size={18} className="animate-spin text-cyan-400" />
            </Center>
          ) : poInvoices.length === 0 ? (
            <OperationsEmptyState
              icon={FileText}
              title="No inward rows"
              description="No PO invoice rows match current search or filter."
            />
          ) : (
            <ScrollArea>
              <Table
                highlightOnHover
                stickyHeader
                verticalSpacing={6}
                horizontalSpacing="sm"
                style={{ minWidth: 1120, fontSize: 12 }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Party</Table.Th>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Product</Table.Th>
                    <Table.Th ta="right">Billed</Table.Th>
                    <Table.Th ta="right">MRP</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th ta="right">Remaining</Table.Th>
                    <Table.Th>Allotted</Table.Th>
                    <Table.Th ta="right">Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {poInvoices.map((row) => (
                    <Table.Tr key={row.id}>
                      <Table.Td>
                        <Text size="xs" fw={800} ff="monospace">
                          {row.invoiceNumber}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="gray" size="xs" radius="sm">
                          {format(new Date(row.invoiceDate), "dd-MMM-yy")}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={700} lineClamp={1} maw={180}>
                          {row.partyName}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text ff="monospace" size="11px" c="cyan.3" fw={700}>
                          {row.skuCode}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" lineClamp={1} maw={260}>
                          {row.productName}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="xs" fw={800}>
                          {row.billedQty}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="xs" fw={700} c="green.4">
                          ₹{(row.mrp || 0).toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          radius="sm"
                          color={row.printed ? "green" : "orange"}
                          variant={row.printed ? "light" : "filled"}
                        >
                          {row.printed ? "Printed" : "Pending"}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="xs" fw={700} c="cyan.3">
                          {row.remainingAllocation}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          radius="sm"
                          color={row.locationAllotted ? "cyan" : "gray"}
                          variant={row.locationAllotted ? "light" : "filled"}
                        >
                          {row.locationAllotted ? "Yes" : "No"}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <Tooltip label="Edit row">
                            <ActionIcon
                              size="sm"
                              radius="md"
                              variant="light"
                              color="blue"
                              onClick={() => openEditInvoice(row)}
                            >
                              <Edit2 size={15} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete row">
                            <ActionIcon
                              size="sm"
                              radius="md"
                              variant="light"
                              color="red"
                              onClick={() =>
                                setDeleteTarget({ kind: "invoice", row })
                              }
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
          )}
        </OperationsPanel>
      </Stack>

      <Modal
        isOpen={invoiceModalOpen}
        onClose={resetInvoiceModal}
        title={editingInvoice ? "Edit PO Invoice" : "New PO Invoice"}
        size="xl"
      >
        <form onSubmit={handleInvoiceSubmit}>
          <Stack gap="md">
            <Paper radius="lg" p="md" withBorder bg="transparent">
              <Stack gap="md">
                <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                  Invoice Details
                </Text>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Input
                    label="Invoice Date"
                    type="date"
                    value={invoiceForm.invoiceDate}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        invoiceDate: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Party Name"
                    value={invoiceForm.partyName}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        partyName: e.target.value,
                      }))
                    }
                    placeholder="Enter party name"
                  />
                </SimpleGrid>
                <Select
                  label="Product"
                  placeholder="Select product"
                  data={productOptions.map((p) => ({
                    value: String(p.value),
                    label: p.label,
                  }))}
                  value={
                    invoiceForm.productId ? String(invoiceForm.productId) : null
                  }
                  onChange={(value) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      productId: value ? Number(value) : 0,
                    }))
                  }
                  searchable
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
                  label="Billed Qty."
                  type="number"
                  min="0"
                  value={invoiceForm.billedQty}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      billedQty: Number(e.target.value),
                    }))
                  }
                />
              </Stack>
            </Paper>

            <Group justify="flex-end" pt="sm">
              <Button
                type="button"
                variant="outline"
                onClick={resetInvoiceModal}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSavingInvoice}>
                {editingInvoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Import PO Invoices from Excel"
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
                  <Text fw={700}>PO Invoice Import Template</Text>
                  <Text size="sm" c="dimmed">
                    Download template first. SKU or product name must match an
                    existing product.
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
                  Select Excel file to import PO invoice data.
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
              Import Invoices
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Row"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </OperationsPage>
  );
});

export default Inward;
