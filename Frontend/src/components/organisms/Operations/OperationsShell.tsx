import React from 'react';
import { LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../../atoms/Card';
import { cn } from '../../../lib/utils';

type Tone = 'default' | 'brand' | 'warning' | 'success';

const toneClasses: Record<Tone, string> = {
  default: 'border-white/10 bg-white/[0.04]',
  brand: 'border-brand-500/20 bg-brand-500/10',
  warning: 'border-warning-500/20 bg-warning-500/10',
  success: 'border-success-500/20 bg-success-500/10',
};

const valueToneClasses: Record<Tone, string> = {
  default: 'text-white',
  brand: 'text-brand-300',
  warning: 'text-warning-400',
  success: 'text-success-400',
};

export interface OperationsMetric {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}

interface OperationsPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  metrics?: OperationsMetric[];
  children: React.ReactNode;
}

export function OperationsPage({
  title,
  description,
  icon: Icon,
  actions,
  metrics = [],
  children,
}: OperationsPageProps) {
  const metricGridClassName =
    metrics.length >= 4
      ? 'md:grid-cols-4'
      : metrics.length === 3
        ? 'md:grid-cols-3'
        : metrics.length === 2
          ? 'md:grid-cols-2'
          : 'md:grid-cols-1';

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <Card variant="glass" className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="page-icon-chip">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="page-title">{title}</h1>
              <p className="page-subtitle normal-case tracking-normal text-neutral-400">{description}</p>
            </div>
          </div>

          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {metrics.length > 0 && (
          <div className={cn('mt-4 grid gap-3', metricGridClassName)}>
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className={cn('rounded-2xl border px-4 py-3', toneClasses[metric.tone ?? 'default'])}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{metric.label}</p>
                <p className={cn('mt-2 text-2xl font-black', valueToneClasses[metric.tone ?? 'default'])}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {children}
    </div>
  );
}

interface OperationsPanelProps {
  title: string;
  icon: LucideIcon;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function OperationsPanel({
  title,
  icon: Icon,
  description,
  action,
  children,
  className,
  contentClassName,
}: OperationsPanelProps) {
  return (
    <Card variant="elevated" className={cn('overflow-hidden', className)}>
      <CardHeader
        className="border-b border-white/10 bg-white/[0.02] px-4 py-3"
        divider={false}
        action={action}
      >
        <div>
          <CardTitle size="sm" className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-brand-400" />
            {title}
          </CardTitle>
          {description ? <p className="mt-1 text-xs text-neutral-400">{description}</p> : null}
        </div>
      </CardHeader>
      <CardContent className={cn('p-4', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

interface OperationsEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function OperationsEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: OperationsEmptyStateProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <Icon className="h-6 w-6 text-brand-400" />
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-neutral-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
