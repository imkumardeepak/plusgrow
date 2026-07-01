import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Badge as MantineBadge,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ScanLine,
  Search,
  Send,
  Truck,
  X,
} from "lucide-react";

import { Button } from "../components/atoms/Button";
import { OperationsPage } from "../components/organisms/Operations/OperationsShell";
import { OutboundStageNav } from "../components/organisms/Operations/OutboundTaskUI";
import { OutwardOrder, outwardOrdersApi } from "../services/masterApi";
import { toast } from "../lib/toast";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type DispatchOrderGroup = {
  salesOrderId: number;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  items: OutwardOrder[];
  totalQuantity: number;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const isCanceledOrder = (o: OutwardOrder) =>
  o.status === "Canceled" || o.salesOrderStatus === "Canceled";

const isReadyForDispatch = (o: OutwardOrder) => o.status === "Packed";

/* ─── Component ──────────────────────────────────────────────────────────── */

export const Dispatch = memo(function Dispatch() {
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [orders, setOrders] = useState<OutwardOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const trackingRef = useRef<HTMLInputElement>(null);

  /* ── Load ─────────────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await outwardOrdersApi.getAll();
      setOrders(data);
    } catch {
      toast.error("Failed to load dispatch queue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const dispatchQueue = useMemo<DispatchOrderGroup[]>(() => {
    const q = searchQuery.toLowerCase();
    const groups = new Map<number, DispatchOrderGroup>();

    orders
      .filter((o) => !isCanceledOrder(o) && o.status !== "Dispatched")
      .forEach((o) => {
        const id = o.salesOrderId ?? 0;
        const cur = groups.get(id);
        if (cur) {
          cur.items.push(o);
          cur.totalQuantity += o.quantity;
          return;
        }
        groups.set(id, {
          salesOrderId: id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          orderDate: o.orderDate,
          items: [o],
          totalQuantity: o.quantity,
        });
      });

    return Array.from(groups.values()).filter((g) => {
      const matchSearch =
        !q ||
        g.orderNumber.toLowerCase().includes(q) ||
        g.customerName.toLowerCase().includes(q) ||
        g.items.some((i) => i.skuCode.toLowerCase().includes(q));
      return matchSearch && g.items.every(isReadyForDispatch);
    });
  }, [orders, searchQuery]);

  const activeOrders = orders.filter((o) => !isCanceledOrder(o));
  const dispatchedCount = activeOrders.filter((o) => o.status === "Dispatched").length;
  const dispatchProgress =
    activeOrders.length > 0 ? Math.round((dispatchedCount / activeOrders.length) * 100) : 0;

  /* ── Reset tracking on expand change ─────────────────────────────────── */
  useEffect(() => {
    setTrackingNumber("");
    if (expandedOrderId) {
      window.setTimeout(() => trackingRef.current?.focus(), 80);
    }
  }, [expandedOrderId]);

  /* ── Dispatch handler ─────────────────────────────────────────────────── */
  const activeGroup = dispatchQueue.find((g) => g.salesOrderId === expandedOrderId) ?? null;

  const handleDispatch = async () => {
    if (!activeGroup) return;
    try {
      setIsDispatching(true);
      await outwardOrdersApi.dispatchSalesOrder(
        activeGroup.salesOrderId,
        trackingNumber.trim() || undefined,
      );
      toast.success(`Order ${activeGroup.orderNumber} dispatched`);
      setExpandedOrderId(null);
      setTrackingNumber("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch order");
    } finally {
      setIsDispatching(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <OperationsPage title="Dispatch" description="Dispatch packed orders" icon={Send} hideHeader>
      <div className="flex flex-col gap-2">

        <OutboundStageNav active="dispatch" queueCount={dispatchQueue.length} compactLabel="Waiting" />

        {/* Search + refresh */}
        <div className="flex gap-2">
          <TextInput
            className="flex-1"
            placeholder="Search order, customer, SKU…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
            radius="md"
            leftSection={<Search size={14} />}
            rightSection={
              searchQuery ? (
                <ActionIcon size="xs" variant="transparent" onClick={() => setSearchQuery("")}>
                  <X size={14} />
                </ActionIcon>
              ) : null
            }
          />
          <ActionIcon
            variant="light"
            color="gray"
            size="lg"
            radius="md"
            onClick={() => void loadData()}
            loading={isLoading}
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </ActionIcon>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{dispatchQueue.length === 0 ? "No orders waiting" : `${dispatchQueue.length} order(s) ready to dispatch`}</span>
          <span className="font-mono tabular-nums">{dispatchedCount} dispatched · {dispatchProgress}%</span>
        </div>

        {/* ── Dispatch queue table ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/10 bg-[#10151e] overflow-hidden">

          {dispatchQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Truck size={30} className="text-neutral-700 mb-3" />
              <p className="text-sm font-bold text-white">Nothing waiting</p>
              <p className="mt-1 text-xs text-neutral-500">Packed orders appear here when every line is ready.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                <span></span>
                <span>Order / Customer</span>
                <span className="text-right hidden sm:block">Lines</span>
                <span className="text-right">Units</span>
              </div>

              {dispatchQueue.map((group) => {
                const isExpanded = group.salesOrderId === expandedOrderId;

                return (
                  <div key={group.salesOrderId} className="border-b border-white/[0.05] last:border-0">

                    {/* ── Group row ─────────────────────────────────────── */}
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : group.salesOrderId)}
                      className={`w-full grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 ${
                        isExpanded ? "bg-indigo-500/8" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-neutral-500">
                        {isExpanded
                          ? <ChevronDown size={14} className="text-indigo-400" />
                          : <ChevronRight size={14} />}
                      </span>

                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-black text-white">
                          {group.orderNumber}
                        </span>
                        <span className="block text-[11px] text-neutral-400 truncate">
                          {group.customerName === "Direct Outward" || group.orderNumber.startsWith("DO-")
                            ? group.items.map((i) => i.skuCode).join(" | ")
                            : group.customerName}
                          {group.orderDate && (
                            <span className="ml-2 text-neutral-600 hidden sm:inline">
                              {new Date(group.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </span>
                      </span>

                      <span className="hidden sm:block text-xs text-neutral-400 text-right">
                        {group.items.length}
                      </span>

                      <span className="font-mono text-xs font-bold text-indigo-200 text-right tabular-nums">
                        {group.totalQuantity}
                      </span>
                    </button>

                    {/* ── Expanded panel ─────────────────────────────────── */}
                    {isExpanded && (
                      <div className="border-t border-white/10 bg-[#0b0f17] px-3 py-3 space-y-3">

                        {/* Packed items sub-table */}
                        <div className="rounded-lg border border-white/10 overflow-hidden">
                          <div className="bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-white/10">
                            Packed Items ({group.items.length})
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-[10px] text-neutral-500 border-b border-white/[0.06]">
                                <th className="text-left px-3 py-1.5">Product</th>
                                <th className="text-left px-2 py-1.5 hidden sm:table-cell">SKU</th>
                                <th className="text-right px-3 py-1.5">Qty</th>
                                <th className="text-center px-2 py-1.5">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((item) => (
                                <tr key={item.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                                  <td className="px-3 py-2">
                                    <span className="text-white font-medium truncate max-w-[140px] block">{item.productName}</span>
                                    <span className="font-mono text-[10px] text-indigo-300 sm:hidden">{item.skuCode}</span>
                                  </td>
                                  <td className="px-2 py-2 hidden sm:table-cell">
                                    <span className="font-mono text-indigo-300">{item.skuCode}</span>
                                    {item.alias && <span className="ml-1 text-neutral-500">/ {item.alias}</span>}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-black text-white tabular-nums">
                                    {item.quantity}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <span className="inline-flex items-center gap-1 text-green-400 text-[10px] font-bold">
                                      <Check size={11} /> Packed
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary metrics */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Items", value: group.items.length },
                            { label: "Total Qty", value: group.totalQuantity },
                            { label: "Dispatched Today", value: dispatchedCount },
                          ].map((m) => (
                            <div key={m.label} className="rounded-lg border border-white/10 bg-[#10151e] px-3 py-2 text-center">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">{m.label}</div>
                              <div className="font-mono text-sm font-black text-white mt-0.5 tabular-nums">{m.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* AWB / Tracking input + Dispatch button */}
                        <div className="rounded-lg border border-white/10 bg-[#10151e] p-3 space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                            Tracking / AWB Number (optional)
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <ScanLine size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                              <input
                                ref={trackingRef}
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleDispatch(); } }}
                                disabled={isDispatching}
                                placeholder="Scan or enter AWB (optional)…"
                                autoComplete="off"
                                className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-8 pr-3 font-mono text-xs font-bold text-white outline-none placeholder:text-neutral-600 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/30 disabled:opacity-50"
                              />
                            </div>
                            {trackingNumber && (
                              <ActionIcon
                                variant="light"
                                color="gray"
                                size="lg"
                                radius="md"
                                onClick={() => setTrackingNumber("")}
                              >
                                <X size={13} />
                              </ActionIcon>
                            )}
                          </div>

                          <Button
                            fullWidth
                            color="indigo"
                            size="sm"
                            onClick={() => void handleDispatch()}
                            loading={isDispatching}
                            leftIcon={<Send size={14} />}
                          >
                            Confirm & Dispatch {group.orderNumber}
                          </Button>
                        </div>

                        {/* Footer note */}
                        <p className="text-center text-[10px] text-neutral-600">
                          {dispatchedCount} orders dispatched · {dispatchProgress}% complete overall
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </OperationsPage>
  );
});

export default Dispatch;
