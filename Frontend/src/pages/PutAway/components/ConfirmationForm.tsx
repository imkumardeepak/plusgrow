/**
 * ConfirmationForm Component
 * Final confirmation step for put-away operation
 */

import React, { memo } from "react";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/atoms/Button";
import { Input } from "../../../components/atoms/Input";
import { Badge } from "../../../components/atoms/Badge";
import { Card, CardContent } from "../../../components/atoms/Card";
import {
  CheckCircle2,
  RotateCcw,
  Package,
  MapPin,
  ArrowRight,
} from "lucide-react";

interface ConfirmationFormProps {
  sku: string;
  title: string;
  quantity: number;
  maxQuantity: number;
  location: {
    rack: string;
    shelf: string;
    bin: string;
  };
  onQuantityChange: (qty: number | "") => void;
  onRescan: () => void;
  onConfirm: () => void;
  className?: string;
}

export const ConfirmationForm = memo(function ConfirmationForm({
  sku,
  title,
  quantity,
  maxQuantity,
  location,
  onQuantityChange,
  onRescan,
  onConfirm,
  className,
}: ConfirmationFormProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Product Info Card */}
      <Card variant="outlined" className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-brand-400/10 rounded-lg">
            <Package className="w-5 h-5 text-brand-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-sm">{sku}</h4>
            <p className="text-xs text-neutral-500 truncate">{title}</p>
          </div>
          <Badge variant="primary" size="sm">
            {maxQuantity} units max
          </Badge>
        </div>
      </Card>

      {/* Location Info */}
      <div className="flex items-center gap-2 p-3 bg-brand-400/10 border border-brand-200 rounded-xl">
        <MapPin className="w-4 h-4 text-brand-300 flex-shrink-0" />
        <div className="flex items-center gap-1.5 text-sm">
          <span className="px-2 py-0.5 bg-brand-400/100 text-white text-xs font-semibold rounded">
            Rack {location.rack}
          </span>
          <ArrowRight className="w-3 h-3 text-brand-400" />
          <span className="px-2 py-0.5 bg-brand-400 text-white text-xs font-semibold rounded">
            {location.shelf}
          </span>
          <ArrowRight className="w-3 h-3 text-brand-400" />
          <span className="px-2 py-0.5 bg-brand-300 text-white text-xs font-semibold rounded">
            {location.bin}
          </span>
        </div>
      </div>

      {/* Quantity Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-200">
          Quantity to Put Away
        </label>
        <div className="flex gap-3">
          <Input
            type="number"
            value={quantity}
            onChange={(e) =>
              onQuantityChange(e.target.value ? Number(e.target.value) : "")
            }
            min={1}
            max={maxQuantity}
            className="flex-1"
            rightElement={
              <span className="text-xs text-neutral-400">units</span>
            }
          />
          <Button
            variant="outline"
            size="md"
            onClick={() => onQuantityChange(maxQuantity)}
            className="flex-shrink-0"
          >
            Max
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          Available: <span className="font-medium text-neutral-200">{maxQuantity}</span> units
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          size="md"
          onClick={onRescan}
          leftIcon={<RotateCcw className="w-4 h-4" />}
          className="flex-1"
        >
          Rescan
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onConfirm}
          leftIcon={<CheckCircle2 className="w-4 h-4" />}
          className="flex-1 bg-success-600 hover:bg-success-700"
          disabled={!quantity || quantity < 1 || quantity > maxQuantity}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
});
