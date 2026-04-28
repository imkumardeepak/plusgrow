import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Badge, Grid, Group, Select, Stack, Text } from "@mantine/core";
import {
  ArrowDownToLine,
  Edit2,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "../lib/toast";

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
import {
  CreatePoInvoiceDto,
  PoInvoice,
  Product,
  ImportResult,
  poInvoicesApi,
  productsApi,
} from "../services/masterApi";

type DeleteTarget = { kind: "invoice"; row: PoInvoice } | null;

const emptyInvoiceForm = (): CreatePoInvoiceDto => ({
  invoiceDate: new Date().toISOString().slice(0, 10),
  partyName: "",
  productId: 0,
  billedQty: 0,
  printed: false,
  remainingAllocation: 0,
  locationAllotted: false,
});

export const Inward = memo(function Inward() {
  const [products, setProducts] = useState<Product[]>([]);
  const [poInvoices, setPoInvoices] = useState<PoInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [invoiceSearch, setInvoiceSearch] = useState("");

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const [editingInvoice, setEditingInvoice] = useState<PoInvoice | null>(null);

  const [invoiceForm, setInvoiceForm] =
    useState<CreatePoInvoiceDto>(emptyInvoiceForm());

  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingInvoices, setIsUploadingInvoices] = useState(false);

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
    loadData();
  }, [loadData]);

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
    const totalBilled = poInvoices.reduce((sum, row) => sum + row.billedQty, 0);
    const totalRemaining = poInvoices.reduce(
      (sum, row) => sum + row.remainingAllocation,
      0,
    );
    const allottedCount = poInvoices.filter(
      (row) => row.locationAllotted,
    ).length;

    return { pendingPrint, totalBilled, totalRemaining, allottedCount };
  }, [poInvoices]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.toLowerCase();
    return poInvoices.filter(
      (row) =>
        row.partyName.toLowerCase().includes(q) ||
        row.skuCode.toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q),
    );
  }, [invoiceSearch, poInvoices]);

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
      printed: row.printed,
      remainingAllocation: row.remainingAllocation,
      locationAllotted: row.locationAllotted,
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
      await loadData();
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
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete row");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInvoiceUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingInvoices(true);
    try {
      const result: ImportResult = await poInvoicesApi.uploadExcel(file);
      if (result.success) {
        toast.success(`Imported ${result.importedCount} invoice rows`);
        if (result.errors?.length) {
          toast.warning(
            `${result.errors.length} rows skipped. Check product SKU/name mapping.`,
          );
        }
        await loadData();
      } else {
        toast.error("Invoice upload failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload invoice file");
    } finally {
      setIsUploadingInvoices(false);
      if (event.target) event.target.value = "";
    }
  };

  const invoiceColumns = createTableColumns<PoInvoice>(
    [
      {
        accessorKey: "invoiceDate",
        header: "Invoice Date",
        cell: (row) => (
          <Badge variant="light" color="gray" size="sm" radius="md">
            {format(new Date(row.invoiceDate), "dd-MMM-yy")}
          </Badge>
        ),
      },
      {
        accessorKey: "partyName",
        header: "Party Name",
        cell: (row) => (
          <Text fw={700} c="white" size="sm">
            {row.partyName}
          </Text>
        ),
      },
      {
        accessorKey: "skuCode",
        header: "SKU Code",
        cell: (row) => (
          <Text ff="monospace" size="11px" c="cyan.3" fw={700}>
            {row.skuCode}
          </Text>
        ),
      },
      {
        accessorKey: "productName",
        header: "Product Name",
        cell: (row) => (
          <Text size="sm" c="gray.3">
            {row.productName}
          </Text>
        ),
      },
      {
        accessorKey: "billedQty",
        header: "Billed Qty.",
        cell: (row) => (
          <Text fw={700} c="white">
            {row.billedQty}
          </Text>
        ),
      },
      {
        accessorKey: "mrp",
        header: "MRP",
        cell: (row) => (
          <Text fw={600} c="green.4">
            ₹{(row.mrp || 0).toLocaleString()}
          </Text>
        ),
      },
      {
        accessorKey: "printed",
        header: "Printed",
        cell: (row) => (
          <Badge
            variant="light"
            color={row.printed ? "green" : "yellow"}
            size="sm"
            radius="xl"
          >
            {row.printed ? "TRUE" : "FALSE"}
          </Badge>
        ),
      },
      {
        accessorKey: "remainingAllocation",
        header: "Remaining Allocation",
        cell: (row) => (
          <Text fw={600} c="cyan.3">
            {row.remainingAllocation}
          </Text>
        ),
      },
      {
        accessorKey: "locationAllotted",
        header: "Location Allotted",
        cell: (row) => (
          <Badge
            variant="light"
            color={row.locationAllotted ? "cyan" : "gray"}
            size="sm"
            radius="xl"
          >
            {row.locationAllotted ? "TRUE" : "FALSE"}
          </Badge>
        ),
      },
    ],
    [
      {
        label: "Edit",
        icon: <Edit2 className="h-4 w-4" />,
        onClick: openEditInvoice,
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: (row) => setDeleteTarget({ kind: "invoice", row }),
        variant: "destructive",
      },
    ],
  );

  return (
    <OperationsPage
      title="Purchase Invoices"
      description="Upload inward invoice rows here. Same records drive sticker printing and put-away."
      icon={ArrowDownToLine}
      metrics={[
        { label: "Invoices", value: poInvoices.length },
        {
          label: "Pending Print",
          value: invoiceStats.pendingPrint,
          tone: "warning",
        },
        {
          label: "Remaining Allocation",
          value: invoiceStats.totalRemaining,
          tone: "brand",
        },
        {
          label: "Fully Allotted",
          value: invoiceStats.allottedCount,
          tone: "success",
        },
      ]}
    >
      <OperationsPanel
        title="Inward Ledger"
        icon={FileText}
        description="Import Excel or add a single inward line manually."
        action={
          <Group gap="xs">
            <div className="relative">
              <input
                type="file"
                id="invoice-upload"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleInvoiceUpload}
                disabled={isUploadingInvoices}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  document.getElementById("invoice-upload")?.click()
                }
                leftIcon={
                  isUploadingInvoices ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )
                }
                disabled={isUploadingInvoices}
              >
                {isUploadingInvoices ? "Uploading…" : "Upload Excel"}
              </Button>
            </div>
            <Button
              size="sm"
              onClick={openCreateInvoice}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              New Row
            </Button>
          </Group>
        }
      >
        <DataTable
          columns={invoiceColumns}
          data={filteredInvoices}
          loading={isLoading}
          searchPlaceholder="Search party, SKU, or product..."
          onSearch={setInvoiceSearch}
          searchValue={invoiceSearch}
        />
      </OperationsPanel>

      <Modal
        isOpen={invoiceModalOpen}
        onClose={resetInvoiceModal}
        title={editingInvoice ? "Edit PO Invoice" : "New PO Invoice"}
        size="xl"
      >
        <form onSubmit={handleInvoiceSubmit}>
          <Stack gap="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
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
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
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
              </Grid.Col>
              <Grid.Col span={12}>
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
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
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
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Input
                  label="Remaining Allocation"
                  type="number"
                  min="0"
                  value={invoiceForm.remainingAllocation}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      remainingAllocation: Number(e.target.value),
                    }))
                  }
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select
                  label="Printed"
                  data={[
                    { value: "true", label: "TRUE" },
                    { value: "false", label: "FALSE" },
                  ]}
                  value={invoiceForm.printed ? "true" : "false"}
                  onChange={(value) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      printed: value === "true",
                    }))
                  }
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
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select
                  label="Location Allotted"
                  data={[
                    { value: "true", label: "TRUE" },
                    { value: "false", label: "FALSE" },
                  ]}
                  value={invoiceForm.locationAllotted ? "true" : "false"}
                  onChange={(value) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      locationAllotted: value === "true",
                    }))
                  }
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
              </Grid.Col>
            </Grid>

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
