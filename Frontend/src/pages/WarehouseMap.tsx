import React, { useState, memo, useMemo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Badge } from '../components/atoms/Badge';
import { Button } from '../components/atoms/Button';
import { Search, Map, Box, MapPin, Crosshair, ArrowRight, Route } from 'lucide-react';
import { Input } from '../components/atoms/Input';
import { cn } from '../lib/utils';

interface RacksDef {
  id: string;
  name: string;
}

const RACKS: RacksDef[] = [
  { id: 'A', name: 'Aisle A' },
  { id: 'B', name: 'Aisle B' },
  { id: 'C', name: 'Aisle C' },
  { id: 'D', name: 'Aisle D' },
  { id: 'E', name: 'Aisle E' },
  { id: 'F', name: 'Aisle F' },
];

export const WarehouseMap = memo(function WarehouseMap() {
  const { stock, products } = useWms();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  // Get only assigned stock
  const locatedStock = useMemo(() => {
    return stock.filter(s => s.rack !== 'Unassigned' && s.quantity > 0);
  }, [stock]);

  // Map product details to stock
  const enrichedStock = useMemo(() => {
    return locatedStock.map(s => {
      const prod = products.find(p => p.sku === s.sku);
      return {
        ...s,
        title: prod?.title || 'Unknown Product'
      };
    });
  }, [locatedStock, products]);

  // Filter based on search
  const filteredStock = useMemo(() => {
    return enrichedStock.filter(s => 
      s.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rack.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedStock, searchTerm]);

  // Find the selected stock's rack to highlight
  const selectedRackId = useMemo(() => {
    if (!selectedSku) return null;
    const found = locatedStock.find(s => s.sku === selectedSku);
    return found ? found.rack : null;
  }, [selectedSku, locatedStock]);

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Pro Max Edition */}
      <Card variant="glass" className="p-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200 shadow-sm">
              <Map className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-neutral-900 leading-tight tracking-tight">Facility Mapping</h1>
              <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase mt-0.5">Asset & Inventory Locator</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-l border-neutral-200/50 pl-4">
             <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
               <Input
                 placeholder="Search SKU or Location..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-9 h-9 text-sm bg-white focus:bg-white transition-colors border-neutral-200 shadow-sm"
               />
             </div>
             <Button
                onClick={() => setSelectedSku(null)} 
                variant="outline"
                className="h-9 shadow-sm"
             >
                Clear Selection
             </Button>
          </div>
        </div>
      </Card>

      {/* Main Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* Left Column: Located SKU List */}
        <Card variant="elevated" className="lg:col-span-4 flex flex-col h-full overflow-hidden border-neutral-200 shadow-sm">
           <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
              <div className="flex items-center justify-between">
                 <CardTitle size="sm" className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-orange-500" />
                    Asset Coordinates
                 </CardTitle>
                 <Badge variant="primary" size="sm" className="bg-orange-100 text-orange-700 border-orange-200">
                    {filteredStock.length} Placed
                 </Badge>
              </div>
           </CardHeader>
           <CardContent className="flex-1 overflow-y-auto p-2 scrollbar-thin relative z-10 bg-white">
              <div className="space-y-1.5">
                 {filteredStock.map((item) => (
                    <div 
                       key={`${item.sku}-${item.rack}-${item.shelf}-${item.bin}`}
                       onClick={() => setSelectedSku(item.sku)}
                       className={cn(
                          "p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all duration-300",
                          selectedSku === item.sku 
                           ? "bg-orange-50 border-orange-300 shadow-sm ring-1 ring-orange-500/20" 
                           : "bg-white border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/50"
                       )}
                    >
                       <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                             <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                                selectedSku === item.sku 
                                 ? "bg-orange-100 text-orange-600 border-orange-200" 
                                 : "bg-neutral-100 text-neutral-500 border-neutral-200"
                             )}>
                                <Box className="w-4 h-4" />
                             </div>
                             <div>
                                <h4 className="text-sm font-bold text-neutral-900">{item.sku}</h4>
                                <p className="text-[10px] uppercase font-bold text-neutral-500 max-w-[140px] truncate">{item.title}</p>
                             </div>
                          </div>
                          
                          <Badge variant={selectedSku === item.sku ? "warning" : "default"} className={cn(
                             "text-[10px] tracking-wider uppercase shadow-none",
                             selectedSku !== item.sku && "bg-neutral-100 text-neutral-600 border-transparent"
                          )}>
                             {item.quantity} Units
                          </Badge>
                       </div>
                       
                       <div className="flex items-center justify-between mt-1 px-1">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-neutral-600">
                             <MapPin className="w-3.5 h-3.5 text-orange-500" />
                             Rack {item.rack} / {item.shelf} / {item.bin}
                          </div>
                          <ArrowRight className={cn(
                             "w-4 h-4 transition-all",
                             selectedSku === item.sku ? "text-orange-500 translate-x-1" : "text-neutral-300 opacity-0"
                          )} />
                       </div>
                    </div>
                 ))}
                 
                 {filteredStock.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                       <Route className="w-10 h-10 text-neutral-300 mb-3" />
                       <h3 className="text-sm font-bold text-neutral-800">No Located SKU Found</h3>
                       <p className="text-xs text-neutral-500 mt-1 max-w-[200px]">Only SKUs that have been assigned to a Rack/Bin appear here.</p>
                    </div>
                 )}
              </div>
           </CardContent>
        </Card>

        {/* Right Column: Visual Map */}
        <Card variant="elevated" className="lg:col-span-8 flex flex-col h-full overflow-hidden border-neutral-200 shadow-sm bg-neutral-900 text-neutral-100">
           <CardHeader className="py-2.5 px-4 border-b border-neutral-800 bg-neutral-950/50 shrink-0">
              <div className="flex items-center justify-between">
                 <CardTitle size="sm" className="flex items-center gap-2 text-white">
                    <Map className="w-4 h-4 text-orange-500" />
                    Interactive Facility Canvas
                 </CardTitle>
                 <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse"></span>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Live Map</span>
                 </div>
              </div>
           </CardHeader>
           
           <CardContent className="flex-1 p-6 relative flex items-center justify-center bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px] overflow-auto">
              {/* Dispatch / Receiving Docks Decoration */}
              <div className="absolute left-6 top-6 bottom-6 w-16 border-2 border-neutral-800 border-dashed rounded-xl bg-neutral-900/50 flex flex-col items-center justify-around py-10 opacity-60">
                 <div className="-rotate-90 text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase whitespace-nowrap">Receiving Dock</div>
                 <div className="w-8 h-px bg-neutral-700"></div>
                 <div className="-rotate-90 text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase whitespace-nowrap">Dispatch Dock</div>
              </div>

              {/* Warehouse Grid Representation */}
              <div className="grid grid-cols-3 gap-x-12 gap-y-10 pl-24">
                 {RACKS.map((rack) => {
                    // Check if selected stock belongs to this rack
                    const isHighlighted = selectedRackId === rack.id;
                    
                    // Get all SKUs in this rack to display a mini summary
                    const skusInRack = enrichedStock.filter(s => s.rack === rack.id);
                    const totalItems = skusInRack.reduce((sum, s) => sum + s.quantity, 0);

                    return (
                       <div 
                          key={rack.id}
                          className={cn(
                             "relative flex flex-col w-40 h-64 border-2 rounded-lg overflow-hidden transition-all duration-500 cursor-default",
                             isHighlighted 
                              ? "border-orange-500 shadow-[0_0_30px_-5px_rgba(249,115,22,0.4)] scale-105 z-10 bg-orange-950/30" 
                              : "border-neutral-700 bg-neutral-800/80 hover:border-neutral-600"
                          )}
                       >
                          {/* Rack Header */}
                          <div className={cn(
                             "py-2 text-center border-b transition-colors",
                             isHighlighted ? "bg-orange-500 text-white border-orange-600" : "bg-neutral-800 text-neutral-400 border-neutral-700"
                          )}>
                             <span className="font-heading font-black tracking-widest text-lg">{rack.name}</span>
                          </div>

                          {/* Rack Shelves Visualization */}
                          <div className="flex-1 flex flex-col p-2 gap-2">
                             {[1, 2, 3, 4].map((shelfLevel) => {
                                // Just a visual mock of shelves inside the rack
                                // We could find exactly if stock is on this shelf if needed
                                const shelfId = `S${shelfLevel}`;
                                const isShelfHighlighted = isHighlighted && skusInRack.some(s => s.shelf === shelfId && s.sku === selectedSku);

                                return (
                                   <div 
                                      key={shelfLevel}
                                      className={cn(
                                         "flex-1 rounded border flex items-center justify-center transition-all duration-300",
                                         isShelfHighlighted 
                                          ? "border-orange-400 bg-orange-500/20 shadow-[inset_0_0_10px_rgba(249,115,22,0.3)] animate-pulse" 
                                          : (isHighlighted ? "border-orange-500/20 bg-neutral-900/50" : "border-neutral-700/50 bg-neutral-900/50")
                                      )}
                                   >
                                      {isShelfHighlighted && (
                                         <Badge variant="warning" className="text-[8px] bg-orange-500 text-white px-1 py-0 shadow-lg">Target</Badge>
                                      )}
                                   </div>
                                );
                             })}
                          </div>

                          {/* Info Footer */}
                          {totalItems > 0 && (
                             <div className={cn(
                                "absolute bottom-[-1px] left-[-1px] right-[-1px] text-[10px] font-mono font-bold text-center py-1 transition-colors",
                                isHighlighted ? "bg-orange-600 text-white" : "bg-neutral-700 text-neutral-300"
                             )}>
                                {skusInRack.length} SKUs / {totalItems} Units
                             </div>
                          )}

                          {totalItems === 0 && (
                             <div className="absolute inset-x-0 bottom-2 text-center text-[10px] font-bold tracking-widest uppercase text-neutral-600">
                                Empty
                             </div>
                          )}
                       </div>
                    );
                 })}
              </div>

              {/* Selection overlay text */}
              {selectedSku && (
                 <div className="absolute bottom-6 right-6 max-w-sm bg-neutral-900/90 backdrop-blur-md border border-neutral-700 p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-8">
                    <div className="flex items-center gap-3 border-b border-neutral-800 pb-3 mb-3">
                       <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                          <MapPin className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Target Acquired</p>
                          <p className="font-heading font-bold text-white leading-tight">{selectedSku}</p>
                       </div>
                    </div>
                    {locatedStock.filter(s => s.sku === selectedSku).map((s, i) => (
                       <div key={i} className="flex justify-between items-center text-sm font-mono bg-neutral-950 p-2 rounded border border-neutral-800 hover:border-orange-500/50 transition-colors cursor-default mb-1">
                          <span className="text-neutral-400">Rack {s.rack} - {s.shelf} - Bin {s.bin}</span>
                          <span className="text-orange-400 font-bold">{s.quantity} units</span>
                       </div>
                    ))}
                 </div>
              )}
           </CardContent>
        </Card>

      </div>
    </div>
  );
});

export default WarehouseMap;
