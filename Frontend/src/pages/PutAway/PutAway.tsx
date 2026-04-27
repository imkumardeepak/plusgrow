import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Package,
  ScanLine,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../../components/atoms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { DataTable, createTableColumns } from '../../components/molecules/DataTable';
import {
  ProductAllottedLocationRecord,
  ProductQuantityRecord,
  PutAwayScanAssignmentResult,
  productAllottedLocationsApi,
  productQuantitiesApi,
} from '../../services/masterApi';

type PutAwayTask = {
  productId: number;
  skuCode: string;
  productName: string;
  currentQuantity: number;
  allocatedQuantity: number;
  remainingQuantity: number;
  updatedAt: string;
};

const emptyResult: PutAwayScanAssignmentResult | null = null;

export const PutAway = () => {
  const [productQuantities, setProductQuantities] = useState<ProductQuantityRecord[]>([]);
  const [allocations, setAllocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [productScanCode, setProductScanCode] = useState('');
  const [locationScanCode, setLocationScanCode] = useState('');
  const [assignQuantity, setAssignQuantity] = useState<number | ''>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [lastAssignment, setLastAssignment] = useState<PutAwayScanAssignmentResult | null>(emptyResult);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [quantitiesData, allocationsData] = await Promise.all([
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);

      setProductQuantities(quantitiesData);
      setAllocations(allocationsData);
    } catch (error) {
      toast.error('Failed to load put-away data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allTasks = useMemo<PutAwayTask[]>(() => {
    return productQuantities
      .map((quantityRow) => {
        const allocationRow = allocations.find((entry) => entry.productId === quantityRow.productId);
        const allocatedQuantity = Object.values((allocationRow?.locationJson || {}) as Record<string, number>)
          .reduce((sum, qty) => sum + Number(qty), 0);
        const remainingQuantity = Math.max(quantityRow.currentQuantity - allocatedQuantity, 0);

        return {
          productId: quantityRow.productId,
          skuCode: quantityRow.skuCode,
          productName: quantityRow.productName,
          currentQuantity: quantityRow.currentQuantity,
          allocatedQuantity,
          remainingQuantity,
          updatedAt: quantityRow.updatedAt,
        };
      })
      .sort((a, b) => b.remainingQuantity - a.remainingQuantity);
  }, [allocations, productQuantities]);

  const tasks = useMemo<PutAwayTask[]>(() => {
    return allTasks
      .filter((task) => task.remainingQuantity > 0)
      .filter((task) => {
        const query = searchQuery.toLowerCase();
        return (
          task.skuCode.toLowerCase().includes(query) ||
          task.productName.toLowerCase().includes(query)
        );
      });
  }, [allTasks, searchQuery]);

  const selectedTask = useMemo(() => {
    if (!productScanCode.trim()) return null;
    const scan = productScanCode.trim().toLowerCase();
    return allTasks.find(
      (task) =>
        task.skuCode.toLowerCase() === scan ||
        task.productName.toLowerCase() === scan
    ) ?? null;
  }, [allTasks, productScanCode]);

  useEffect(() => {
    if (selectedTask && assignQuantity === '') {
      setAssignQuantity(selectedTask.remainingQuantity > 0 ? selectedTask.remainingQuantity : '');
    }
  }, [assignQuantity, selectedTask]);

  const handleChooseTask = (task: PutAwayTask) => {
    setProductScanCode(task.skuCode);
    setAssignQuantity(task.remainingQuantity > 0 ? task.remainingQuantity : '');
    setLastAssignment(null);
  };

  const handleAssign = async () => {
    const quantity = Number(assignQuantity);

    if (!productScanCode.trim()) {
      toast.error('Scan or enter product code first');
      return;
    }

    if (!locationScanCode.trim()) {
      toast.error('Scan location or bin first');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter valid quantity');
      return;
    }

    if (!selectedTask) {
      toast.error('Scanned product was not found');
      return;
    }

    if (selectedTask.remainingQuantity <= 0) {
      toast.error('This product has no pending quantity left for put away');
      return;
    }

    if (quantity > selectedTask.remainingQuantity) {
      toast.error(`Only ${selectedTask.remainingQuantity} units are pending for put away`);
      return;
    }

    setIsAssigning(true);
    try {
      const result = await productAllottedLocationsApi.assignScan({
        productScanCode: productScanCode.trim(),
        locationOrBinScanCode: locationScanCode.trim(),
        quantity,
      });

      setLastAssignment(result);
      toast.success(`Stored ${result.assignedQuantity} units in ${result.resolvedLocationCode}`);
      await loadData();
      setLocationScanCode('');
      setAssignQuantity(result.remainingUnassignedQuantity > 0 ? result.remainingUnassignedQuantity : '');
      if (result.remainingUnassignedQuantity <= 0) {
        setProductScanCode('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save put-away assignment');
    } finally {
      setIsAssigning(false);
    }
  };

  const allocationColumns = createTableColumns<ProductAllottedLocationRecord>([
    {
      accessorKey: 'skuCode',
      header: 'SKU Code',
      cell: (row) => (
        <span className="inline-flex rounded-lg border border-brand-500/20 bg-brand-500/10 px-2 py-1 font-mono text-xs text-brand-400">
          {row.skuCode}
        </span>
      ),
    },
    {
      accessorKey: 'productName',
      header: 'Product Name',
      cell: (row) => <span className="font-semibold text-white">{row.productName}</span>,
    },
    {
      accessorKey: 'locationJson',
      header: 'Stored Locations',
      cell: (row) => (
        <div className="flex max-w-md flex-wrap gap-2">
          {Object.entries(row.locationJson || {}).length > 0 ? (
            Object.entries(row.locationJson).map(([key, value]) => (
              <span key={key} className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-200">
                {key}: {value}
              </span>
            ))
          ) : (
            <span className="text-xs text-neutral-500">No locations mapped</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: (row) => <span className="text-xs text-neutral-400">{format(new Date(row.updatedAt), 'dd-MMM-yy hh:mm a')}</span>,
    },
  ]);

  const totalCurrent = tasks.reduce((sum, task) => sum + task.currentQuantity, 0);
  const totalAllocated = tasks.reduce((sum, task) => sum + task.allocatedQuantity, 0);
  const totalRemaining = tasks.reduce((sum, task) => sum + task.remainingQuantity, 0);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <Card variant="glass" className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="page-icon-chip">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="page-title">Put Away Scanner</h1>
              <p className="page-subtitle">Scan one product, confirm the pending quantity to store, then scan a location or bin to save it against the parent location.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Actual Qty</p>
              <p className="mt-2 text-2xl font-black text-white">{totalCurrent}</p>
            </div>
            <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-brand-300/70">Allocated</p>
              <p className="mt-2 text-2xl font-black text-brand-300">{totalAllocated}</p>
            </div>
            <div className="rounded-2xl border border-warning-500/20 bg-warning-500/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-warning-300/70">Pending Put Away</p>
              <p className="mt-2 text-2xl font-black text-warning-400">{totalRemaining}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="border-b border-white/10 bg-white/[0.02]">
            <CardTitle size="sm" className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-brand-400" />
              Scan Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-300">
              <p className="font-semibold text-white">Put-away flow</p>
              <p className="mt-2">
                1. Scan product SKU. 2. Check pending quantity. 3. Enter the quantity you want to store. 4. Scan location or bin. 5. Save put away.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="field-label">Scan Product</label>
                <Input
                  placeholder="Scan SKU or product code"
                  value={productScanCode}
                  onChange={(e) => setProductScanCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="field-label">Scan Location or Bin</label>
                <Input
                  placeholder="Scan location code or bin code"
                  value={locationScanCode}
                  onChange={(e) => setLocationScanCode(e.target.value)}
                />
              </div>
            </div>

              <div className="space-y-2">
                <label className="field-label">Quantity To Put Away</label>
                <Input
                  type="number"
                  min="1"
                  placeholder={selectedTask ? `Pending qty: ${selectedTask.remainingQuantity}` : 'Enter quantity'}
                  value={assignQuantity}
                  onChange={(e) => setAssignQuantity(e.target.value ? Number(e.target.value) : '')}
                />
              </div>

            {selectedTask ? (
              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-bold text-brand-300">{selectedTask.skuCode}</p>
                    <p className="mt-1 text-sm text-white">{selectedTask.productName}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Actual</p>
                      <p className="mt-1 text-lg font-bold text-white">{selectedTask.currentQuantity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Allocated</p>
                      <p className="mt-1 text-lg font-bold text-brand-300">{selectedTask.allocatedQuantity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Pending</p>
                      <p className="mt-1 text-lg font-bold text-warning-400">{selectedTask.remainingQuantity}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-neutral-400">
                Scan a product code to load actual quantity, already allotted quantity, and the pending balance still left to store.
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setProductScanCode('');
                  setLocationScanCode('');
                  setAssignQuantity('');
                  setLastAssignment(null);
                }}
              >
                Reset Scan
              </Button>
              <Button
                className="flex-1 bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
                onClick={handleAssign}
                disabled={isAssigning}
                leftIcon={isAssigning ? <Package className="h-4 w-4 animate-pulse" /> : <ArrowRight className="h-4 w-4" />}
              >
                {isAssigning ? 'Saving...' : 'Confirm Put Away'}
              </Button>
            </div>

            {lastAssignment && (
              <div className="rounded-2xl border border-success-500/20 bg-success-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-success-400" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-white">Put-away stored successfully</p>
                    <p className="text-neutral-300">
                      Product <span className="font-mono text-brand-300">{lastAssignment.skuCode}</span> stored in location{' '}
                      <span className="font-semibold text-success-400">{lastAssignment.resolvedLocationCode}</span>.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-200">
                        Assigned: {lastAssignment.assignedQuantity}
                      </span>
                      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-200">
                        Current Qty: {lastAssignment.currentQuantity}
                      </span>
                      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-200">
                        Remaining: {lastAssignment.remainingUnassignedQuantity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-400" />
                Pending Put Away
              </CardTitle>
              <div className="w-64">
                <Input
                  placeholder="Search SKU or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <div className="max-h-[320px] space-y-2 overflow-y-auto scrollbar-thin">
              {tasks.map((task) => (
                <button
                  key={task.productId}
                  onClick={() => handleChooseTask(task)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-brand-500/30 hover:bg-brand-500/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm font-bold text-brand-300">{task.skuCode}</p>
                      <p className="mt-1 text-sm text-white">{task.productName}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${task.remainingQuantity > 0 ? 'border border-warning-500/20 bg-warning-500/10 text-warning-400' : 'border border-success-500/20 bg-success-500/10 text-success-400'}`}>
                      {task.remainingQuantity > 0 ? 'Pending' : 'Complete'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="uppercase tracking-[0.2em] text-neutral-500">Actual</p>
                      <p className="mt-1 font-bold text-white">{task.currentQuantity}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.2em] text-neutral-500">Allocated</p>
                      <p className="mt-1 font-bold text-brand-300">{task.allocatedQuantity}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.2em] text-neutral-500">Pending</p>
                      <p className="mt-1 font-bold text-warning-400">{task.remainingQuantity}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-400" />
                <p className="text-sm font-semibold text-white">Stored Location Ledger</p>
              </div>
              <DataTable
                columns={allocationColumns}
                data={allocations}
                loading={isLoading}
                searchPlaceholder="Search stored locations..."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PutAway;
