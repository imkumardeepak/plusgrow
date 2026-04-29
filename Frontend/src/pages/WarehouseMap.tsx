import React, { useState, memo, useMemo, useEffect, useCallback } from "react";
import { ActionIcon } from "@mantine/core";
import {
  locationsApi,
  productAllottedLocationsApi,
} from "../services/masterApi";
import type {
  Location,
  ProductAllottedLocationRecord,
} from "../services/masterApi";
import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import {
  Search,
  Map as MapIcon,
  MapPin,
  ArrowRight,
  Route,
  Layers,
  Package,
  AlertCircle,
  Box,
  Grid3x3,
  Boxes,
  Warehouse,
  Zap,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Input } from "../components/atoms/Input";
import { cn } from "../lib/utils";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { toast } from "sonner";

type ViewMode = "2d" | "3d";

interface ShelfCell {
  location: Location;
  products: Array<{
    productId: number;
    skuCode: string;
    productName: string;
    quantity: number;
  }>;
  totalQty: number;
}

interface RackColumn {
  aisle: string;
  rack: string;
  shelves: ShelfCell[]; // sorted by shelf code
  totalQty: number;
  totalBins: number;
}

interface AisleGroup {
  aisle: string;
  racks: RackColumn[];
  totalQty: number;
}

export const WarehouseMap = memo(function WarehouseMap() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [allocations, setAllocations] = useState<
    ProductAllottedLocationRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [selectedLocationCode, setSelectedLocationCode] = useState<
    string | null
  >(null);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [activeRackKey, setActiveRackKey] = useState<string | null>(null);

  // Fetch all data from real APIs
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [locs, allocs] = await Promise.all([
        locationsApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setLocations(locs);
      setAllocations(allocs);
    } catch {
      toast.error("Failed to load warehouse data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Invert allocations: build locationCode -> products[]
  const productsByLocation = useMemo(() => {
    const result: Record<
      string,
      Array<{
        productId: number;
        skuCode: string;
        productName: string;
        quantity: number;
      }>
    > = {};

    allocations.forEach((alloc) => {
      const entries = Object.entries(alloc.locationJson || {});
      entries.forEach(([locCode, qty]) => {
        const key = locCode.toUpperCase();
        if (!result[key]) result[key] = [];
        if (Number(qty) > 0) {
          result[key].push({
            productId: alloc.productId,
            skuCode: alloc.skuCode,
            productName: alloc.productName,
            quantity: Number(qty),
          });
        }
      });
    });

    return result;
  }, [allocations]);

  // Build hierarchical warehouse structure: Aisle -> Rack -> Shelf
  const warehouseStructure = useMemo<AisleGroup[]>(() => {
    const aisleMap: Record<string, Record<string, ShelfCell[]>> = {};

    locations.forEach((loc) => {
      const aisle = loc.aisle || "?";
      const rack = loc.rack || "?";
      if (!aisleMap[aisle]) aisleMap[aisle] = {};
      if (!aisleMap[aisle][rack]) aisleMap[aisle][rack] = [];

      const products = productsByLocation[loc.locationCode.toUpperCase()] || [];
      const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);

      aisleMap[aisle][rack].push({
        location: loc,
        products,
        totalQty,
      });
    });

    const aisles: AisleGroup[] = Object.keys(aisleMap)
      .sort()
      .map((aisle) => {
        const racks: RackColumn[] = Object.keys(aisleMap[aisle])
          .sort()
          .map((rack) => {
            const shelves = aisleMap[aisle][rack].sort((a, b) =>
              a.location.shelf.localeCompare(b.location.shelf),
            );
            const totalQty = shelves.reduce((sum, s) => sum + s.totalQty, 0);
            const totalBins = shelves.reduce(
              (sum, s) => sum + (s.location.bins?.length || 0),
              0,
            );
            return { aisle, rack, shelves, totalQty, totalBins };
          });
        const totalQty = racks.reduce((sum, r) => sum + r.totalQty, 0);
        return { aisle, racks, totalQty };
      });

    return aisles;
  }, [locations, productsByLocation]);

  // Flat list of all products stored in warehouse for sidebar
  const storedProducts = useMemo(() => {
    type Row = {
      productId: number;
      skuCode: string;
      productName: string;
      totalQty: number;
      locations: Array<{ locationCode: string; quantity: number }>;
    };
    const result: Record<number, Row> = {};

    allocations.forEach((alloc) => {
      const entries = Object.entries(alloc.locationJson || {}).filter(
        ([, v]) => Number(v) > 0,
      );
      if (entries.length === 0) return;

      result[alloc.productId] = {
        productId: alloc.productId,
        skuCode: alloc.skuCode,
        productName: alloc.productName,
        totalQty: entries.reduce((sum, [, v]) => sum + Number(v), 0),
        locations: entries.map(([k, v]) => ({
          locationCode: k,
          quantity: Number(v),
        })),
      };
    });

    return Object.values(result).sort((a, b) => b.totalQty - a.totalQty);
  }, [allocations]);

  // Global product list filter
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return storedProducts;
    const q = searchTerm.toLowerCase();
    return storedProducts.filter(
      (p) =>
        p.skuCode.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.locations.some((l) => l.locationCode.toLowerCase().includes(q)),
    );
  }, [storedProducts, searchTerm]);

  // Locations that hold the selected product (for highlighting)
  const highlightedLocationCodes = useMemo(() => {
    if (!selectedProductId) return new Set<string>();
    const alloc = allocations.find((a) => a.productId === selectedProductId);
    if (!alloc) return new Set<string>();
    return new Set(
      Object.keys(alloc.locationJson || {})
        .filter((k) => Number(alloc.locationJson[k]) > 0)
        .map((k) => k.toUpperCase()),
    );
  }, [selectedProductId, allocations]);

  // Max qty per shelf across warehouse (for heatmap intensity)
  const maxShelfQty = useMemo(() => {
    let m = 0;
    warehouseStructure.forEach((a) =>
      a.racks.forEach((r) =>
        r.shelves.forEach((s) => {
          if (s.totalQty > m) m = s.totalQty;
        }),
      ),
    );
    return m || 1;
  }, [warehouseStructure]);

  // Totals for metrics
  const totalUnits = useMemo(
    () =>
      allocations.reduce((sum: number, a) => {
        const values = Object.values(
          (a.locationJson || {}) as Record<string, number>,
        );
        return sum + values.reduce((s: number, v) => s + Number(v), 0);
      }, 0),
    [allocations],
  );

  const occupiedLocations = useMemo(
    () =>
      Object.keys(productsByLocation).filter(
        (k) => productsByLocation[k].length > 0,
      ).length,
    [productsByLocation],
  );

  const selectedProduct = useMemo(
    () => storedProducts.find((p) => p.productId === selectedProductId),
    [storedProducts, selectedProductId],
  );

  const productAisles = useMemo(() => {
    if (!selectedProduct) return new Set<string>();
    const aisles = new Set<string>();
    selectedProduct.locations.forEach((item) => {
      const location = locations.find(
        (loc) =>
          loc.locationCode.toUpperCase() === item.locationCode.toUpperCase(),
      );
      if (location?.aisle) {
        aisles.add(location.aisle);
      }
    });
    return aisles;
  }, [locations, selectedProduct]);

  const filteredAisles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return warehouseStructure
      .map((aisle) => {
        const racks = aisle.racks.filter((rack) => {
          const rackMatchesSearch =
            !q ||
            aisle.aisle.toLowerCase().includes(q) ||
            rack.rack.toLowerCase().includes(q) ||
            rack.shelves.some((shelf) => {
              const locationCode = shelf.location.locationCode.toLowerCase();
              const shelfCode = shelf.location.shelf.toLowerCase();
              const binText = (shelf.location.bins || []).join(" ").toLowerCase();
              const productText = shelf.products
                .map((p) => `${p.skuCode} ${p.productName}`)
                .join(" ")
                .toLowerCase();

              return (
                locationCode.includes(q) ||
                shelfCode.includes(q) ||
                binText.includes(q) ||
                productText.includes(q)
              );
            });

          const rackMatchesProduct =
            !selectedProductId ||
            rack.shelves.some((shelf) =>
              highlightedLocationCodes.has(
                shelf.location.locationCode.toUpperCase(),
              ),
            );

          return rackMatchesSearch && rackMatchesProduct;
        });

        return {
          ...aisle,
          racks,
          totalQty: racks.reduce((sum, rack) => sum + rack.totalQty, 0),
        };
      })
      .filter((aisle) => aisle.racks.length > 0);
  }, [highlightedLocationCodes, searchTerm, selectedProductId, warehouseStructure]);

  useEffect(() => {
    if (!selectedProduct || selectedProduct.locations.length === 0) return;

    const firstLocation = locations.find(
      (loc) =>
        loc.locationCode.toUpperCase() ===
        selectedProduct.locations[0].locationCode.toUpperCase(),
    );

    if (firstLocation) {
      setActiveRackKey(`${firstLocation.aisle}-${firstLocation.rack}`);
      setSelectedLocationCode(firstLocation.locationCode);
    }
  }, [locations, selectedProduct]);

  const selectedShelf = useMemo(() => {
    if (!selectedLocationCode) return null;
    const key = selectedLocationCode.toUpperCase();
    for (const a of warehouseStructure) {
      for (const r of a.racks) {
        const s = r.shelves.find(
          (s) => s.location.locationCode.toUpperCase() === key,
        );
        if (s) return s;
      }
    }
    return null;
  }, [selectedLocationCode, warehouseStructure]);

  return (
    <OperationsPage
      title="Facility Mapping"
      description="Live warehouse layout generated from Location Master, populated from Product Allocations"
      icon={MapIcon}
      hideHeader
      actions={
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500 group-focus-within:text-orange-400 transition-colors" />
            <Input
              placeholder="Search SKU, product, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 w-60 text-[11px] bg-white/[0.03] border-white/10"
            />
          </div>
          <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-md overflow-hidden h-7">
            <button
              type="button"
              onClick={() => setViewMode("2d")}
              className={cn(
                "px-2 h-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1",
                viewMode === "2d"
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-neutral-500 hover:text-neutral-300",
              )}
            >
              <Grid3x3 className="w-3 h-3" /> 2D
            </button>
            <button
              type="button"
              onClick={() => setViewMode("3d")}
              className={cn(
                "px-2 h-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 border-l border-white/10",
                viewMode === "3d"
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-neutral-500 hover:text-neutral-300",
              )}
            >
              <Boxes className="w-3 h-3" /> 3D
            </button>
          </div>
          <Button
            onClick={() => {
              setSelectedProductId(null);
              setSelectedLocationCode(null);
              setSearchTerm("");
              setActiveRackKey(null);
            }}
            variant="outline"
            size="xs"
            className="h-7 border-white/10"
          >
            Reset
          </Button>
          <Button
            onClick={loadData}
            variant="outline"
            size="xs"
            className="h-7 border-white/10"
          >
            Refresh
          </Button>
        </div>
      }
    >
      <OperationsPanel
        title="Global Search"
        icon={Search}
        description="Search product name, SKU, aisle, rack, shelf, bin, or location code."
        action={
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              size="sm"
              className="text-[9px] bg-white/5 text-neutral-300 border-white/10"
            >
              {filteredProducts.length} products
            </Badge>
            <Badge
              variant="secondary"
              size="sm"
              className="text-[9px] bg-white/5 text-neutral-300 border-white/10"
            >
              {filteredAisles.length} aisles
            </Badge>
          </div>
        }
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <Input
              placeholder="Search product name, SKU, aisle, rack, shelf, bin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-[12px] bg-white/[0.03] border-white/10"
              fullWidth
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
              <button
                type="button"
                onClick={() => setViewMode("2d")}
                className={cn(
                  "flex h-full items-center gap-1 px-2 text-[10px] font-bold uppercase transition-colors",
                  viewMode === "2d"
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-neutral-500 hover:text-neutral-300",
                )}
              >
                <Grid3x3 className="h-3 w-3" /> 2D
              </button>
              <button
                type="button"
                onClick={() => setViewMode("3d")}
                className={cn(
                  "flex h-full items-center gap-1 border-l border-white/10 px-2 text-[10px] font-bold uppercase transition-colors",
                  viewMode === "3d"
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-neutral-500 hover:text-neutral-300",
                )}
              >
                <Boxes className="h-3 w-3" /> 3D
              </button>
            </div>
            <Button
              onClick={() => {
                setSelectedProductId(null);
                setSelectedLocationCode(null);
                setSearchTerm("");
                setActiveRackKey(null);
              }}
              variant="outline"
              size="xs"
              className="h-8 border-white/10"
            >
              Reset
            </Button>
            <Button
              onClick={loadData}
              variant="outline"
              size="xs"
              className="h-8 border-white/10"
            >
              Refresh
            </Button>
          </div>
        </div>
      </OperationsPanel>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* LEFT: Product directory from product_allotted_locations */}
        <OperationsPanel
          title="Stored Products"
          icon={Package}
          className="lg:col-span-3 flex flex-col overflow-hidden"
          contentClassName="overflow-y-auto scrollbar-thin"
          action={
            <Badge
              variant="primary"
              size="sm"
              className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[9px]"
            >
              {filteredProducts.length}
            </Badge>
          }
        >
          <div className="space-y-1">
            {filteredProducts.map((item) => {
              const isSelected = selectedProductId === item.productId;
              return (
                <div
                  key={item.productId}
                  onClick={() => {
                    setSelectedProductId(isSelected ? null : item.productId);
                    setSelectedLocationCode(null);
                  }}
                  className={cn(
                    "p-2 rounded-lg border flex flex-col gap-1 cursor-pointer transition-all duration-300",
                    isSelected
                      ? "bg-orange-500/10 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)] ring-1 ring-orange-500/20"
                      : "bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.05]",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "w-6 h-6 rounded flex items-center justify-center shrink-0 border",
                          isSelected
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            : "bg-white/5 text-neutral-500 border-white/10",
                        )}
                      >
                        <Package className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-bold text-white truncate">
                          {item.skuCode || "—"}
                        </h4>
                        <p className="text-[9px] uppercase font-bold text-neutral-500 truncate">
                          {item.productName}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={isSelected ? "warning" : "default"}
                      size="sm"
                      className={cn(
                        "text-[9px] h-4 tracking-tighter px-1 shadow-none shrink-0",
                        !isSelected &&
                          "bg-white/5 text-neutral-500 border-white/10",
                      )}
                    >
                      {item.totalQty}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-0.5 px-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-neutral-400 truncate">
                      <MapPin className="w-2.5 h-2.5 text-orange-500/70 shrink-0" />
                      {item.locations.length === 1
                        ? item.locations[0].locationCode
                        : `${item.locations.length} locations`}
                    </div>
                    <ArrowRight
                      className={cn(
                        "w-3 h-3 transition-all shrink-0",
                        isSelected
                          ? "text-orange-500 translate-x-0.5"
                          : "text-neutral-500 opacity-0",
                      )}
                    />
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <Route className="w-8 h-8 text-neutral-500 mb-2" />
                <h3 className="text-[10px] font-bold text-neutral-300">
                  {isLoading ? "Loading..." : "No Products Stored"}
                </h3>
              </div>
            )}
          </div>
        </OperationsPanel>

        {/* RIGHT: Warehouse visualization */}
        <OperationsPanel
          title={
            viewMode === "3d" ? "3D Isometric Warehouse" : "2D Warehouse Layout"
          }
          icon={viewMode === "3d" ? Boxes : MapIcon}
          className="lg:col-span-9 flex flex-col overflow-hidden"
          contentClassName="overflow-auto"
          action={
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                size="sm"
                className="text-[9px] bg-white/5 text-neutral-300 border-white/10"
              >
                {filteredAisles.length} aisles
              </Badge>
              <Badge
                variant="secondary"
                size="sm"
                className="text-[9px] bg-white/5 text-neutral-300 border-white/10"
              >
                {occupiedLocations}/{locations.length} occupied
              </Badge>
              <Badge
                variant="secondary"
                size="sm"
                className="text-[9px] bg-white/5 text-neutral-300 border-white/10"
              >
                {totalUnits} units
              </Badge>
            </div>
          }
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[480px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-neutral-400">
                  Loading warehouse layout...
                </p>
              </div>
            </div>
          ) : warehouseStructure.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[480px]">
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertCircle className="w-12 h-12 text-neutral-600" />
                <h3 className="text-sm font-bold text-neutral-300">
                  No Locations Configured
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs">
                  Add locations in the Location Master to visualize your
                  warehouse layout
                </p>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "relative h-full min-h-[480px] p-4 overflow-auto",
                "bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:15px_15px]",
              )}
            >
              {/* Warehouse floor */}
              <div
                className={cn(
                  "grid grid-cols-1 xl:grid-cols-2 gap-4 w-full min-w-0",
                  viewMode === "3d" && "[perspective:1600px]",
                )}
              >
                {filteredAisles.map((aisle) => (
                  <AisleView
                    key={aisle.aisle}
                    aisle={aisle}
                    viewMode={viewMode}
                    highlightedLocationCodes={highlightedLocationCodes}
                    selectedLocationCode={selectedLocationCode}
                    selectedProductId={selectedProductId}
                    activeRackKey={activeRackKey}
                    maxShelfQty={maxShelfQty}
                    onRackClick={(rackKey) =>
                      setActiveRackKey((current) =>
                        current === rackKey ? null : rackKey,
                      )
                    }
                    onShelfClick={(code) => {
                      setSelectedLocationCode(
                        selectedLocationCode === code ? null : code,
                      );
                    }}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="sticky bottom-0 left-0 right-0 mt-6 flex items-center justify-between gap-3 bg-neutral-900/80 backdrop-blur-md border border-white/10 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-neutral-800 border border-neutral-700" />
                    Empty
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500/60" />
                    Low
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/60 border border-amber-500/80" />
                    Medium
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/80 border border-orange-400" />
                    High
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm ring-2 ring-orange-400 bg-orange-500" />
                    Selected
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                  <Zap className="w-3 h-3 text-orange-500" />
                  {viewMode === "3d" ? "Isometric View" : "Top-Down View"}
                </div>
              </div>

              {/* Selected product overlay */}
              {selectedProduct && (
                <div className="mt-3 w-full bg-neutral-900/95 backdrop-blur-md border border-orange-500/30 p-3 rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.12)]">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                    <div className="w-8 h-8 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                        Tracking Product
                      </p>
                      <p className="text-[11px] font-bold text-white leading-tight truncate">
                        {selectedProduct.skuCode}
                      </p>
                      <p className="text-[9px] text-neutral-400 truncate">
                        {selectedProduct.productName}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedProduct.locations.map((l, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedLocationCode(l.locationCode)}
                        className={cn(
                          "flex justify-between items-center text-[10px] font-mono px-2 py-1.5 rounded border cursor-pointer transition-colors",
                          selectedLocationCode?.toUpperCase() ===
                            l.locationCode.toUpperCase()
                            ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                            : "bg-white/[0.02] border-white/5 hover:border-orange-500/30 text-neutral-400",
                        )}
                      >
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-orange-500/70" />
                          {l.locationCode}
                        </span>
                        <span className="text-orange-400 font-bold">
                          {l.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px]">
                    <span className="text-neutral-500 uppercase tracking-wider font-bold">
                      Total Stock
                    </span>
                    <span className="text-orange-400 font-bold text-[11px]">
                      {selectedProduct.totalQty} units
                    </span>
                  </div>
                </div>
              )}

              {/* Selected shelf overlay */}
              {selectedShelf && (
                <div className="mt-3 w-full bg-neutral-900/95 backdrop-blur-md border border-cyan-500/30 p-3 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.12)]">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                    <div className="w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                        Location
                      </p>
                      <p className="text-[12px] font-bold text-white leading-tight truncate font-mono">
                        {selectedShelf.location.locationCode}
                      </p>
                      <p className="text-[9px] text-neutral-400">
                        {selectedShelf.location.bins?.length || 0} bins
                        configured
                      </p>
                    </div>
                  </div>
                  {selectedShelf.products.length === 0 ? (
                    <div className="text-[10px] text-neutral-500 italic text-center py-2">
                      No products stored here
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedShelf.products.map((p) => (
                        <div
                          key={p.productId}
                          onClick={() => setSelectedProductId(p.productId)}
                          className="flex justify-between items-center text-[10px] px-2 py-1.5 rounded border border-white/5 bg-white/[0.02] hover:border-cyan-500/30 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-mono font-bold text-cyan-300 truncate">
                              {p.skuCode}
                            </div>
                            <div className="text-[8px] text-neutral-500 truncate">
                              {p.productName}
                            </div>
                          </div>
                          <span className="text-cyan-400 font-bold shrink-0 ml-2">
                            {p.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px]">
                    <span className="text-neutral-500 uppercase tracking-wider font-bold">
                      Shelf Total
                    </span>
                    <span className="text-cyan-400 font-bold text-[11px]">
                      {selectedShelf.totalQty} units
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

// ---------- Sub-components ----------

interface AisleViewProps {
  aisle: AisleGroup;
  viewMode: ViewMode;
  highlightedLocationCodes: Set<string>;
  selectedLocationCode: string | null;
  selectedProductId: number | null;
  activeRackKey: string | null;
  maxShelfQty: number;
  onRackClick: (rackKey: string) => void;
  onShelfClick: (locationCode: string) => void;
}

const AisleView = memo(function AisleView({
  aisle,
  viewMode,
  highlightedLocationCodes,
  selectedLocationCode,
  selectedProductId,
  activeRackKey,
  maxShelfQty,
  onRackClick,
  onShelfClick,
}: AisleViewProps) {
  const aisleHighlighted =
    selectedProductId !== null &&
    aisle.racks.some((r) =>
      r.shelves.some((s) =>
        highlightedLocationCodes.has(s.location.locationCode.toUpperCase()),
      ),
    );

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        aisleHighlighted
          ? "border-orange-500/40 bg-orange-500/6"
          : "border-white/10 bg-white/[0.03]",
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded border transition-colors",
              aisleHighlighted
                ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                : "bg-white/[0.03] border-white/10 text-neutral-400",
            )}
          >
            <Warehouse className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Aisle {aisle.aisle}
            </span>
          </div>
        </div>
        <span className="text-[9px] font-mono text-neutral-500">
          {aisle.racks.length} racks · {aisle.totalQty} units
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {aisle.racks.map((rack) => (
          <RackView
            key={`${aisle.aisle}-${rack.rack}`}
            rack={rack}
            viewMode={viewMode}
            highlightedLocationCodes={highlightedLocationCodes}
            selectedLocationCode={selectedLocationCode}
            selectedProductId={selectedProductId}
            isOpen={activeRackKey === `${aisle.aisle}-${rack.rack}`}
            maxShelfQty={maxShelfQty}
            onRackClick={() => onRackClick(`${aisle.aisle}-${rack.rack}`)}
            onShelfClick={onShelfClick}
          />
        ))}
      </div>
    </div>
  );
});

interface RackViewProps {
  rack: RackColumn;
  viewMode: ViewMode;
  highlightedLocationCodes: Set<string>;
  selectedLocationCode: string | null;
  selectedProductId: number | null;
  isOpen: boolean;
  maxShelfQty: number;
  onRackClick: () => void;
  onShelfClick: (locationCode: string) => void;
}

const RackView = memo(function RackView({
  rack,
  viewMode,
  highlightedLocationCodes,
  selectedLocationCode,
  selectedProductId,
  isOpen,
  maxShelfQty,
  onRackClick,
  onShelfClick,
}: RackViewProps) {
  const rackHighlighted =
    selectedProductId !== null &&
    rack.shelves.some((s) =>
      highlightedLocationCodes.has(s.location.locationCode.toUpperCase()),
    );

  return (
    <div
      className={cn(
        "relative flex flex-col border rounded-lg overflow-hidden transition-all duration-500",
        rackHighlighted
          ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.25)] bg-orange-950/20"
          : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700",
        viewMode === "3d" && "shadow-2xl",
      )}
      style={
        viewMode === "3d"
          ? {
              transform: "translateZ(0px)",
              boxShadow:
                "8px 12px 0 rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.5)",
            }
          : undefined
      }
    >
      {/* Rack header */}
      <button
        type="button"
        onClick={onRackClick}
        className={cn(
          "py-2 px-2 text-center border-b transition-colors cursor-pointer",
          isOpen || rackHighlighted
            ? "bg-orange-500 text-white border-orange-600"
            : "bg-neutral-900 text-neutral-400 border-neutral-800",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span className="font-heading font-bold tracking-wider text-[10px]">
              {rack.aisle}-{rack.rack}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono opacity-80">
              {rack.totalQty} u
            </span>
            <ChevronRight
              className={cn(
                "w-3 h-3 transition-transform",
                isOpen ? "rotate-90" : "",
              )}
            />
          </div>
        </div>
      </button>

      {isOpen ? (
        <>
          <div className="flex flex-col p-1.5 gap-1">
            {[...rack.shelves].reverse().map((shelf) => (
              <ShelfView
                key={shelf.location.id}
                shelf={shelf}
                isHighlighted={highlightedLocationCodes.has(
                  shelf.location.locationCode.toUpperCase(),
                )}
                isSelected={
                  selectedLocationCode?.toUpperCase() ===
                  shelf.location.locationCode.toUpperCase()
                }
                maxShelfQty={maxShelfQty}
                viewMode={viewMode}
                onClick={() => onShelfClick(shelf.location.locationCode)}
              />
            ))}
          </div>

          <div
            className={cn(
              "text-[8px] font-mono text-center py-1 border-t transition-colors",
              rackHighlighted
                ? "bg-orange-600 text-white border-orange-700"
                : "bg-neutral-900 text-neutral-500 border-neutral-800",
            )}
          >
            {rack.shelves.length} shelves · {rack.totalBins} bins
          </div>
        </>
      ) : (
        <div className="px-2 py-2 text-[9px] text-neutral-500">
          Open rack for shelves
        </div>
      )}
    </div>
  );
});

interface ShelfViewProps {
  shelf: ShelfCell;
  isHighlighted: boolean;
  isSelected: boolean;
  maxShelfQty: number;
  viewMode: ViewMode;
  onClick: () => void;
}

const ShelfView = memo(function ShelfView({
  shelf,
  isHighlighted,
  isSelected,
  maxShelfQty,
  viewMode,
  onClick,
}: ShelfViewProps) {
  const fillRatio = Math.min(shelf.totalQty / maxShelfQty, 1);
  const hasProducts = shelf.totalQty > 0;

  // Heatmap coloring
  let bgClass = "bg-neutral-950/70 border-neutral-800/60";
  if (hasProducts) {
    if (fillRatio < 0.34) bgClass = "bg-emerald-500/30 border-emerald-500/50";
    else if (fillRatio < 0.67) bgClass = "bg-amber-500/50 border-amber-500/70";
    else bgClass = "bg-orange-500/70 border-orange-400";
  }

  if (isHighlighted) {
    bgClass =
      "bg-orange-500/80 border-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.6)] animate-pulse";
  }

  if (isSelected) {
    bgClass =
      "bg-cyan-500/80 border-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.7)] ring-2 ring-cyan-400";
  }

  return (
    <div
      onClick={onClick}
      title={`${shelf.location.locationCode} · ${shelf.totalQty} units · ${shelf.products.length} SKUs`}
      className={cn(
        "relative rounded border flex items-center justify-between px-1.5 py-1 gap-1 cursor-pointer transition-all duration-300",
        "min-h-[28px]",
        bgClass,
        viewMode === "3d" && "hover:scale-[1.03] hover:z-10",
      )}
    >
      <div className="flex items-center gap-1 min-w-0">
        <Box
          className={cn(
            "w-2.5 h-2.5 shrink-0",
            hasProducts ? "text-white/90" : "text-neutral-600",
          )}
        />
        <span
          className={cn(
            "text-[9px] font-mono font-bold truncate",
            hasProducts ? "text-white" : "text-neutral-500",
          )}
        >
          {shelf.location.shelf}
        </span>
      </div>
      {hasProducts && (
        <div className="flex items-center gap-1 shrink-0">
          {shelf.products.length > 1 && (
            <span className="text-[7px] font-bold bg-black/30 text-white/90 px-1 rounded">
              ×{shelf.products.length}
            </span>
          )}
          <span className="text-[9px] font-bold text-white">
            {shelf.totalQty}
          </span>
        </div>
      )}
    </div>
  );
});

export default WarehouseMap;
