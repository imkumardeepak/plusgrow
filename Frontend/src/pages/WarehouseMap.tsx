import React, { useState, memo, useMemo } from "react";
import { useWms } from "../context/WmsContext";
import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import {
  Search,
  Map,
  Box,
  MapPin,
  Crosshair,
  ArrowRight,
  Route,
} from "lucide-react";
import { Input } from "../components/atoms/Input";
import { cn } from "../lib/utils";
import {
  OperationsPage,
  OperationsPanel,
  OperationsEmptyState,
} from "../components/organisms/Operations/OperationsShell";

interface RacksDef {
  id: string;
  name: string;
}

const RACKS: RacksDef[] = [
  { id: "A", name: "Aisle A" },
  { id: "B", name: "Aisle B" },
  { id: "C", name: "Aisle C" },
  { id: "D", name: "Aisle D" },
  { id: "E", name: "Aisle E" },
  { id: "F", name: "Aisle F" },
];

export const WarehouseMap = memo(function WarehouseMap() {
  const { stock, products } = useWms();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  // Get only assigned stock
  const locatedStock = useMemo(() => {
    return stock.filter((s) => s.rack !== "Unassigned" && s.quantity > 0);
  }, [stock]);

  // Map product details to stock
  const enrichedStock = useMemo(() => {
    return locatedStock.map((s) => {
      const prod = products.find((p) => p.sku === s.sku);
      return {
        ...s,
        title: prod?.title || "Unknown Product",
      };
    });
  }, [locatedStock, products]);

  // Filter based on search
  const filteredStock = useMemo(() => {
    return enrichedStock.filter(
      (s) =>
        s.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rack.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [enrichedStock, searchTerm]);

  // Find the selected stock's rack to highlight
  const selectedRackId = useMemo(() => {
    if (!selectedSku) return null;
    const found = locatedStock.find((s) => s.sku === selectedSku);
    return found ? found.rack : null;
  }, [selectedSku, locatedStock]);

  return (
    <OperationsPage
      title="Facility Mapping"
      description="Asset & Inventory Locator"
      icon={Map}
      actions={
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500 group-focus-within:text-orange-400 transition-colors" />
            <Input
              placeholder="Search SKU or Loc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 w-48 text-[11px] bg-white/[0.03] border-white/10"
            />
          </div>
          <Button
            onClick={() => setSelectedSku(null)}
            variant="outline"
            size="xs"
            className="h-7 border-white/10"
          >
            Reset
          </Button>
        </div>
      }
      metrics={[
        { label: "Located Assets", value: filteredStock.length, tone: "brand" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <OperationsPanel
          title="Coordinates"
          icon={Crosshair}
          className="lg:col-span-3 flex flex-col overflow-hidden"
          contentClassName="overflow-y-auto scrollbar-thin"
          action={
            <Badge
              variant="primary"
              size="sm"
              className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[9px]"
            >
              {filteredStock.length}
            </Badge>
          }
        >
          <div className="space-y-1">
            {filteredStock.map((item) => (
              <div
                key={`${item.sku}-${item.rack}-${item.shelf}-${item.bin}`}
                onClick={() => setSelectedSku(item.sku)}
                className={cn(
                  "p-2 rounded-lg border flex flex-col gap-1 cursor-pointer transition-all duration-300",
                  selectedSku === item.sku
                    ? "bg-orange-500/10 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)] ring-1 ring-orange-500/20"
                    : "bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.05]",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center shrink-0 border",
                        selectedSku === item.sku
                          ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                          : "bg-white/5 text-neutral-500 border-white/10",
                      )}
                    >
                      <Box className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-white truncate">
                        {item.sku}
                      </h4>
                      <p className="text-[9px] uppercase font-bold text-neutral-500 truncate">
                        {item.title}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={selectedSku === item.sku ? "warning" : "default"}
                    size="sm"
                    className={cn(
                      "text-[9px] h-4 tracking-tighter px-1 shadow-none",
                      selectedSku !== item.sku &&
                        "bg-white/5 text-neutral-500 border-white/10",
                    )}
                  >
                    {item.quantity}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-0.5 px-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-neutral-400">
                    <MapPin className="w-2.5 h-2.5 text-orange-500/70" />
                    {item.rack}-{item.shelf}-{item.bin}
                  </div>
                  <ArrowRight
                    className={cn(
                      "w-3 h-3 transition-all",
                      selectedSku === item.sku
                        ? "text-orange-500 translate-x-0.5"
                        : "text-neutral-500 opacity-0",
                    )}
                  />
                </div>
              </div>
            ))}

            {filteredStock.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <Route className="w-8 h-8 text-neutral-500 mb-2" />
                <h3 className="text-[10px] font-bold text-neutral-300">
                  No Asset Found
                </h3>
              </div>
            )}
          </div>
        </OperationsPanel>

        <OperationsPanel
          title="Interactive Floor Plan"
          icon={Map}
          className="lg:col-span-9 flex flex-col overflow-hidden"
          contentClassName="overflow-auto"
          action={
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse"></span>
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                System Live
              </span>
            </div>
          }
        >
          <div className="relative flex items-center justify-center bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:15px_15px] h-full min-h-[400px]">
            {/* Dispatch / Receiving Docks Decoration - Compact */}
            <div className="absolute left-4 top-4 bottom-4 w-10 border border-neutral-800 border-dashed rounded-lg bg-neutral-900/30 flex flex-col items-center justify-around py-6 opacity-40">
              <div className="-rotate-90 text-[8px] font-bold tracking-[0.2em] text-neutral-500 uppercase whitespace-nowrap">
                Receiving
              </div>
              <div className="w-4 h-px bg-neutral-800"></div>
              <div className="-rotate-90 text-[8px] font-bold tracking-[0.2em] text-neutral-500 uppercase whitespace-nowrap">
                Dispatch
              </div>
            </div>

            {/* Warehouse Grid Representation - Compact */}
            <div className="grid grid-cols-3 gap-x-8 gap-y-6 pl-16 py-4">
              {RACKS.map((rack) => {
                const isHighlighted = selectedRackId === rack.id;
                const skusInRack = enrichedStock.filter(
                  (s) => s.rack === rack.id,
                );
                const totalItems = skusInRack.reduce(
                  (sum, s) => sum + s.quantity,
                  0,
                );

                return (
                  <div
                    key={rack.id}
                    className={cn(
                      "relative flex flex-col w-32 h-48 border rounded-lg overflow-hidden transition-all duration-500",
                      isHighlighted
                        ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)] scale-105 z-10 bg-orange-950/20"
                        : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700",
                    )}
                  >
                    {/* Rack Header - Compact */}
                    <div
                      className={cn(
                        "py-1 text-center border-b transition-colors",
                        isHighlighted
                          ? "bg-orange-500 text-white border-orange-600"
                          : "bg-neutral-900 text-neutral-500 border-neutral-800",
                      )}
                    >
                      <span className="font-heading font-bold tracking-widest text-[11px]">
                        {rack.name}
                      </span>
                    </div>

                    {/* Rack Shelves - Compact */}
                    <div className="flex-1 flex flex-col p-1.5 gap-1.5">
                      {[1, 2, 3, 4].map((shelfLevel) => {
                        const shelfId = `S${shelfLevel}`;
                        const isShelfHighlighted =
                          isHighlighted &&
                          skusInRack.some(
                            (s) => s.shelf === shelfId && s.sku === selectedSku,
                          );

                        return (
                          <div
                            key={shelfLevel}
                            className={cn(
                              "flex-1 rounded border flex items-center justify-center transition-all duration-300",
                              isShelfHighlighted
                                ? "border-orange-400 bg-orange-500/20 shadow-[inset_0_0_5px_rgba(249,115,22,0.3)] animate-pulse"
                                : isHighlighted
                                  ? "border-orange-500/10 bg-neutral-950/50"
                                  : "border-neutral-800/50 bg-neutral-950/50",
                            )}
                          >
                            {isShelfHighlighted && (
                              <Badge
                                variant="warning"
                                className="text-[7px] bg-orange-500 text-white px-1 py-0 shadow-lg scale-90"
                              >
                                Target
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Info Footer - Compact */}
                    {totalItems > 0 && (
                      <div
                        className={cn(
                          "absolute bottom-[-1px] left-[-1px] right-[-1px] text-[8px] font-mono font-bold text-center py-0.5 transition-colors",
                          isHighlighted
                            ? "bg-orange-600 text-white"
                            : "bg-neutral-800 text-neutral-500",
                        )}
                      >
                        {totalItems} Units
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selection overlay text - Ultra Compact Pro Max */}
            {selectedSku && (
              <div className="absolute bottom-4 right-4 max-w-[200px] bg-neutral-900/90 backdrop-blur-md border border-white/10 p-2.5 rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                  <div className="w-7 h-7 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)]">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                      Asset Tracker
                    </p>
                    <p className="text-[10px] font-bold text-white leading-tight truncate">
                      {selectedSku}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  {locatedStock
                    .filter((s) => s.sku === selectedSku)
                    .slice(0, 3)
                    .map((s, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-[9px] font-mono bg-white/[0.02] px-1.5 py-1 rounded border border-white/5"
                      >
                        <span className="text-neutral-500">
                          {s.rack}-{s.shelf}-{s.bin}
                        </span>
                        <span className="text-orange-400 font-bold">
                          {s.quantity}
                        </span>
                      </div>
                    ))}
                  {locatedStock.filter((s) => s.sku === selectedSku).length >
                    3 && (
                    <p className="text-[8px] text-center text-neutral-600 mt-1">
                      +
                      {locatedStock.filter((s) => s.sku === selectedSku)
                        .length - 3}{" "}
                      more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

export default WarehouseMap;
