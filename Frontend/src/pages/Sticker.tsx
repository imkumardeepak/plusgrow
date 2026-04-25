import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Logo } from '../components/atoms/Logo';
import { 
  Printer, Search, ScanLine, Box, Tag, Plus, Minus, Trash2, Eye, Check, LayoutPanelTop, Settings2
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Product } from '../types';

interface PrintQueueItem {
  id: string;
  sku: string;
  quantity: number;
  product: Product;
}

export const Sticker = memo(function Sticker() {
  const { products } = useWms();
  const [selectedSku, setSelectedSku] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
  const [stickerSize, setStickerSize] = useState<'100x60' | '50x50'>('100x60');
  const [showPreview, setShowPreview] = useState(false);
  
  const barcodeRef = useRef<SVGSVGElement>(null);
  const previewBarcodeRef = useRef<SVGSVGElement>(null);
  const [isBarcodeRendered, setIsBarcodeRendered] = useState(false);

  const product = products.find(p => p.sku === selectedSku);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.sku.toLowerCase().includes(term) || 
      p.title.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Effect to render barcode efficiently when product changes
  useEffect(() => {
    if (product && barcodeRef.current) {
      setIsBarcodeRendered(false);
      try {
        JsBarcode(barcodeRef.current, product.sku, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 0,
          lineColor: "#0f172a", // neutral-900
          background: "transparent"
        });
        setIsBarcodeRendered(true);

        QRCode.toDataURL(JSON.stringify({
          sku: product.sku,
          mrp: product.mrpManual,
          bb: product.bestBefore
        }), {
          color: { dark: '#0f172a', light: '#00000000' },
          margin: 0,
          width: 128
        })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error(err));
      } catch (err) {
        console.error("Barcode generation failed", err);
      }
    }
  }, [product, stickerSize]);

  // Effect to render preview barcode
  useEffect(() => {
    if (showPreview && selectedSku && previewBarcodeRef.current) {
      const selectedProduct = products.find(p => p.sku === selectedSku);
      if (selectedProduct) {
        JsBarcode(previewBarcodeRef.current, selectedProduct.sku, {
          format: "CODE128",
          width: 1.5,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 0,
          lineColor: "#0f172a",
          background: "transparent"
        });
      }
    }
  }, [showPreview, selectedSku, products]);

  const addToQueue = () => {
    if (!product) {
      toast.error('Please select a product first');
      return;
    }
    
    const existingItem = printQueue.find(item => item.sku === product.sku);
    if (existingItem) {
      setPrintQueue(prev => prev.map(item => 
        item.sku === product.sku 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      toast.success(`Incremented quantity for ${product.sku}`);
    } else {
      setPrintQueue(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        sku: product.sku,
        quantity: 1,
        product
      }]);
      toast.success(`Queued ${product.sku} for printing`);
    }
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

  const clearQueue = () => {
    setPrintQueue([]);
    toast.success('Print queue cleared');
  };

  const totalStickers = printQueue.reduce((sum, item) => sum + item.quantity, 0);

  const handlePrint = () => {
    if (printQueue.length === 0) {
      toast.error('Add items to print queue first');
      return;
    }
    toast.success(`Printing a total of ${totalStickers} sticker(s) from the queue...`);
  };

  const handlePrintSingle = () => {
    if (!product) {
      toast.error('Select a product first');
      return;
    }
    toast.success(`Sending 1 label to printer for ${product.sku}...`);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* 3-Column Professional Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* ================= LEFT COLUMN: DATA SOURCE ================= */}
        <Card variant="elevated" className="lg:col-span-3 flex flex-col overflow-hidden h-full shadow-card">
          <CardHeader className="py-3 px-4 border-b border-white/8 bg-white/[0.04]">
            <CardTitle size="sm" className="flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-500" />
              Product Directory
            </CardTitle>
          </CardHeader>
          
          <div className="p-3 border-b border-white/8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search SKU or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
                autoFocus
              />
            </div>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin">
            <div className="divide-y divide-white/[0.04]">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-neutral-400">
                  <ScanLine className="w-8 h-8 mx-auto mb-2 opacity-50 text-neutral-300" />
                  <p className="text-sm">No products found</p>
                </div>
              ) : (
                filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedSku(p.sku)}
                    className={cn(
                      "w-full text-left p-3 flex items-start gap-3 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                      selectedSku === p.sku 
                        ? 'bg-brand-400/10 border-l-2 border-l-brand-400' 
                        : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors", 
                      selectedSku === p.sku ? 'bg-brand-400/15 text-brand-300' : 'bg-white/[0.04] text-neutral-500'
                    )}>
                      <Box className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={cn(
                          "font-mono text-sm tracking-tight truncate pr-2", 
                          selectedSku === p.sku ? 'text-brand-300 font-bold' : 'text-white font-semibold'
                        )}>
                          {p.sku}
                        </p>
                        {selectedSku === p.sku && <Check className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] leading-tight text-neutral-500 line-clamp-2" title={p.title}>
                        {p.title}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* ================= MIDDLE COLUMN: CANVAS ================= */}
        <Card variant="elevated" className="lg:col-span-6 flex flex-col overflow-hidden h-full z-10">
          <CardHeader className="py-2.5 px-4 border-b border-white/8 bg-white/[0.04] z-10">
            <div className="flex items-center justify-between w-full">
              <CardTitle size="sm" className="flex items-center gap-2">
                <LayoutPanelTop className="w-4 h-4 text-neutral-400" />
                Designer Canvas
              </CardTitle>
              
              {/* Segmented Control for Size */}
              <div className="flex items-center bg-white/[0.04] p-1 rounded-lg border border-white/8">
                {(['100x60', '50x50'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setStickerSize(size)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200", 
                      stickerSize === size 
                        ? 'bg-brand-400/20 text-brand-300 shadow-card' 
                        : 'text-neutral-500 hover:text-neutral-300'
                    )}
                  >
                    {size}mm
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col relative" style={{ background: 'rgba(255,255,255,0.02)' }}>
            {/* The Canvas Background */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            <div className="relative flex-1 flex flex-col items-center justify-center p-8 overflow-auto custom-scrollbar">
              {!product ? (
                <div className="flex flex-col items-center justify-center text-center max-w-sm">
                  <div className="w-20 h-20 bg-white/[0.04] ring-1 ring-white/10 rounded-full flex items-center justify-center mb-5 relative group">
                    <Tag className="w-8 h-8 text-neutral-300 group-hover:text-brand-400 transition-colors duration-300 absolute z-10" />
                    <div className="absolute inset-0 border-2 border-white/10 border-dashed rounded-full group-hover:border-brand-400/30 animate-[spin_10s_linear_infinite]" />
                  </div>
                  <h4 className="text-lg font-heading font-bold text-white mb-2">Canvas Ready</h4>
                  <p className="text-sm text-neutral-500">
                    Select a product from the directory to visualize its printing label directly on the canvas.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                  {/* The Physical Sticker Representation */}
                  <div 
                    className={cn(
                      "bg-white/[0.04] rounded-[4px] shadow-2xl overflow-hidden ring-1 ring-white/ transition-all duration-500 relative select-none group", 
                      stickerSize === '100x60' ? "w-[300px] h-[180px]" : "w-[150px] h-[150px]"
                    )}
                  >
                    {/* Visual shine effect on label */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"></div>
                    
                    <div className="p-3 h-full flex flex-col relative z-10">
                      <div className="flex justify-between items-start mb-2 pb-2 border-b border-white/10">
                        <div className="flex items-center">
                          <Logo width={stickerSize === '50x50' ? 80 : 160} height={stickerSize === '50x50' ? 80 : 96} />
                        </div>
                        {qrDataUrl && stickerSize !== '50x50' && (
                          <div className="bg-white/[0.04] p-0.5 rounded-sm ring-1 ring-white/10 shadow-card shadow-neutral-200/20">
                            <img src={qrDataUrl} alt="QR Component" className="w-[42px] h-[42px]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 mt-1">
                        <div className="mb-1.5 focus-within:ring-2 focus-within:ring-brand-100 rounded-sm">
                          <div className="text-[7px] text-neutral-400 uppercase font-semibold tracking-wider">Product SKU</div>
                          <div className="font-mono text-sm font-bold text-white leading-tight">{product.sku}</div>
                        </div>
                        {stickerSize !== '50x50' && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <div className="text-[7px] text-neutral-400 uppercase font-semibold tracking-wider">MRP</div>
                              <div className="font-bold text-xs text-neutral-100">₹{Math.max(product.mrpManual, product.mrpTally)}</div>
                            </div>
                            <div>
                              <div className="text-[7px] text-neutral-400 uppercase font-semibold tracking-wider">Expiry (Best Before)</div>
                              <div className="text-xs text-neutral-100 font-medium">{product.bestBefore}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-auto w-full flex justify-center bg-white/[0.04] px-2 py-1 -mx-2 -mb-1">
                        <svg ref={barcodeRef} className={cn("w-full transition-opacity duration-300", isBarcodeRendered ? "opacity-100" : "opacity-0", stickerSize === '50x50' ? "h-8" : "h-10")}></svg>
                      </div>
                    </div>
                  </div>

                  {/* Contextual Action Bar Floating Below */}
                  <div className="mt-8 bg-white/[0.04] border border-white/10 backdrop-blur-sm rounded-full p-1.5 flex items-center gap-1">
                    <Button 
                      onClick={addToQueue} 
                      className="rounded-full px-5 hover:scale-105 active:scale-95 transition-all text-sm font-semibold shadow-card"
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Queue
                    </Button>
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                    <Button 
                      variant="ghost" 
                      onClick={handlePrintSingle} 
                      className="rounded-full hover:bg-white/10 text-neutral-400 px-4 text-sm"
                      leftIcon={<Printer className="w-4 h-4" />}
                    >
                      Print
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowPreview(true)} 
                      className="rounded-full hover:bg-neutral-100 text-neutral-300 px-4 text-sm"
                      leftIcon={<Eye className="w-4 h-4" />}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Product Metadata Bar */}
            {product && (
              <div className="border-t border-white/8 px-4 py-3 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-300 relative z-20" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-4 text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success-400/100"></span>
                    Ready to format
                  </div>
                  <div className="w-px h-4 bg-white/10"></div>
                  <span className="font-medium">Net Qty: <span className="text-white">{product.netQty} N</span></span>
                  <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
                  <span className="font-medium hidden sm:block">Location: <span className="text-white border border-white/10 rounded px-1.5 font-mono bg-white/[0.04]">{product.rack}-{product.shelf}-{product.bin}</span></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================= RIGHT COLUMN: JOB MANAGER ================= */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          <Card variant="elevated" className="flex-1 flex flex-col overflow-hidden shadow-card">
            <CardHeader className="py-3 px-4 border-b border-white/8 bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <CardTitle size="sm" className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-brand-500" />
                  Print Queue
                </CardTitle>
                {printQueue.length > 0 && (
                  <Badge variant="primary" className="bg-brand-400/15 text-brand-300 border-brand-400/25 animate-in zoom-in-50">{totalStickers} Labels</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin">
              {printQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mb-3 text-neutral-500">
                    <Printer className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-neutral-400">Queue is empty</p>
                  <p className="text-xs text-neutral-400 mt-1">Add items from the canvas</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {printQueue.map(item => (
                    <div key={item.id} className="bg-white/[0.04] p-3 rounded-lg border border-white/8 flex flex-col gap-2 group animate-in slide-in-from-right-2">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="font-mono text-sm font-bold text-white truncate">{item.sku}</p>
                          <p className="text-[10px] text-neutral-500 uppercase font-semibold">Qty: {item.quantity}</p>
                        </div>
                        <button onClick={() => removeFromQueue(item.id)} className="w-6 h-6 rounded-md text-neutral-500 opacity-0 group-hover:opacity-100 hover:bg-danger-400/15 hover:text-danger-400 flex items-center justify-center transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between bg-white/[0.04] rounded-md p-1 border border-white/8">
                        <button onClick={() => updateQueueQuantity(item.id, -1)} className="w-7 h-7 rounded bg-white/[0.04] text-neutral-400 hover:text-brand-300 border border-white/10 flex items-center justify-center transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold text-white">{item.quantity}</span>
                        <button onClick={() => updateQueueQuantity(item.id, 1)} className="w-7 h-7 rounded bg-white/[0.04] text-neutral-400 hover:text-brand-300 border border-white/10 flex items-center justify-center transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {printQueue.length > 0 && (
              <CardFooter className="p-3 border-t border-white/8 mt-0" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex flex-col w-full gap-2">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-xs text-neutral-500">Total Labels:</span>
                    <span className="text-sm font-bold text-white">{totalStickers}</span>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" onClick={clearQueue} className="flex-1 text-xs" size="sm">
                      Clear
                    </Button>
                    <Button onClick={handlePrint} className="flex-[2] btn-primary-gradient text-xs" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
                      Print Job
                    </Button>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Full Preview Modal Focus State */}
      {showPreview && selectedSku && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl shadow-2xl max-w-lg w-full p-0 overflow-hidden animate-in zoom-in-95 duration-200" style={{ background: '#0d1929', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-500" />
                Actual Size Preview
              </h3>
              <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 transition-colors">
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            
            <div className="p-10 flex justify-center relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
               {/* Pattern */}
               <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
               
              <div className="bg-white/[0.04] rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] p-4 w-[280px] ring-1 ring-white/ relative z-10 transform scale-110">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Logo width={180} height={180} />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex flex-col border-t border-white/10 pt-2">
                    <div className="text-[8px] tracking-wider text-neutral-400 uppercase font-semibold">SKU Reference</div>
                    <div className="font-mono text-sm font-bold text-neutral-100 tracking-tight">{products.find(p => p.sku === selectedSku)?.sku}</div>
                  </div>
                  <div className="flex justify-center -mb-2 mt-2">
                    <svg ref={previewBarcodeRef} className="w-full h-14"></svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 flex gap-3 border-t border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Button variant="outline" className="flex-1" onClick={() => setShowPreview(false)}>
                Go Back
              </Button>
              <Button className="flex-1 btn-primary-gradient" onClick={() => { handlePrintSingle(); setShowPreview(false); }} leftIcon={<Printer className="w-4 h-4" />}>
                Proceed to Print
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Sticker;
