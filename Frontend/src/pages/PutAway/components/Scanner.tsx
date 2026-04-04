/**
 * Scanner Component
 * Barcode scanning interface with visual feedback
 */

import React, { memo } from "react";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/atoms/Button";
import { ScanLine, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export type ScannerState = "idle" | "scanning" | "success" | "error";

interface ScannerProps {
  state: ScannerState;
  onScan: () => void;
  className?: string;
}

const stateConfig = {
  idle: {
    borderColor: "border-neutral-300",
    bgColor: "bg-white",
    iconColor: "text-neutral-400",
    textColor: "text-neutral-600",
    label: "SCAN BARCODE",
    sublabel: "Click to scan",
  },
  scanning: {
    borderColor: "border-brand-400",
    bgColor: "bg-brand-50",
    iconColor: "text-brand-600",
    textColor: "text-brand-700",
    label: "Scanning...",
    sublabel: "Please wait",
  },
  success: {
    borderColor: "border-success-400",
    bgColor: "bg-success-50",
    iconColor: "text-success-600",
    textColor: "text-success-700",
    label: "Match Found!",
    sublabel: "Barcode verified",
  },
  error: {
    borderColor: "border-danger-400",
    bgColor: "bg-danger-50",
    iconColor: "text-danger-600",
    textColor: "text-danger-700",
    label: "Invalid Barcode",
    sublabel: "Please try again",
  },
};

export const Scanner = memo(function Scanner({
  state,
  onScan,
  className,
}: ScannerProps) {
  const config = stateConfig[state];

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Scanner Area */}
      <button
        onClick={onScan}
        disabled={state === "scanning"}
        className={cn(
          "relative w-full max-w-sm aspect-[2/1] rounded-2xl border-4 border-dashed",
          "flex flex-col items-center justify-center gap-3",
          "transition-all duration-300",
          config.borderColor,
          config.bgColor,
          state === "idle" && "hover:border-brand-400 hover:bg-brand-50/30 cursor-pointer",
          state === "scanning" && "animate-pulse",
          state === "success" && "animate-bounce-subtle"
        )}
      >
        {/* Scanning Animation Overlay */}
        {state === "scanning" && (
          <div className="absolute inset-0 overflow-hidden rounded-xl">
            <div className="absolute inset-x-0 h-1 bg-brand-400/50 animate-[scan_1.5s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Icon */}
        <div className={cn("transition-transform duration-300", config.iconColor)}>
          {state === "scanning" ? (
            <Loader2 className="w-12 h-12 animate-spin" />
          ) : state === "success" ? (
            <CheckCircle2 className="w-12 h-12" />
          ) : state === "error" ? (
            <AlertCircle className="w-12 h-12" />
          ) : (
            <ScanLine className="w-12 h-12" />
          )}
        </div>

        {/* Text */}
        <div className="text-center">
          <p className={cn("font-bold text-lg tracking-tight", config.textColor)}>
            {config.label}
          </p>
          <p className={cn("text-sm mt-0.5", config.textColor, "opacity-70")}>
            {config.sublabel}
          </p>
        </div>
      </button>

      {/* Manual Entry Option */}
      {state === "idle" && (
        <Button variant="ghost" size="sm" className="text-neutral-500">
          Enter manually
        </Button>
      )}
    </div>
  );
});
