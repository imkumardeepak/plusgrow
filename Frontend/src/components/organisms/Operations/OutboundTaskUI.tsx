import React from "react";
import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ClipboardList,
  PackageCheck,
  ScanLine,
  Truck,
} from "lucide-react";

import { Badge } from "../../atoms/Badge";

type Stage = "picking" | "packing" | "dispatch";
type Tone = "brand" | "cyan" | "indigo" | "success" | "warning" | "danger";

const stageLinks: Array<{
  id: Stage;
  label: string;
  href: string;
  icon: typeof ScanLine;
}> = [
  { id: "picking", label: "Pick", href: "/picking", icon: ScanLine },
  { id: "packing", label: "Pack", href: "/packing", icon: PackageCheck },
  { id: "dispatch", label: "Dispatch", href: "/dispatch", icon: Truck },
];

const toneClasses: Record<Tone, string> = {
  brand: "border-brand-500/35 bg-brand-500/10 text-brand-200",
  cyan: "border-cyan-500/35 bg-cyan-500/10 text-cyan-200",
  indigo: "border-indigo-500/35 bg-indigo-500/10 text-indigo-200",
  success: "border-green-500/35 bg-green-500/10 text-green-200",
  warning: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  danger: "border-red-500/35 bg-red-500/10 text-red-200",
};

interface OutboundStageNavProps {
  active: Stage;
  queueCount?: number;
  compactLabel?: string;
  children?: React.ReactNode;
}

export function OutboundStageNav({
  active,
  queueCount,
  compactLabel,
  children,
}: OutboundStageNavProps) {
  return (
    <div className="relative z-20 -mx-1 border-b border-white/10 bg-[#090d14]/95 px-1 pb-0.5 pt-1 backdrop-blur-xl sm:sticky sm:top-0 sm:mb-2 sm:pb-2">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <nav
          aria-label="Outbound workflow"
          className="grid min-w-0 flex-1 grid-cols-3 rounded-xl border border-white/10 bg-white/[0.035] p-0.5 sm:p-1"
        >
          {stageLinks.map(({ id, label, href, icon: Icon }) => (
            <NavLink
              key={id}
              to={href}
              className={({ isActive }) =>
                `flex min-h-9 items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:min-h-10 sm:gap-1.5 sm:px-2 sm:text-xs ${
                  isActive || active === id
                    ? "bg-brand-500 text-slate-950 shadow-lg shadow-brand-500/20"
                    : "text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                }`
              }
            >
              <Icon aria-hidden="true" size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
        {typeof queueCount === "number" ? (
          <div className="hidden shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right sm:block">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              {compactLabel || "Queue"}
            </p>
            <p className="font-mono text-sm font-black tabular-nums text-white">
              {queueCount}
            </p>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

interface OutboundSplitLayoutProps {
  showQueueOnMobile: boolean;
  queue: React.ReactNode;
  workspace: React.ReactNode;
}

export function OutboundSplitLayout({
  showQueueOnMobile,
  queue,
  workspace,
}: OutboundSplitLayoutProps) {
  return (
    <div className="grid h-full min-h-0 gap-2.5 xl:h-auto xl:grid-cols-[minmax(290px,0.72fr)_minmax(0,1.55fr)]">
      <aside
        className={`${showQueueOnMobile ? "block" : "hidden"} h-full min-h-0 xl:block xl:h-auto`}
      >
        {queue}
      </aside>
      <main
        className={`${showQueueOnMobile ? "hidden" : "block"} h-full min-h-0 xl:block xl:h-auto`}
      >
        {workspace}
      </main>
    </div>
  );
}

interface OutboundQueueProps {
  title: string;
  count: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
}

export function OutboundQueue({
  title,
  count,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  children,
}: OutboundQueueProps) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#10151e] shadow-xl shadow-black/15 sm:min-h-[calc(100dvh-9rem)] sm:rounded-2xl xl:h-auto xl:max-h-[calc(100dvh-7rem)] xl:min-h-[560px]">
      <div className="border-b border-white/10 px-2 py-1.5 sm:px-3 sm:py-2.5">
        <div className="mb-1 flex items-center justify-between gap-2 sm:mb-2">
          <div className="flex min-w-0 items-center gap-2">
            <ClipboardList aria-hidden="true" className="text-brand-300" size={17} />
            <h1 className="truncate text-sm font-bold text-white">{title}</h1>
          </div>
          <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[11px] font-bold tabular-nums text-neutral-300">
            {count}
          </span>
        </div>
        <label className="sr-only" htmlFor={`${title.replace(/\s+/g, "-").toLowerCase()}-search`}>
          {searchPlaceholder}
        </label>
        <input
          id={`${title.replace(/\s+/g, "-").toLowerCase()}-search`}
          name="outbound-order-search"
          autoComplete="off"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 text-xs text-white outline-none transition-colors placeholder:text-neutral-600 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400/30 sm:h-10 sm:rounded-xl sm:px-3 sm:text-sm"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 scrollbar-thin sm:p-2">
        {count > 0 ? (
          <div className="space-y-1 sm:space-y-1.5">{children}</div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <ClipboardList aria-hidden="true" className="mb-3 text-neutral-600" size={30} />
            <p className="text-sm font-bold text-white">{emptyTitle}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-neutral-500">
              {emptyDescription}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

interface OutboundQueueRowProps {
  key?: React.Key;
  active?: boolean;
  orderNumber: string;
  customerName: string;
  status: string;
  primaryMetric: React.ReactNode;
  secondaryMetric: React.ReactNode;
  onClick: () => void;
}

export function OutboundQueueRow({
  active = false,
  orderNumber,
  customerName,
  status,
  primaryMetric,
  secondaryMetric,
  onClick,
}: OutboundQueueRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[52px] w-full touch-manipulation items-center gap-2 rounded-lg border px-2 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:min-h-[68px] sm:rounded-xl sm:px-3 sm:py-2 ${
        active
          ? "border-brand-500/45 bg-brand-500/12"
          : "border-transparent bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.055]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-mono text-xs font-black text-white sm:text-sm" translate="no">
            {orderNumber}
          </p>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-400">
            {status}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-neutral-400">{customerName}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-xs font-black tabular-nums text-brand-200 sm:text-sm">
          {primaryMetric}
        </p>
        <p className="text-[10px] text-neutral-500">{secondaryMetric}</p>
      </div>
      <ChevronRight
        aria-hidden="true"
        className={active ? "text-brand-300" : "text-neutral-700 group-hover:text-neutral-400"}
        size={16}
      />
    </button>
  );
}

interface TaskWorkspaceProps {
  backLabel: string;
  onBack: () => void;
  orderNumber: string;
  customerName: string;
  status: string;
  progressLabel: string;
  progressValue: number;
  meta?: React.ReactNode;
  children: React.ReactNode;
  bottomDock?: React.ReactNode;
}

export function TaskWorkspace({
  backLabel,
  onBack,
  orderNumber,
  customerName,
  status,
  progressLabel,
  progressValue,
  meta,
  children,
  bottomDock,
}: TaskWorkspaceProps) {
  const safeProgress = Math.min(Math.max(progressValue, 0), 100);
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#10151e] shadow-xl shadow-black/15 sm:min-h-[calc(100dvh-9rem)] sm:rounded-2xl xl:h-auto xl:max-h-[calc(100dvh-7rem)] xl:min-h-[560px]">
      <header className="border-b border-white/10 bg-[#121923] px-2 py-1.5 sm:px-3 sm:py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:h-10 sm:w-10 sm:rounded-xl xl:hidden"
          >
            <ChevronRight aria-hidden="true" className="rotate-180" size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate font-mono text-sm font-black text-white" translate="no">
                {orderNumber}
              </h1>
              <Badge size="sm" variant="warning" shape="pill" className="shrink-0 border-none">
                {status}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-neutral-400">{customerName}</p>
          </div>
          {meta ? <div className="shrink-0">{meta}</div> : null}
        </div>
        <div className="mt-1.5 sm:mt-2">
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-neutral-500">
            <span>{progressLabel}</span>
            <span className="font-mono tabular-nums text-neutral-300">{safeProgress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-300 transition-[width] duration-300"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>
      </header>
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 scrollbar-thin sm:p-2.5 ${bottomDock ? "pb-28 sm:pb-28" : ""}`}>
        {children}
      </div>
      {bottomDock ? (
        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#0d121a]/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-2.5 sm:pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {bottomDock}
        </div>
      ) : null}
    </section>
  );
}

interface TaskInstructionProps {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: Tone;
  icon?: typeof ScanLine;
  metrics?: Array<{ label: string; value: React.ReactNode; emphasis?: boolean }>;
}

export function TaskInstruction({
  eyebrow,
  title,
  description,
  tone = "brand",
  icon: Icon = ScanLine,
  metrics = [],
}: TaskInstructionProps) {
  return (
    <section className={`rounded-xl border p-2 sm:rounded-2xl sm:p-3 ${toneClasses[tone]}`}>
      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/15 sm:h-10 sm:w-10 sm:rounded-xl">
          <Icon aria-hidden="true" size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-70">{eyebrow}</p>
          <h2 className="mt-0.5 text-sm font-black leading-tight text-white text-pretty sm:text-base">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-4 text-neutral-300 sm:mt-1 sm:text-xs sm:leading-5">{description}</p>
          ) : null}
        </div>
      </div>
      {metrics.length > 0 ? (
        <dl className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 min-[420px]:grid-cols-4 sm:mt-3 sm:rounded-xl">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 bg-[#111721] px-2 py-1.5 sm:px-2.5 sm:py-2">
              <dt className="truncate text-[9px] font-bold uppercase tracking-wide text-neutral-500">
                {metric.label}
              </dt>
              <dd
                className={`mt-0.5 truncate font-mono text-sm font-black tabular-nums ${
                  metric.emphasis ? "text-white" : "text-neutral-300"
                }`}
              >
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

interface CompactItemsProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CompactItems({
  title,
  count,
  children,
  defaultOpen = true,
}: CompactItemsProps) {
  return (
    <details
      open={defaultOpen}
      className="group mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] sm:mt-2 sm:rounded-2xl"
    >
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-bold text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 sm:min-h-11 sm:px-3 sm:py-2 sm:text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <ClipboardList aria-hidden="true" size={16} className="text-neutral-500" />
          {title}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs tabular-nums text-neutral-500">{count}</span>
          <ChevronRight aria-hidden="true" size={15} className="transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <div className="border-t border-white/10 p-1 sm:p-1.5">{children}</div>
    </details>
  );
}

interface CompactItemRowProps {
  key?: React.Key;
  active?: boolean;
  done?: boolean;
  productName: string;
  skuCode: string;
  quantity: React.ReactNode;
  location?: string;
  onClick?: () => void;
}

export function CompactItemRow({
  active = false,
  done = false,
  productName,
  skuCode,
  quantity,
  location,
  onClick,
}: CompactItemRowProps) {
  const Element = onClick ? "button" : "div";
  return (
    <Element
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`flex min-h-[46px] w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left sm:min-h-[52px] sm:gap-2 sm:rounded-xl sm:px-2.5 sm:py-2 ${
        active
          ? "border-brand-500/35 bg-brand-500/10"
          : done
            ? "border-green-500/15 bg-green-500/[0.045]"
            : "border-transparent bg-black/10"
      } ${onClick ? "touch-manipulation transition-colors hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" : ""}`}
    >
      <div
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md sm:h-7 sm:w-7 sm:rounded-lg ${
          done ? "bg-green-500/15 text-green-300" : active ? "bg-brand-500/15 text-brand-200" : "bg-white/[0.05] text-neutral-500"
        }`}
      >
        {done ? <Check aria-hidden="true" size={15} /> : <PackageCheck aria-hidden="true" size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-bold ${done ? "text-neutral-500" : "text-white"}`}>
          {productName}
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-brand-300" translate="no">
          {skuCode}
          {location ? ` · ${location}` : ""}
        </p>
      </div>
      <p className={`shrink-0 font-mono text-xs font-black tabular-nums ${done ? "text-green-300" : "text-white"}`}>
        {quantity}
      </p>
    </Element>
  );
}

interface ScannerDockProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  actionLabel: string;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  tone?: Tone;
  secondaryAction?: React.ReactNode;
}

export function ScannerDock({
  label,
  value,
  onChange,
  onSubmit,
  actionLabel,
  placeholder,
  disabled = false,
  loading = false,
  inputRef,
  tone = "brand",
  secondaryAction,
}: ScannerDockProps) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500" htmlFor={`${label.replace(/\s+/g, "-").toLowerCase()}-scanner`}>
          {label}
        </label>
        {secondaryAction}
      </div>
      <div className="flex gap-1.5 sm:gap-2">
        <div className="relative min-w-0 flex-1">
          <ScanLine aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 sm:left-3" size={16} />
          <input
            ref={inputRef}
            id={`${label.replace(/\s+/g, "-").toLowerCase()}-scanner`}
            name="warehouse-scanner"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
            disabled={disabled}
            placeholder={placeholder}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/25 pl-8 pr-2.5 font-mono text-xs font-bold text-white outline-none transition-colors placeholder:text-neutral-600 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:rounded-xl sm:pl-10 sm:pr-3 sm:text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || loading}
          className={`min-h-10 min-w-[70px] touch-manipulation rounded-lg border px-3 text-[11px] font-black uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:min-w-[88px] sm:rounded-xl sm:px-4 sm:text-xs ${toneClasses[tone]}`}
        >
          {loading ? "Working…" : actionLabel}
        </button>
      </div>
    </div>
  );
}

export function ExceptionNotice({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs leading-5 text-amber-100">
      <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-amber-300" size={15} />
      <span>{message}</span>
    </div>
  );
}
