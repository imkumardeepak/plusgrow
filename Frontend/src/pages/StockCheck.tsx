import React, { useState, useRef, useEffect, memo } from "react";
import { useWms } from "../context/WmsContext";
import { Button } from "../components/atoms/Button";
import { Badge } from "../components/atoms/Badge";
import { Input } from "../components/atoms/Input";
import {
  ScanLine,
  AlertTriangle,
  CheckCircle2,
  Box,
  Info,
  Navigation,
  Search,
  ClipboardCheck,
  LayoutGrid,
} from "lucide-react";
import { cn } from "../lib/utils";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import {
  OperationsPage,
  OperationsPanel,
  OperationsEmptyState,
} from "../components/organisms/Operations/OperationsShell";

export const StockCheck = memo(function StockCheck() {
  const { stock, products } = useWms();
  const [scanInput, setScanInput] = useState("");
  const [physicalQty, setPhysicalQty] = useState<number | "">("");
  const [checkResult, setCheckResult] = useState<{
    sku: string;
    title: string;
    systemQty: number;
    physicalQty: number;
    difference: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput || physicalQty === "") return;

    const sysQty = stock
      .filter((s) => s.sku.toUpperCase() === scanInput.toUpperCase())
      .reduce((acc, s) => acc + s.quantity, 0);
    const product = products.find(
      (p) => p.sku.toUpperCase() === scanInput.toUpperCase(),
    );
    const physQty = Number(physicalQty);
    const difference = physQty - sysQty;

    setCheckResult({
      sku: scanInput.toUpperCase(),
      title: product ? product.title : "Unknown Product",
      systemQty: sysQty,
      physicalQty: physQty,
      difference: difference,
    });

    if (difference === 0) {
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#4E8EA2", "#0A4174"],
      });
    }

    setScanInput("");
    setPhysicalQty("");

    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <OperationsPage
      title="Stock Reconciliation"
      description="Verify physical inventory counts against system records."
      icon={ClipboardCheck}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[10px] px-3 font-bold uppercase tracking-wider"
          onClick={() => navigate("/stock-movement")}
        >
          <Navigation className="w-3.5 h-3.5 mr-1.5" /> Movement
        </Button>
      }
      metrics={[
        { label: "SKUs Checked", value: checkResult ? 1 : 0, tone: "brand" },
      ]}
    >
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        <OperationsPanel
          title="Perform Audit"
          icon={ScanLine}
          className="lg:col-span-4 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin space-y-4"
        >
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">
                SKU Identification
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-brand-500" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan Barcode..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  required
                  className="block w-full h-11 pl-10 pr-4 rounded-lg border border-brand-500/20 bg-white/[0.04] focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none font-mono text-base uppercase text-white shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">
                Shelf Count
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LayoutGrid className="h-4 w-4 text-neutral-500" />
                </div>
                <input
                  type="number"
                  placeholder="0"
                  value={physicalQty}
                  onChange={(e) =>
                    setPhysicalQty(e.target.value ? Number(e.target.value) : "")
                  }
                  required
                  min={0}
                  className="block w-full h-11 pl-10 pr-4 rounded-lg border border-white/10 bg-white/[0.04] focus:border-neutral-500/50 focus:ring-4 focus:ring-white/5 transition-all outline-none text-xl font-bold font-mono shadow-inner"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 text-xs font-bold uppercase tracking-widest shadow-neon-cyan/10"
            >
              Verify Count
            </Button>
          </form>

          <div className="flex items-start gap-2.5 bg-brand-500/5 p-3 rounded-lg border border-brand-500/10">
            <div className="w-6 h-6 rounded-md bg-brand-500/20 flex items-center justify-center shrink-0 border border-brand-500/20">
              <Info className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
              Scan SKU, enter the physical count, and press{" "}
              <kbd className="font-mono text-[9px] bg-white/10 border border-white/20 px-1 py-0.5 rounded text-white">
                ENTER
              </kbd>{" "}
              for instant reconciliation.
            </p>
          </div>
        </OperationsPanel>

        <OperationsPanel
          title="Audit Report Canvas"
          icon={Box}
          className="lg:col-span-8 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
              {!checkResult ? (
                <OperationsEmptyState
                  icon={ClipboardCheck}
                  title="Awaiting Data"
                  description="Reconciliation reports will manifest here after verification."
                />
              ) : (
                <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pt-4">
                  {/* Result Header Context */}
                  <div
                    className={cn(
                      "mb-4 shadow-lg rounded-xl p-3.5 flex items-center gap-3 border transition-all",
                      checkResult.difference === 0
                        ? "bg-success-500/10 border-success-500/20 shadow-success-500/5"
                        : "bg-danger-500/10 border-danger-500/20 shadow-danger-500/5",
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border bg-white/5",
                        checkResult.difference === 0
                          ? "border-success-500/20"
                          : "border-danger-500/20",
                      )}
                    >
                      {checkResult.difference === 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-success-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-danger-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2
                        className={cn(
                          "text-base font-black tracking-tight",
                          checkResult.difference === 0
                            ? "text-success-400"
                            : "text-danger-400",
                        )}
                      >
                        {checkResult.difference === 0
                          ? "Perfect Match"
                          : "Discrepancy Found"}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="default"
                          className="font-mono text-[10px] h-4.5 px-1.5 bg-white/10"
                        >
                          {checkResult.sku}
                        </Badge>
                        <p className="text-[11px] font-bold text-neutral-400 truncate uppercase tracking-wider">
                          {checkResult.title}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quantitative Data Panel */}
                  <div className="bg-white/[0.04] rounded-xl shadow-inner border border-white/10 overflow-hidden mb-4">
                    <div className="grid grid-cols-3 divide-x divide-white/5">
                      <div className="p-4 text-center">
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                          System
                        </p>
                        <p className="text-2xl font-mono font-bold text-white leading-none">
                          {checkResult.systemQty}
                        </p>
                      </div>
                      <div className="p-4 text-center">
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                          Physical
                        </p>
                        <p className="text-2xl font-mono font-bold text-white leading-none">
                          {checkResult.physicalQty}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "p-4 text-center relative overflow-hidden bg-white/5",
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-0 inset-x-0 h-0.5",
                            checkResult.difference === 0
                              ? "bg-success-500"
                              : "bg-danger-500",
                          )}
                        ></div>
                        <p
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest mb-1",
                            checkResult.difference === 0
                              ? "text-success-400"
                              : "text-danger-400",
                          )}
                        >
                          Variance
                        </p>
                        <p
                          className={cn(
                            "text-3xl font-mono font-black leading-none",
                            checkResult.difference === 0
                              ? "text-success-400"
                              : "text-danger-400",
                          )}
                        >
                          {checkResult.difference > 0 ? "+" : ""}
                          {checkResult.difference}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Remediation Panel if variance exists */}
                  {checkResult.difference !== 0 && (
                    <div className="bg-danger-500/5 rounded-xl border border-danger-500/20 p-4 flex items-center gap-4 shadow-card">
                      <div className="w-9 h-9 bg-danger-500/10 rounded-full flex items-center justify-center shrink-0 border border-danger-500/20">
                        <AlertTriangle className="w-5 h-5 text-danger-500 shadow-neon-danger" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-black text-danger-400 uppercase tracking-wider mb-0.5">
                          Adjustment Required
                        </h4>
                        <p className="text-[10px] text-danger-300 font-medium leading-relaxed">
                          A variance of{" "}
                          <span className="font-mono font-bold text-white underline decoration-danger-500/50">
                            {Math.abs(checkResult.difference)} units
                          </span>{" "}
                          was detected. Sync required.
                        </p>
                      </div>
                      <Button
                        onClick={() => navigate("/stock-movement")}
                        size="sm"
                        className="h-8 text-[10px] font-black bg-danger-600 hover:bg-danger-700 text-white shadow-neon-danger/20"
                      >
                        RECONCILE
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

export default StockCheck;
