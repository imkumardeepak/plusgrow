import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Layers3,
  Loader2,
  Printer,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '../components/atoms/Badge';
import { Button } from '../components/atoms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Input } from '../components/atoms/Input';
import { cn } from '../lib/utils';
import {
  Importer,
  PoInvoice,
  importersApi,
  poInvoicesApi,
} from '../services/masterApi';
import { stickersApi } from '../services/stickersApi';

type StickerBatch = {
  key: string;
  invoiceDate: string;
  partyName: string;
  rows: PoInvoice[];
  pendingRows: PoInvoice[];
  totalLines: number;
  totalLabels: number;
  pendingLabels: number;
};

const selectClassName =
  'h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

const buildBatchKey = (invoiceDate: string, partyName: string) =>
  `${invoiceDate.slice(0, 10)}__${partyName.trim().toLowerCase()}`;

const buildBatchNumber = (batch: StickerBatch) => {
  const dateCode = format(new Date(batch.invoiceDate), 'ddMMyy');
  const partyCode = batch.partyName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5) || 'INV';

  return `${partyCode}-${dateCode}`;
};

export const Sticker = memo(function Sticker() {
  const [poInvoices, setPoInvoices] = useState<PoInvoice[]>([]);
  const [importers, setImporters] = useState<Importer[]>([]);
  const [selectedBatchKey, setSelectedBatchKey] = useState('');
  const [stickerSize, setStickerSize] = useState('50x50');
  const [stickerType, setStickerType] = useState<'Combined' | 'Separate'>('Combined');
  const [importerId, setImporterId] = useState<number | ''>('');
  const [monthYear, setMonthYear] = useState(format(new Date(), 'MMM/yyyy').toUpperCase());
  const [batchNumber, setBatchNumber] = useState('');
  const [note, setNote] = useState('');
  const [printerIp, setPrinterIp] = useState('192.168.10.151');
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [invoiceData, importerData] = await Promise.all([
        poInvoicesApi.getAll(),
        importersApi.getAll(),
      ]);

      setPoInvoices(invoiceData);
      setImporters(importerData);
    } catch (error) {
      toast.error('Failed to load invoice batches for sticker printing');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const batches = useMemo<StickerBatch[]>(() => {
    const grouped = new Map<string, PoInvoice[]>();

    poInvoices.forEach((row) => {
      const key = buildBatchKey(row.invoiceDate, row.partyName);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });

    return Array.from(grouped.entries())
      .map(([key, rows]) => {
        const pendingRows = rows.filter((row) => !row.printed);
        return {
          key,
          invoiceDate: rows[0].invoiceDate,
          partyName: rows[0].partyName,
          rows: rows.sort((a, b) => a.productName.localeCompare(b.productName)),
          pendingRows,
          totalLines: rows.length,
          totalLabels: rows.reduce((sum, row) => sum + row.billedQty, 0),
          pendingLabels: pendingRows.reduce((sum, row) => sum + row.billedQty, 0),
        };
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.partyName.localeCompare(b.partyName);
      });
  }, [poInvoices]);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.key === selectedBatchKey) ?? null,
    [batches, selectedBatchKey]
  );

  const previewRow = selectedBatch?.pendingRows[0] ?? selectedBatch?.rows[0] ?? null;

  useEffect(() => {
    if (!batches.length) {
      setSelectedBatchKey('');
      return;
    }

    if (!selectedBatchKey || !batches.some((batch) => batch.key === selectedBatchKey)) {
      setSelectedBatchKey(batches[0].key);
    }
  }, [batches, selectedBatchKey]);

  useEffect(() => {
    if (!selectedBatch) return;

    setMonthYear(format(new Date(selectedBatch.invoiceDate), 'MMM/yyyy').toUpperCase());
    setBatchNumber(buildBatchNumber(selectedBatch));
  }, [selectedBatch?.key]);

  const handlePreview = useCallback(async () => {
    if (!previewRow) {
      setPreviewUrl(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const nextPreview = await stickersApi.getPreview({
        productId: previewRow.productId,
        importerId: importerId || undefined,
        size: stickerSize,
        type: stickerType,
        monthYear,
        batchNumber,
        note,
      });
      setPreviewUrl((previousPreview) => {
        if (previousPreview) {
          URL.revokeObjectURL(previousPreview);
        }
        return nextPreview;
      });
    } catch (error) {
      toast.error('Failed to load sticker preview');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [batchNumber, importerId, monthYear, note, previewRow, stickerSize, stickerType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void handlePreview();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [handlePreview]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handlePrintBatch = async () => {
    if (!selectedBatch) {
      toast.error('Select an invoice batch first');
      return;
    }

    const printableRows = selectedBatch.pendingRows.filter((row) => row.billedQty > 0);

    if (!printableRows.length) {
      toast.error('All stickers for this invoice batch are already printed');
      return;
    }

    if (!printerIp.trim()) {
      toast.error('Printer IP is required');
      return;
    }

    setIsPrinting(true);
    try {
      await stickersApi.print({
        printerIp: printerIp.trim(),
        items: printableRows.map((row) => ({
          config: {
            productId: row.productId,
            importerId: importerId || undefined,
            size: stickerSize,
            type: stickerType,
            monthYear,
            batchNumber,
            note,
          },
          quantity: row.billedQty,
        })),
      });

      await poInvoicesApi.markPrinted(printableRows.map((row) => row.id));
      toast.success(`Printed ${selectedBatch.pendingLabels} stickers for ${selectedBatch.partyName}`);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to print sticker batch');
    } finally {
      setIsPrinting(false);
    }
  };

  const totalBatches = batches.length;
  const pendingBatches = batches.filter((batch) => batch.pendingRows.length > 0).length;
  const totalPendingLabels = batches.reduce((sum, batch) => sum + batch.pendingLabels, 0);
  const totalPrintedLines = poInvoices.filter((row) => row.printed).length;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <Card variant="glass" className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="page-icon-chip">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h1 className="page-title">Invoice Sticker Printing</h1>
              <p className="page-subtitle">Print all stickers for one uploaded invoice batch, then mark the batch as printed.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Batches</p>
              <p className="mt-2 text-2xl font-black text-white">{totalBatches}</p>
            </div>
            <div className="rounded-2xl border border-warning-500/20 bg-warning-500/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-warning-300/70">Pending Batches</p>
              <p className="mt-2 text-2xl font-black text-warning-400">{pendingBatches}</p>
            </div>
            <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-brand-300/70">Pending Labels</p>
              <p className="mt-2 text-2xl font-black text-brand-300">{totalPendingLabels}</p>
            </div>
            <div className="rounded-2xl border border-success-500/20 bg-success-500/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-success-300/70">Printed Lines</p>
              <p className="mt-2 text-2xl font-black text-success-400">{totalPrintedLines}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr_1.2fr]">
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="border-b border-white/10 bg-white/[0.02]">
            <CardTitle size="sm" className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-brand-400" />
              Invoice Batches
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[720px] space-y-3 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
              </div>
            ) : batches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-400">
                No uploaded invoice batches found. Upload invoice rows in inward first.
              </div>
            ) : (
              batches.map((batch) => {
                const isActive = batch.key === selectedBatchKey;
                const isComplete = batch.pendingRows.length === 0;

                return (
                  <button
                    key={batch.key}
                    onClick={() => setSelectedBatchKey(batch.key)}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition',
                      isActive
                        ? 'border-brand-500/40 bg-brand-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-brand-500/20 hover:bg-white/[0.05]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{batch.partyName}</p>
                        <p className="mt-1 text-xs text-neutral-400">
                          {format(new Date(batch.invoiceDate), 'dd-MMM-yy')}
                        </p>
                      </div>
                      <Badge
                        variant={isComplete ? 'success' : 'warning'}
                        shape="pill"
                        className="border-none"
                      >
                        {isComplete ? 'Printed' : 'Pending'}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="uppercase tracking-[0.2em] text-neutral-500">Lines</p>
                        <p className="mt-1 font-bold text-white">{batch.totalLines}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.2em] text-neutral-500">Labels</p>
                        <p className="mt-1 font-bold text-brand-300">{batch.totalLabels}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.2em] text-neutral-500">Pending</p>
                        <p className="mt-1 font-bold text-warning-400">{batch.pendingLabels}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="border-b border-white/10 bg-white/[0.02]">
            <CardTitle size="sm" className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-brand-400" />
              Sticker Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            {selectedBatch ? (
              <>
                <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
                  <p className="text-sm font-semibold text-white">{selectedBatch.partyName}</p>
                  <p className="mt-1 text-xs text-neutral-300">
                    Invoice Date: {format(new Date(selectedBatch.invoiceDate), 'dd-MMM-yy')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-200">
                      Total lines: {selectedBatch.totalLines}
                    </span>
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-200">
                      Pending stickers: {selectedBatch.pendingLabels}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="field-label">Sticker Size</label>
                    <select
                      className={selectClassName}
                      value={stickerSize}
                      onChange={(e) => setStickerSize(e.target.value)}
                    >
                      <option value="50x50">50 x 50 MM</option>
                      <option value="60x60">60 x 60 MM</option>
                      <option value="75x75">75 x 75 MM</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="field-label">Sticker Type</label>
                    <select
                      className={selectClassName}
                      value={stickerType}
                      onChange={(e) => setStickerType(e.target.value as 'Combined' | 'Separate')}
                    >
                      <option value="Combined">Combined</option>
                      <option value="Separate">Separate</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="field-label">Importer</label>
                    <select
                      className={selectClassName}
                      value={importerId}
                      onChange={(e) => setImporterId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">No importer</option>
                      {importers.map((importer) => (
                        <option key={importer.id} value={importer.id}>
                          {importer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="field-label">Printer IP</label>
                    <Input
                      value={printerIp}
                      onChange={(e) => setPrinterIp(e.target.value)}
                      placeholder="Enter printer IP"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="field-label">Month / Year</label>
                    <Input
                      value={monthYear}
                      onChange={(e) => setMonthYear(e.target.value)}
                      placeholder="MMM/YYYY"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="field-label">Batch Number</label>
                    <Input
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="Batch number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="field-label">Note</label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note for all stickers in this batch"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-400" />
                    <p className="text-sm font-semibold text-white">Preview</p>
                  </div>

                  {isPreviewLoading ? (
                    <div className="flex h-56 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
                    </div>
                  ) : previewUrl ? (
                    <div className="flex justify-center">
                      <img
                        src={previewUrl}
                        alt="Sticker preview"
                        className="max-h-56 rounded-xl border border-white/10 bg-white p-2"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-neutral-400">
                      Select an invoice batch to preview the first sticker.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-400">
                Select an invoice batch from the left to configure sticker printing.
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-brand-400" />
                Batch Items
              </CardTitle>
              <Button
                onClick={handlePrintBatch}
                disabled={!selectedBatch || isPrinting || selectedBatch.pendingRows.length === 0}
                className="bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
                leftIcon={isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              >
                {isPrinting ? 'Printing...' : 'Print All Pending'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {selectedBatch ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="uppercase tracking-[0.2em] text-neutral-500">Rows</p>
                      <p className="mt-1 font-bold text-white">{selectedBatch.totalLines}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.2em] text-neutral-500">Pending Stickers</p>
                      <p className="mt-1 font-bold text-warning-400">{selectedBatch.pendingLabels}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.2em] text-neutral-500">Printed Rows</p>
                      <p className="mt-1 font-bold text-success-400">
                        {selectedBatch.rows.length - selectedBatch.pendingRows.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="grid grid-cols-[1.2fr_1.5fr_0.7fr_0.7fr] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                    <span>SKU</span>
                    <span>Product</span>
                    <span>Qty</span>
                    <span>Status</span>
                  </div>
                  <div className="max-h-[560px] overflow-y-auto">
                    {selectedBatch.rows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[1.2fr_1.5fr_0.7fr_0.7fr] gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3 text-sm last:border-b-0"
                      >
                        <span className="font-mono text-brand-300">{row.skuCode}</span>
                        <span className="text-white">{row.productName}</span>
                        <span className="font-bold text-neutral-200">{row.billedQty}</span>
                        <span>
                          <Badge
                            variant={row.printed ? 'success' : 'warning'}
                            shape="pill"
                            className="border-none"
                          >
                            {row.printed ? 'Printed' : 'Pending'}
                          </Badge>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-400">
                No invoice batch selected.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default Sticker;
