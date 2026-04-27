import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowDownToLine,
  Edit2,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from '../lib/toast';

import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Modal, ConfirmDialog } from '../components/atoms/Modal';
import { DataTable, createTableColumns } from '../components/molecules/DataTable';
import { OperationsPage, OperationsPanel } from '../components/organisms/Operations/OperationsShell';
import {
  CreatePoInvoiceDto,
  PoInvoice,
  Product,
  ImportResult,
  poInvoicesApi,
  productsApi,
} from '../services/masterApi';

type DeleteTarget =
  | { kind: 'invoice'; row: PoInvoice }
  | null;

const emptyInvoiceForm = (): CreatePoInvoiceDto => ({
  invoiceDate: new Date().toISOString().slice(0, 10),
  partyName: '',
  productId: 0,
  billedQty: 0,
  printed: false,
  remainingAllocation: 0,
  locationAllotted: false,
});

const themedSelectClassName =
  'h-9 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer';

export const Inward = memo(function Inward() {
  const [products, setProducts] = useState<Product[]>([]);
  const [poInvoices, setPoInvoices] = useState<PoInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [invoiceSearch, setInvoiceSearch] = useState('');

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const [editingInvoice, setEditingInvoice] = useState<PoInvoice | null>(null);

  const [invoiceForm, setInvoiceForm] = useState<CreatePoInvoiceDto>(emptyInvoiceForm());

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
      toast.error('Failed to load inward data');
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
        label: `${product.sku || 'NO-SKU'} - ${product.name}`,
      })),
    [products]
  );

  const invoiceStats = useMemo(() => {
    const pendingPrint = poInvoices.filter((row) => !row.printed).length;
    const totalBilled = poInvoices.reduce((sum, row) => sum + row.billedQty, 0);
    const totalRemaining = poInvoices.reduce((sum, row) => sum + row.remainingAllocation, 0);
    const allottedCount = poInvoices.filter((row) => row.locationAllotted).length;

    return { pendingPrint, totalBilled, totalRemaining, allottedCount };
  }, [poInvoices]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.toLowerCase();
    return poInvoices.filter(
      (row) =>
        row.partyName.toLowerCase().includes(q) ||
        row.skuCode.toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q)
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
      toast.error('Party name and product are required');
      return;
    }

    setIsSavingInvoice(true);
    try {
      if (editingInvoice) {
        await poInvoicesApi.update(editingInvoice.id, invoiceForm);
        toast.success('PO invoice updated');
      } else {
        await poInvoicesApi.create(invoiceForm);
        toast.success('PO invoice created');
      }
      await loadData();
      resetInvoiceModal();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save PO invoice');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.kind === 'invoice') {
        await poInvoicesApi.delete(deleteTarget.row.id);
        toast.success('PO invoice deleted');
      }
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete row');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInvoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingInvoices(true);
    try {
      const result: ImportResult = await poInvoicesApi.uploadExcel(file);
      if (result.success) {
        toast.success(`Imported ${result.importedCount} invoice rows`);
        if (result.errors?.length) {
          toast.warning(`${result.errors.length} rows skipped. Check product SKU/name mapping.`);
        }
        await loadData();
      } else {
        toast.error('Invoice upload failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload invoice file');
    } finally {
      setIsUploadingInvoices(false);
      if (event.target) event.target.value = '';
    }
  };

  const invoiceColumns = createTableColumns<PoInvoice>(
    [
      {
        accessorKey: 'invoiceDate',
        header: 'Invoice Date',
        cell: (row) => (
          <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-neutral-200">
            {format(new Date(row.invoiceDate), 'dd-MMM-yy')}
          </span>
        ),
      },
      {
        accessorKey: 'partyName',
        header: 'Party Name',
        cell: (row) => <span className="font-semibold text-white">{row.partyName}</span>,
      },
      {
        accessorKey: 'skuCode',
        header: 'SKU Code',
        cell: (row) => (
          <span className="inline-flex rounded-lg border border-brand-500/20 bg-brand-500/10 px-2 py-1 font-mono text-xs text-brand-400">
            {row.skuCode}
          </span>
        ),
      },
      {
        accessorKey: 'productName',
        header: 'Product Name',
        cell: (row) => <span className="text-sm text-neutral-200">{row.productName}</span>,
      },
      {
        accessorKey: 'billedQty',
        header: 'Billed Qty.',
        cell: (row) => <span className="font-bold text-white">{row.billedQty}</span>,
      },
      {
        accessorKey: 'mrp',
        header: 'MRP',
        cell: (row) => <span className="font-semibold text-success-400">₹{(row.mrp || 0).toLocaleString()}</span>,
      },
      {
        accessorKey: 'printed',
        header: 'Printed',
        cell: (row) => (
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${row.printed ? 'bg-success-500/10 text-success-400 border border-success-500/20' : 'bg-warning-500/10 text-warning-400 border border-warning-500/20'}`}>
            {row.printed ? 'TRUE' : 'FALSE'}
          </span>
        ),
      },
      {
        accessorKey: 'remainingAllocation',
        header: 'Remaining Allocation',
        cell: (row) => <span className="font-semibold text-brand-300">{row.remainingAllocation}</span>,
      },
      {
        accessorKey: 'locationAllotted',
        header: 'Location Allotted',
        cell: (row) => (
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${row.locationAllotted ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'bg-white/[0.04] text-neutral-400 border border-white/10'}`}>
            {row.locationAllotted ? 'TRUE' : 'FALSE'}
          </span>
        ),
      },
    ],
    [
      {
        label: 'Edit',
        icon: <Edit2 className="h-4 w-4" />,
        onClick: openEditInvoice,
      },
      {
        label: 'Delete',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: (row) => setDeleteTarget({ kind: 'invoice', row }),
        variant: 'destructive',
      },
    ]
  );

  return (
    <OperationsPage
      title="Purchase Invoices"
      description="Upload inward invoice rows here. Same records drive sticker printing and put-away."
      icon={ArrowDownToLine}
      metrics={[
        { label: 'Invoices', value: poInvoices.length },
        { label: 'Pending Print', value: invoiceStats.pendingPrint, tone: 'warning' },
        { label: 'Remaining Allocation', value: invoiceStats.totalRemaining, tone: 'brand' },
        { label: 'Fully Allotted', value: invoiceStats.allottedCount, tone: 'success' },
      ]}
    >
      <OperationsPanel
        title="Inward Ledger"
        icon={FileText}
        description="Import Excel or add a single inward line manually."
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <input type="file" id="invoice-upload" className="hidden" accept=".xlsx,.xls" onChange={handleInvoiceUpload} disabled={isUploadingInvoices} />
              <Button variant="outline" size="sm" className="border-brand-500/30 text-brand-400 hover:bg-brand-500/10"
                onClick={() => document.getElementById('invoice-upload')?.click()}
                leftIcon={isUploadingInvoices ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                disabled={isUploadingInvoices}>
                {isUploadingInvoices ? 'Uploading...' : 'Upload Excel'}
              </Button>
            </div>
            <Button size="sm" onClick={openCreateInvoice}
              className="bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
              leftIcon={<Plus className="h-3.5 w-3.5" />}>
              New Row
            </Button>
          </div>
        }
      >
        <DataTable columns={invoiceColumns} data={filteredInvoices} loading={isLoading}
          searchPlaceholder="Search party, SKU, or product..." onSearch={setInvoiceSearch} searchValue={invoiceSearch} />
      </OperationsPanel>

      <Modal isOpen={invoiceModalOpen} onClose={resetInvoiceModal} title={editingInvoice ? 'Edit PO Invoice' : 'New PO Invoice'} size="xl">
        <form onSubmit={handleInvoiceSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Invoice Date" type="date" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, invoiceDate: e.target.value }))} />
            <Input label="Party Name" value={invoiceForm.partyName} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, partyName: e.target.value }))} placeholder="Enter party name" />
            <div className="space-y-2 md:col-span-2">
              <label className="label-text font-medium inline-block mb-1">Product</label>
              <select
                className={themedSelectClassName}
                value={invoiceForm.productId || ''}
                onChange={(e) => setInvoiceForm((prev) => ({ ...prev, productId: Number(e.target.value) }))}
              >
                <option value="">Select product</option>
                {productOptions.map((product) => (
                  <option key={product.value} value={product.value}>
                    {product.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Billed Qty."
              type="number"
              min="0"
              value={invoiceForm.billedQty}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, billedQty: Number(e.target.value) }))}
            />
            <Input
              label="Remaining Allocation"
              type="number"
              min="0"
              value={invoiceForm.remainingAllocation}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, remainingAllocation: Number(e.target.value) }))}
            />
            <div className="space-y-2">
              <label className="label-text font-medium inline-block mb-1">Printed</label>
              <select
                className={themedSelectClassName}
                value={invoiceForm.printed ? 'true' : 'false'}
                onChange={(e) => setInvoiceForm((prev) => ({ ...prev, printed: e.target.value === 'true' }))}
              >
                <option value="true">TRUE</option>
                <option value="false">FALSE</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-text font-medium inline-block mb-1">Location Allotted</label>
              <select
                className={themedSelectClassName}
                value={invoiceForm.locationAllotted ? 'true' : 'false'}
                onChange={(e) => setInvoiceForm((prev) => ({ ...prev, locationAllotted: e.target.value === 'true' }))}
              >
                <option value="true">TRUE</option>
                <option value="false">FALSE</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 border-t border-white/10 pt-4">
            <Button type="button" variant="outline" onClick={resetInvoiceModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSavingInvoice} className="flex-1 bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700">
              {isSavingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : editingInvoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
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

