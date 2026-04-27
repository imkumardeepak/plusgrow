import React, { useState, useEffect, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import {
  Printer, Search, Box, Tag, Plus, Minus, Trash2, Eye, Check, LayoutPanelTop, Settings2, Loader2, Info, Activity, Settings, Zap, Terminal, Layers, Monitor, Cpu
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

/**
 * Premium Cyber Sticker Management Hub
 * Features: High-density layouts, glassmorphism, neon accents, and real-time preview.
 */
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
  const [isPrinting, setIsPrinting] = useState(false);

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
    if (!selectedProductId) return;

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
      toast.error('Preview Linkage Failed');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Auto-preview logic
  useEffect(() => {
    if (selectedProductId) {
      const timer = setTimeout(() => {
        handlePreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedProductId, stickerSize, stickerType, importerId, monthYear, batchNumber, note]);

  const addToQueue = (quantity: number = 1) => {
    if (!selectedProduct) return;

    const config = {
      productId: selectedProductId,
      importerId,
      size: stickerSize,
      type: stickerType,
      monthYear,
      batchNumber,
      note
    };

    const newItem: PrintQueueItem = {
      id: Math.random().toString(36).substr(2, 9),
      sku: selectedProduct.sku || 'N/A',
      quantity,
      product: selectedProduct,
      config
    };

    setPrintQueue(prev => [...prev, newItem]);
    toast.success(`${selectedProduct.name} added to Print Hub`);
  };

  const removeFromQueue = (id: string) => {
    setPrintQueue(prev => prev.filter(item => item.id !== id));
  };

  const updateQueueQuantity = (id: string, delta: number) => {
    setPrintQueue(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const handlePrint = async () => {
    if (!printerIp) {
      toast.error('Printer IP address required');
      return;
    }
    if (printQueue.length === 0) {
      toast.error('Print queue is empty');
      return;
    }

    setIsPrinting(true);
    try {
      await stickersApi.print({
        printerIp,
        items: printQueue.map(item => ({
          config: item.config,
          quantity: item.quantity
        }))
      });
      toast.success('Print Transmission Successful');
      setPrintQueue([]);
    } catch (err) {
      console.error(err);
      toast.error('Hardware Sync Error: Check Printer Connection');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="theme-shell flex flex-col gap-4 p-4 md:p-6">
      {/* Header Bar */}
      <header className="page-toolbar flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="page-icon-chip">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="page-title uppercase font-heading">Label Forge <span className="text-brand-400 font-mono text-sm">v4.0</span></h1>
            <p className="page-subtitle flex items-center gap-2">
              <Activity className="w-3 h-3 text-success-500 animate-pulse" />
              SYSTEM ACTIVE // PRINTER STATUS: ONLINE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Master IP Control</span>
            <input
              value={printerIp}
              onChange={(e) => setPrinterIp(e.target.value)}
              className="bg-transparent border-none text-brand-400 font-mono text-sm focus:ring-0 w-36 text-right p-0"
            />
          </div>
          <div className="theme-glow flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6">
            <Zap className="w-5 h-5 text-brand-300" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">

        {/* LEFT COLUMN: PRODUCT DATA SOURCE */}
        <section className="col-span-3 flex flex-col gap-4 overflow-hidden theme-panel p-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-brand-400 transition-colors" />
            <input
              type="text"
              placeholder="Query SKU or Asset Name..."
              className="w-full theme-input rounded-xl py-3 pl-10 pr-4 text-sm focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {isProductsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              </div>
            ) : filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProductId(product.id)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                  selectedProductId === product.id
                    ? "bg-brand-500/10 border-brand-500/40 shadow-[inset_0_0_20px_rgba(17,167,223,0.05)]"
                    : "bg-white/[0.04] border-white/10 hover:border-brand-500/30 hover:bg-white/[0.06]"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className={cn(
                    "font-heading font-bold text-sm truncate pr-2 transition-colors",
                    selectedProductId === product.id ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"
                  )}>
                    {product.name}
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-500 group-hover:text-brand-400">#{product.sku}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[9px] border-white/10 text-neutral-500 group-hover:border-white/20">
                    {product.commodity?.name || 'GENERIC'}
                  </Badge>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <Check className="w-4 h-4 text-success-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MIDDLE COLUMN: LIVE FORGE & PREVIEW */}
        <section className="col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar theme-panel p-6">
          {selectedProduct ? (
            <div className="space-y-6">
              {/* Preview Unit */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(17,167,223,0.05),_transparent)] pointer-events-none" />
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Badge variant="primary" shape="pill" className="font-heading font-bold border-none">LIVE PREVIEW</Badge>
                <Badge variant="default" shape="pill" className="backdrop-blur-md text-brand-300 border-brand-500/30">{stickerSize}mm</Badge>
              </div>

              <div className="w-full h-full flex items-center justify-center p-8">
                {isPreviewLoading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                    <span className="text-brand-400 text-xs font-mono tracking-widest animate-pulse">GENERATING OPTICS...</span>
                  </div>
                ) : previewUrl ? (
                  <div className="relative group/img">
                    <img
                      src={previewUrl}
                      alt="Label Optics"
                      className="max-w-full max-h-full shadow-2xl shadow-brand-500/10 rounded border border-white/5 transition-transform duration-500 group-hover/img:scale-105"
                    />
                    <div className="absolute inset-0 border border-brand-400/0 group-hover/img:border-brand-400/20 transition-all pointer-events-none" />
                  </div>
                ) : (
                  <div className="text-neutral-500 flex flex-col items-center gap-4">
                    <Eye className="w-16 h-16 opacity-20" />
                    <p className="text-sm italic">Waiting for forge parameters...</p>
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-0 right-0 px-4 z-10">
                <button
                  onClick={() => addToQueue(1)}
                  className="w-full btn-primary-gradient py-4 font-black rounded-xl active:scale-95 flex items-center justify-center gap-3"
                >
                  <Plus className="w-5 h-5" />
                  PUSH TO PRINT HUB
                </button>
              </div>

              {/* Forge Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 bg-white/[0.04] border border-white/10 p-4 rounded-2xl">
              <h4 className="text-[11px] font-heading font-bold uppercase tracking-[0.22em] text-brand-300 flex items-center gap-2">
                <Settings2 className="w-3 h-3" /> Core Parameters
              </h4>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 uppercase font-heading font-bold ml-1">Sticker Dimension</label>
                  <select
                    value={stickerSize}
                    onChange={(e) => setStickerSize(e.target.value)}
                    className="w-full theme-input rounded-lg p-2.5 text-xs text-neutral-300 outline-none focus:border-brand-500/50"
                  >
                    <option value="50x50">50 x 50 MM (Standard Square)</option>
                    <option value="60x60">60 x 60 MM (Large Square)</option>
                    <option value="75x75">75 x 75 MM (XL Square)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 uppercase font-heading font-bold ml-1">Asset Origin (Importer)</label>
                  <select
                    value={importerId}
                    onChange={(e) => setImporterId(Number(e.target.value))}
                    className="w-full theme-input rounded-lg p-2.5 text-xs text-neutral-300 outline-none focus:border-brand-500/50"
                  >
                    <option value="">SELECT SOURCE</option>
                    {importers.map(imp => (
                      <option key={imp.id} value={imp.id}>{imp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 uppercase font-heading font-bold ml-1">Layout Mode</label>
                  <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => setStickerType('Combined')}
                      className={cn(
                        "flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all",
                        stickerType === 'Combined' ? "bg-white/10 text-brand-400 shadow-sm" : "text-neutral-500"
                      )}
                    >
                      COMBINED
                    </button>
                    <button
                      onClick={() => setStickerType('Separate')}
                      className={cn(
                        "flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all",
                        stickerType === 'Separate' ? "bg-white/10 text-brand-400 shadow-sm" : "text-neutral-500"
                      )}
                    >
                      SEPARATE
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-white/[0.04] border border-white/10 p-4 rounded-2xl">
              <h4 className="text-[11px] font-heading font-bold uppercase tracking-[0.22em] text-brand-300 flex items-center gap-2">
                <Zap className="w-3 h-3" /> Metadata Overlays
              </h4>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 uppercase font-heading font-bold ml-1">Temporal Data (Month/Year)</label>
                  <input
                    value={monthYear}
                    onChange={(e) => setMonthYear(e.target.value)}
                    className="w-full theme-input rounded-lg p-2.5 text-xs text-neutral-300 outline-none focus:border-brand-500/50 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 uppercase font-heading font-bold ml-1">Batch Sequence</label>
                  <input
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full theme-input rounded-lg p-2.5 text-xs text-neutral-300 outline-none focus:border-brand-500/50 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 uppercase font-heading font-bold ml-1">Peripheral Note</label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={23}
                    className="w-full theme-input rounded-lg p-2.5 text-xs text-neutral-300 outline-none focus:border-brand-500/50"
                  />
                </div>
              </div>
            </div>
          </div>
      </div>
      ) : (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
        <div className="p-6 rounded-full bg-white/5 mb-4 animate-bounce">
          <Box className="w-12 h-12 opacity-30 text-brand-400" />
        </div>
        <h3 className="text-xl font-bold text-neutral-400 mb-2 font-heading">INITIALIZE CATALOG SELECTION</h3>
        <p className="text-sm max-w-xs text-center text-neutral-500">Select a product from the left nexus to begin thermal print synthesis.</p>
      </div>
          )}
    </section>

        {/* RIGHT COLUMN: PRINT HUB MONITOR */ }
  <section className="col-span-4 flex flex-col gap-4 overflow-hidden theme-panel p-4">
    <div className="flex items-center justify-between mb-2">
      <h2 className="page-title font-heading flex items-center gap-3">
        <Monitor className="w-5 h-5 text-brand-400" />
        PRINT HUB <span className="text-brand-500 font-mono text-sm">[{printQueue.length}]</span>
      </h2>
      <button
        onClick={() => setPrintQueue([])}
        className="text-[10px] text-danger-500 font-bold hover:text-danger-400 transition-colors flex items-center gap-1 uppercase"
      >
        <Trash2 className="w-3 h-3" /> WIPE HUB
      </button>
    </div>

    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
      {printQueue.length === 0 ? (
        <div className="h-48 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-neutral-500 gap-3">
          <Layers className="w-8 h-8 opacity-20" />
          <span className="text-[10px] font-mono tracking-widest uppercase">Buffer Empty</span>
        </div>
      ) : printQueue.map(item => (
        <div key={item.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-500/40" />

          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <h5 className="font-heading font-bold text-xs text-white truncate pr-4">{item.product.name}</h5>
              <p className="text-[9px] font-mono text-neutral-500 uppercase mt-0.5">{item.sku} // {item.config.size}MM</p>
            </div>
            <button
              onClick={() => removeFromQueue(item.id)}
              className="p-1.5 rounded-md text-neutral-500 hover:bg-danger-500/10 hover:text-danger-500 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between bg-neutral-950/50 p-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateQueueQuantity(item.id, -1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-neutral-400 hover:text-white transition-colors"
              >
                <span className="sr-only">Decrease</span>
                <Minus className="w-3 h-3" />
              </button>
              <div className="w-10 text-center font-mono font-bold text-brand-400 text-xs">
                {item.quantity.toString().padStart(2, '0')}
              </div>
              <button
                onClick={() => updateQueueQuantity(item.id, 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-neutral-400 hover:text-white transition-colors"
              >
                <span className="sr-only">Increase</span>
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] text-neutral-500 font-mono">COPIES</span>
              <Badge variant="outline" className="border-brand-500/20 text-brand-400 text-[9px] px-2 py-0">SYNCED</Badge>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-[10px] text-neutral-500 uppercase font-black tracking-tighter mb-1">Total Payload</p>
          <h3 className="text-3xl font-black italic text-white flex items-baseline gap-2 font-heading">
            {printQueue.reduce((acc, curr) => acc + curr.quantity, 0)}
            <span className="text-xs font-mono text-neutral-500 not-italic uppercase">Labels</span>
          </h3>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-success-500 font-mono">ENCRYPTED STREAM</span>
          <span className="text-[10px] text-neutral-500 font-mono uppercase">V.921</span>
        </div>
      </div>

      <button
        onClick={handlePrint}
        disabled={isPrinting || printQueue.length === 0}
        className={cn(
          "w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-4 relative overflow-hidden",
          isPrinting || printQueue.length === 0
            ? "bg-white/5 text-neutral-500 cursor-not-allowed border border-white/10"
            : "btn-primary-gradient"
        )}
      >
        {isPrinting ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            TRANSMITTING...
          </>
        ) : (
          <>
            <Printer className="w-6 h-6" />
            INITIATE PRINT OPS
          </>
        )}
      </button>
      <p className="text-center text-[9px] text-neutral-500 mt-4 font-mono tracking-tighter">
        TARGET IP: {printerIp} // PORT: 9100 // PROTOCOL: RAW
      </p>
    </div>
  </section>
      </div >
    </div >
  );
});
