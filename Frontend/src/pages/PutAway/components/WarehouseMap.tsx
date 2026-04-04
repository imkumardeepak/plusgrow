/**
 * WarehouseMap Component
 * Compact visual warehouse map for bin selection
 */

import React, { memo, useMemo } from "react";
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/atoms/Badge";
import { Warehouse, MapPin, Layers } from "lucide-react";

interface Bin {
  rack: string;
  shelf: string;
  bin: string;
}

interface BinData {
  rack: string;
  shelf: string;
  bin: string;
  quantity: number;
}

interface WarehouseMapProps {
  racks: string[];
  shelves: string[];
  bins: string[];
  stock: BinData[];
  selectedLocation: Bin | null;
  activeRack: string;
  activeShelf: string;
  maxCapacity?: number;
  onSelectBin: (rack: string, shelf: string, bin: string) => void;
  onSetActiveRack: (rack: string) => void;
  onSetActiveShelf: (shelf: string) => void;
  className?: string;
}

const getCapacityColor = (quantity: number, maxCapacity: number) => {
  const percentage = (quantity / maxCapacity) * 100;
  if (percentage === 0) return { bg: "bg-neutral-50", border: "border-neutral-200", dot: "bg-neutral-300" };
  if (percentage <= 50) return { bg: "bg-success-50", border: "border-success-200", dot: "bg-success-500" };
  if (percentage <= 80) return { bg: "bg-warning-50", border: "border-warning-200", dot: "bg-warning-500" };
  return { bg: "bg-danger-50", border: "border-danger-200", dot: "bg-danger-500" };
};

export const WarehouseMap = memo(function WarehouseMap({
  racks,
  shelves,
  bins,
  stock,
  selectedLocation,
  activeRack,
  activeShelf,
  maxCapacity = 100,
  onSelectBin,
  onSetActiveRack,
  onSetActiveShelf,
  className,
}: WarehouseMapProps) {
  // Get bin quantity
  const getBinQty = (rack: string, shelf: string, bin: string) => {
    return stock
      .filter((s) => s.rack === rack && s.shelf === shelf && s.bin === bin)
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-50 rounded-lg">
            <Warehouse className="w-4 h-4 text-brand-600" />
          </div>
          <span className="font-semibold text-sm text-neutral-900">
            Warehouse Map
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success-500" />
            <span className="text-neutral-500">0-50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning-500" />
            <span className="text-neutral-500">51-80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-danger-500" />
            <span className="text-neutral-500">81%+</span>
          </div>
        </div>
      </div>

      {/* Rack Selector */}
      <div className="flex gap-2">
        {racks.map((rack) => (
          <button
            key={rack}
            onClick={() => onSetActiveRack(rack)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeRack === rack
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            Rack {rack}
          </button>
        ))}
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="flex items-center gap-2 p-2 bg-brand-50 border border-brand-200 rounded-lg">
          <MapPin className="w-4 h-4 text-brand-600" />
          <span className="text-sm text-brand-700">
            Selected: Rack {selectedLocation.rack} → {selectedLocation.shelf} →{" "}
            {selectedLocation.bin}
          </span>
        </div>
      )}

      {/* Shelves Grid */}
      <div className="grid grid-cols-2 gap-3">
        {shelves.map((shelf) => {
          const isActiveShelf = activeShelf === shelf;

          return (
            <div
              key={shelf}
              className={cn(
                "rounded-xl border transition-all duration-200 overflow-hidden",
                isActiveShelf
                  ? "border-brand-300 shadow-sm"
                  : "border-neutral-200 hover:border-neutral-300"
              )}
            >
              {/* Shelf Header */}
              <button
                onClick={() => onSetActiveShelf(shelf)}
                className={cn(
                  "w-full px-3 py-2 flex items-center justify-between text-sm font-medium transition-colors",
                  isActiveShelf
                    ? "bg-brand-50 text-brand-700"
                    : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  {shelf}
                </div>
                {isActiveShelf && (
                  <Badge variant="primary" size="sm">
                    Active
                  </Badge>
                )}
              </button>

              {/* Bins Grid */}
              <div className="p-2">
                <div className="grid grid-cols-5 gap-1.5">
                  {bins.map((bin) => {
                    const qty = getBinQty(activeRack, shelf, bin);
                    const isSelected =
                      selectedLocation?.rack === activeRack &&
                      selectedLocation?.shelf === shelf &&
                      selectedLocation?.bin === bin;
                    const colors = getCapacityColor(qty, maxCapacity);

                    return (
                      <button
                        key={bin}
                        onClick={() => onSelectBin(activeRack, shelf, bin)}
                        className={cn(
                          "relative aspect-square rounded-md border text-xs font-medium transition-all duration-200",
                          "flex flex-col items-center justify-center gap-0.5",
                          isSelected
                            ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                            : `${colors.bg} ${colors.border} text-neutral-600 hover:border-brand-300`,
                          !isActiveShelf && !isSelected && "opacity-60"
                        )}
                      >
                        <span className="text-[10px] font-semibold">{bin}</span>
                        {/* Capacity Indicator */}
                        <div className="w-full px-1">
                          <div className="h-0.5 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", colors.dot)}
                              style={{
                                width: `${Math.min(100, (qty / maxCapacity) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        {/* Quantity Badge */}
                        {qty > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-neutral-700 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                            {qty}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
