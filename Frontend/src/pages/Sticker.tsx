import React, { useState, useEffect, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import {
  Printer, Search, Box, Tag, Plus, Minus, Trash2, Eye, Check, LayoutPanelTop, Settings2, Loader2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { productsApi, importersApi } from '../services/masterApi';
import { stickersApi } from '../services/stickersApi';
import { Product } from '../services/masterApi';

interface PrintQueueItem {
  id: string;
  sku: string;
  quantity: number;
  product: Product;
  config: any;
}

export const Sticker = memo(function Sticker() {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stickerSize, setStickerSize] = useState<string>('50x50');
  const [stickerType, setStickerType] = useState<'Combined' | 'Separate'>('Combined');
  const [importerId, setImporterId] = useState<number | undefined>(undefined);
  const [monthYear, setMonthYear] = useState('MAR/2026');
  const [batchNumber, setBatchNumber] = useState('INA0001');
  const [note, setNote] = useState('ABCDEFGHIJKLMNOPQRSTUWX');
  const [printerIp, setPrinterIp] = useState('192.168.10.151');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);

  // Fetch Masters
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll()
  });

  const { data: importers = [] } = useQuery({
    queryKey: ['importers'],
    queryFn: () => importersApi.getAll()
  });

  const selectedProduct = useMemo(() =>
    products.find(p => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.sku?.toLowerCase().includes(term) ||
      p.name.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Update Preview
  const handlePreview = async () => {
    if (!selectedProductId) {
      toast.error('Please select a product first');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const config = {
        productId: selectedProductId,
        importerId,
        size: stickerSize,
        type: stickerType,
        monthYear,
        batchNumber,
        note
      };
      const url = await stickersApi.getPreview(config);
      setPreviewUrl(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Auto-preview when important fields change
  useEffect(() => {
    if (selectedProductId) {
      const timer = setTimeout(() => {
        handlePreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedProductId, stickerSize, stickerType, importerId, monthYear, batchNumber, note]);

  const addToQueue = () => {
    if (!selectedProduct) return;

    const id = Math.random().toString(36).substr(2, 9);
    setPrintQueue(prev => [...prev, {
      id,
      sku: selectedProduct.sku || '',
      quantity: 1,
      product: selectedProduct,
      config: {
        productId: selectedProductId,
        importerId,
        size: stickerSize,
        type: stickerType,
        monthYear,
        batchNumber,
        note
      }
    }]);
    toast.success(`Added ${selectedProduct.sku} to queue`);
  };

  const removeFromQueue = (id: string) => {
    setPrintQueue(prev => prev.filter(item => item.id !== id));
  };

  const updateQueueQuantity = (id: string, delta: number) => {
    setPrintQueue(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handlePrintJob = async () => {
    if (printQueue.length === 0) return;

    toast.info(`Sending ${printQueue.length} job(s) to printer at ${printerIp}...`);
    try {
      const payload = {
        items: printQueue.map(item => ({
          config: item.config,
          quantity: item.quantity
        })),
        printerIp: printerIp
      };

      await stickersApi.print(payload);
      toast.success('Print job completed successfully');
      setPrintQueue([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data || 'Failed to print job');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 p-4 lg:p-6 bg-neutral-50/50">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

        {/* LEFT: Product Directory */}
        <Card variant="elevated" className="lg:col-span-3 flex flex-col overflow-hidden h-full shadow-lg border-white/40">
          <CardHeader className="py-4 px-5 border-b border-neutral-100 bg-white">
            <CardTitle size="sm" className="flex items-center gap-2 text-neutral-800">
              <Box className="w-5 h-5 text-brand-500" />
              Product Catalog
            </CardTitle>
          </CardHeader>

          <div className="p-4 bg-white">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
              <Input
                placeholder="Search SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 text-sm bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
            </div>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin bg-white">
            {isProductsLoading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-10 text-center text-neutral-400">
                <Box className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No products found</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={cn(
                      "w-full text-left p-4 flex items-start gap-4 transition-all duration-200 border-l-4",
                      selectedProductId === p.id
                        ? 'bg-brand-50/40 border-l-brand-500 ring-1 ring-brand-500/10'
                        : 'hover:bg-neutral-50 border-l-transparent'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-mono text-sm tracking-tight mb-1",
                        selectedProductId === p.id ? 'text-brand-700 font-bold' : 'text-neutral-900 font-semibold'
                      )}>
                        {p.sku || 'No SKU'}
                      </p>
                      <p className="text-xs text-neutral-500 line-clamp-1">
                        {p.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* MIDDLE: Preview & Configuration */}
        <div className="lg:col-span-6 flex flex-col gap-6 min-h-0">
          <Card variant="elevated" className="flex-1 flex flex-col overflow-hidden shadow-xl border-white/60">
            <CardHeader className="py-4 px-6 border-b border-neutral-100 bg-white">
              <div className="flex items-center justify-between">
                <CardTitle size="sm" className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-brand-500" />
                  Sticker Preview
                </CardTitle>
                <div className="flex bg-neutral-100 p-1 rounded-xl">
                  {['50x50', '60x60', '75x75'].map(size => (
                    <button
                      key={size}
                      onClick={() => setStickerSize(size)}
                      className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        stickerSize === size
                          ? 'bg-white text-brand-600 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-800'
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] relative overflow-hidden p-8">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>

              {!selectedProductId ? (
                <div className="flex flex-col items-center text-center max-w-sm relative z-10 animate-in fade-in transition-all">
                  <div className="w-24 h-24 bg-white/80 backdrop-blur rounded-3xl shadow-lg border border-white flex items-center justify-center mb-6">
                    <Tag className="w-10 h-10 text-neutral-300" />
                  </div>
                  <h4 className="text-xl font-bold text-neutral-800 mb-2">Ready to Design</h4>
                  <p className="text-sm text-neutral-500 bg-white/50 backdrop-blur px-4 py-2 rounded-2xl border border-white">
                    Select a product from the left catalog to generate a live sticker preview.
                  </p>
                </div>
              ) : (
                <div className="relative flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500">
                  {isPreviewLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-[1px] rounded-xl">
                      <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                    </div>
                  )}

                  {previewUrl ? (
                    <div className="bg-white p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-neutral-200 overflow-hidden hover:scale-105 transition-transform duration-500 cursor-zoom-in">
                      <img
                        src={previewUrl}
                        alt="Sticker Preview"
                        className={cn(
                          "max-w-full h-auto object-contain bg-white",
                          stickerSize === '50x50' ? 'w-[300px]' : stickerSize === '60x60' ? 'w-[360px]' : 'w-[420px]'
                        )}
                      />
                    </div>
                  ) : (
                    <div className="p-12 border-2 border-dashed border-neutral-300 rounded-2xl text-neutral-400">
                      Processing preview...
                    </div>
                  )}

                  <div className="flex gap-4 p-2 bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-white">
                    <Button
                      onClick={addToQueue}
                      className="rounded-xl px-8 py-6 text-base font-bold btn-primary-gradient shadow-lg"
                      leftIcon={<Plus className="w-5 h-5" />}
                    >
                      Add to Job Queue
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePreview}
                      className="rounded-xl px-6 py-6"
                    >
                      <Loader2 className={cn("w-5 h-5", isPreviewLoading && "animate-spin")} />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CONFIGURATION PANEL */}
          <Card className="shadow-lg border-white/60">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">Label Type</label>
                <div className="flex bg-neutral-100 p-1 rounded-lg">
                  {(['Combined', 'Separate'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setStickerType(type)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                        stickerType === type ? 'bg-white shadow-sm text-brand-600' : 'text-neutral-500'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">Importer</label>
                <select
                  className="w-full h-9 rounded-lg border-neutral-200 bg-neutral-50 text-sm focus:ring-brand-500/20"
                  value={importerId}
                  onChange={(e) => setImporterId(Number(e.target.value) || undefined)}
                >
                  <option value="">Default (Sago)</option>
                  {importers.map(imp => (
                    <option key={imp.id} value={imp.id}>{imp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">Month / Year</label>
                <Input
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="e.g. MAR/2026"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">Ref / Batch #</label>
                <Input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="e.g. INA0001"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">Note (Limit 60 chars)</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="ABCD..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">Printer IP Address</label>
                <div className="relative">
                  <Input
                    value={printerIp}
                    onChange={(e) => setPrinterIp(e.target.value)}
                    className="h-9 text-sm pl-8"
                    placeholder="192.168.x.x"
                  />
                  <Printer className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Job Manager */}
        <Card variant="elevated" className="lg:col-span-3 flex flex-col overflow-hidden h-full shadow-lg border-white/40">
          <CardHeader className="py-4 px-5 border-b border-neutral-100 bg-white">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-brand-500" />
                Print Queue
              </CardTitle>
              {printQueue.length > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white animate-pulse">
                  {printQueue.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-neutral-50/30">
            {printQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 h-full text-center text-neutral-400">
                <Printer className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-medium">Queue is empty</p>
                <p className="text-xs text-neutral-300 mt-2">Use 'Add to Job Queue' to stage stickers</p>
              </div>
            ) : (
              printQueue.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm transition-all hover:shadow-md group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-4">
                      <p className="font-mono text-sm font-bold text-neutral-900 group-hover:text-brand-600 transition-colors uppercase">{item.sku}</p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1 tracking-wider">{item.config.size} | {item.config.type}</p>
                    </div>
                    <button
                      onClick={() => removeFromQueue(item.id)}
                      className="p-1.5 rounded-lg text-neutral-300 hover:text-danger-500 hover:bg-danger-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center justify-between bg-neutral-50 rounded-lg p-1 border border-neutral-100">
                      <button
                        onClick={() => updateQueueQuantity(item.id, -1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold w-12 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQueueQuantity(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>

          <CardFooter className="p-5 border-t border-neutral-100 bg-white">
            <Button
              disabled={printQueue.length === 0}
              onClick={handlePrintJob}
              className="w-full py-6 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/10 active:scale-[0.98] transition-transform"
              leftIcon={<Printer className="w-5 h-5 mr-1" />}
            >
              Master Print Job
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
});

export default Sticker;
