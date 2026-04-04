/**
 * PutAway Page - Redesigned Pro Max Edition
 * Highly polished, spacious layout optimized for fast put-away execution
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useWms } from "../../context/WmsContext";
import { cn } from "../../lib/utils";

// Components
import { Input } from "../../components/atoms/Input";
import { Badge } from "../../components/atoms/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/atoms/Card";

// PutAway specific components
import {
  TaskCard,
  Stepper,
  Scanner,
  WarehouseMap,
  ConfirmationForm,
  Task,
  ScannerState,
} from "./components";

// Icons
import {
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  Package,
  ArrowDownToLine,
  Filter,
  ArrowRight
} from "lucide-react";

import { toast } from "sonner";
import confetti from "canvas-confetti";

// Constants
const RACKS = ["A", "B", "C"];
const SHELVES = ["S1", "S2", "S3", "S4"];
const BINS = ["B1", "B2", "B3", "B4", "B5"];
const MAX_BIN_CAPACITY = 100;

export const PutAway = () => {
  const { stock, products, assignBin } = useWms();

  // State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [activeRack, setActiveRack] = useState(RACKS[0]);
  const [activeShelf, setActiveShelf] = useState(SHELVES[0]);
  const [selectedLocation, setSelectedLocation] = useState<{
    rack: string;
    shelf: string;
    bin: string;
  } | null>(null);
  const [assignQty, setAssignQty] = useState<number | "">("");

  // Calculate tasks from products and stock
  const tasks: Task[] = useMemo(() => {
    return products
      .map((p) => {
        const skuStock = stock.filter((s) => s.sku === p.sku);
        const total = skuStock.reduce((sum, s) => sum + s.quantity, 0);
        const unassigned = skuStock
          .filter((s) => s.rack === "Unassigned")
          .reduce((sum, s) => sum + s.quantity, 0);
        const putAway = total - unassigned;
        const progress = total > 0 ? Math.round((putAway / total) * 100) : 0;

        let status: Task["status"] = "Pending";
        if (progress === 100) status = "Complete";
        else if (progress > 0) status = "Active";

        return {
          sku: p.sku,
          title: p.title,
          total,
          unassigned,
          putAway,
          progress,
          status,
        };
      })
      .filter(
        (t) =>
          t.total > 0 &&
          (t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => {
        // Sort: Pending first, then Active, then Complete
        const statusOrder = { Pending: 0, Active: 1, Complete: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
  }, [products, stock, searchQuery]);

  // Get active task
  const activeTask = useMemo(
    () => tasks.find((t) => t.sku === selectedSku),
    [tasks, selectedSku]
  );

  // Calculate current step
  const currentStep = useMemo(() => {
    if (!selectedSku) return 1;
    if (scannerState !== "success") return 2;
    if (!selectedLocation) return 3;
    return 4;
  }, [selectedSku, scannerState, selectedLocation]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const total = tasks.reduce((sum, t) => sum + t.total, 0);
    const putAway = tasks.reduce((sum, t) => sum + t.putAway, 0);
    return total > 0 ? Math.round((putAway / total) * 100) : 0;
  }, [tasks]);

  // Initialize assignQty when task changes
  useEffect(() => {
    if (activeTask && assignQty === "") {
      setAssignQty(activeTask.unassigned);
    }
  }, [activeTask, assignQty]);

  // Handlers
  const handleSelectTask = useCallback((sku: string) => {
    setSelectedSku(sku);
    setScannerState("idle");
    setSelectedLocation(null);
    setAssignQty("");
  }, []);

  const handleScan = useCallback(() => {
    setScannerState("scanning");
    setTimeout(() => {
      // Simulate scan logic
      if (Math.random() > 0.1) {
        setScannerState("success");
        toast.success("Barcode verified and matched!");
      } else {
        setScannerState("error");
        toast.error("Unrecognized barcode. Please scan again.");
        setTimeout(() => setScannerState("idle"), 2000);
      }
    }, 1500);
  }, []);

  const handleSelectBin = useCallback(
    (rack: string, shelf: string, bin: string) => {
      setActiveRack(rack);
      setActiveShelf(shelf);
      setSelectedLocation({ rack, shelf, bin });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (!selectedLocation || !activeTask) return;
    const qty = Number(assignQty);
    if (qty <= 0 || qty > activeTask.unassigned) {
      toast.error("Invalid quantity");
      return;
    }

    assignBin(
      activeTask.sku,
      selectedLocation.rack,
      selectedLocation.shelf,
      selectedLocation.bin,
      qty
    );

    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#10b981", "#4E8EA2", "#0A4174"]
    });

    toast.success(`Allocated ${qty} units of ${activeTask.sku}`);

    setScannerState("idle");
    setSelectedLocation(null);
    if (qty === activeTask.unassigned) {
      setSelectedSku("");
      setAssignQty("");
    } else {
      setAssignQty(activeTask.unassigned - qty);
    }
  }, [selectedLocation, activeTask, assignQty, assignBin]);

  const handleRescan = useCallback(() => {
    setScannerState("idle");
    setSelectedLocation(null);
    setAssignQty(activeTask?.unassigned ?? "");
  }, [activeTask]);

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-success-50 rounded-full flex items-center justify-center mb-6 shadow-sm ring-1 ring-success-100">
          <CheckCircle2 className="w-12 h-12 text-success-500" />
        </div>
        <h3 className="text-2xl font-heading font-bold text-neutral-900 mb-2">
          All Caught Up!
        </h3>
        <p className="text-neutral-500 max-w-sm text-sm">
          No items are pending put-away. All inward inventory has been properly allocated to warehouse bins.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Pro Max Edition */}
      <Card variant="glass" className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Progress */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Pipeline Progress
              </span>
              <Badge variant="success" size="sm" className="font-mono bg-success-50 text-success-600 border border-success-200">
                {overallProgress}%
              </Badge>
            </div>
            <div className="h-2 bg-neutral-100/80 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-success-400 to-success-500 rounded-full transition-all duration-700"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Search & View Toggle */}
          <div className="flex items-center gap-3 flex-shrink-0 border-l border-neutral-200/50 pl-4">
            <div className="flex bg-neutral-100/50 p-1 rounded-lg border border-neutral-200/50">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-md transition-all duration-200",
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-brand-600 ring-1 ring-black/5"
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-md transition-all duration-200",
                  viewMode === "list"
                    ? "bg-white shadow-sm text-brand-600 ring-1 ring-black/5"
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search inward items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-neutral-50/50 focus:bg-white transition-colors border-neutral-200"
              />
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content - Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* ================= LEFT PANEL: TASK DIRECTORY ================= */}
        <Card variant="elevated" className="lg:col-span-4 flex flex-col overflow-hidden shadow-sm h-full">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-brand-500" />
                Pending Items
              </CardTitle>
              <Badge variant="primary" size="sm" className="bg-brand-100 text-brand-700">
                {tasks.length}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin bg-neutral-50/30">
            {tasks.map((task) => (
              <div key={task.sku} className="animate-in slide-in-from-left-2 duration-300">
                <TaskCard
                  task={task}
                  isSelected={selectedSku === task.sku}
                  onClick={() => handleSelectTask(task.sku)}
                  viewMode={viewMode}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ================= RIGHT PANEL: WORKFLOW CANVAS ================= */}
        <Card variant="elevated" className="lg:col-span-8 flex flex-col overflow-hidden shadow-md z-10 border-neutral-200 ring-1 ring-black/[0.02] h-full">
          <CardHeader className="py-2.5 px-4 border-b border-neutral-100 bg-white z-10">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Package className="w-4 h-4 text-neutral-400" />
                Put-Away Execution
              </CardTitle>
              {activeTask && (
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded-md animate-in fade-in">
                  <span>Step {currentStep} of 4</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col relative bg-neutral-50 overflow-hidden">
            {/* Dotted Workspace Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-30 mix-blend-multiply pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col h-full overflow-y-auto p-6 scrollbar-thin">
              {/* Central Stepper */}
              <div className="mb-8 w-full max-w-2xl mx-auto bg-white/60 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-neutral-100 animate-in fade-in duration-500">
                <Stepper currentStep={currentStep} className="w-full" />
              </div>

              {/* Step 1: Select Task (Empty State) */}
              {!selectedSku && (
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-white shadow-sm ring-1 ring-neutral-200 rounded-full flex items-center justify-center mb-5 relative group">
                    <ArrowDownToLine className="w-10 h-10 text-neutral-300 group-hover:text-brand-400 transition-colors duration-300 relative z-10" />
                    <div className="absolute inset-0 border-[3px] border-neutral-100 border-dashed rounded-full group-hover:border-brand-200 animate-[spin_15s_linear_infinite]" />
                  </div>
                  <h4 className="text-xl font-heading font-bold text-neutral-800 mb-2">
                    Awaiting Selection
                  </h4>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    Choose a pending item from the left directory to initialize the put-away tracking workflow.
                  </p>
                </div>
              )}

              {/* Steps 2-4 Content Wrapper */}
              {selectedSku && activeTask && (
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Floating Context Banner */}
                  <div className="mb-6 bg-white shadow-lg shadow-neutral-200/40 border border-neutral-200/60 rounded-xl p-4 flex items-center gap-4 sticky top-0 z-20">
                    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center ring-1 ring-brand-100">
                      <Package className="w-6 h-6 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-base font-bold text-neutral-900 tracking-tight">
                        {activeTask.sku}
                      </p>
                      <p className="text-sm text-neutral-500 truncate">
                        {activeTask.title}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-neutral-50 pl-4 py-2 pr-5 rounded-lg border border-neutral-100">
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-0.5">
                          Requires Assignment
                        </p>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-2xl font-bold text-brand-600 leading-none">
                            {activeTask.unassigned}
                          </span>
                          <span className="text-xs text-neutral-500 font-medium">units</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Step Content */}
                  <div className="flex-1 pb-10">
                    {/* Step 2: Scan Barcode */}
                    {currentStep === 2 && (
                      <div className="w-full max-w-md mx-auto mt-4 animate-in zoom-in-95 duration-300">
                        <Scanner state={scannerState} onScan={handleScan} />
                      </div>
                    )}

                    {/* Step 3: Select Warehouse Location */}
                    {currentStep === 3 && (
                      <div className="w-full animate-in fade-in duration-300">
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200/60 p-1">
                          <WarehouseMap
                            racks={RACKS}
                            shelves={SHELVES}
                            bins={BINS}
                            stock={stock.map((s) => ({
                              rack: s.rack,
                              shelf: s.shelf,
                              bin: s.bin,
                              quantity: s.quantity,
                            }))}
                            selectedLocation={selectedLocation}
                            activeRack={activeRack}
                            activeShelf={activeShelf}
                            maxCapacity={MAX_BIN_CAPACITY}
                            onSelectBin={handleSelectBin}
                            onSetActiveRack={setActiveRack}
                            onSetActiveShelf={setActiveShelf}
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 4: Final Confirmation */}
                    {currentStep === 4 && selectedLocation && (
                      <div className="w-full max-w-md mx-auto mt-4 animate-in slide-in-from-right-4 duration-300">
                        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-200 overflow-hidden">
                           {/* Journey summary header */}
                           <div className="bg-neutral-50 border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
                              <span className="text-sm font-semibold text-neutral-600">Review Assignment</span>
                              <Badge variant="primary" className="bg-brand-100 text-brand-700 pointer-events-none">Final Step</Badge>
                           </div>
                           <div className="p-6">
                              <ConfirmationForm
                                sku={activeTask.sku}
                                title={activeTask.title}
                                quantity={assignQty}
                                maxQuantity={activeTask.unassigned}
                                location={selectedLocation}
                                onQuantityChange={setAssignQty}
                                onRescan={handleRescan}
                                onConfirm={handleConfirm}
                              />
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PutAway;
