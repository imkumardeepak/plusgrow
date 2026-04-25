/**
 * TaskCard Component
 * Compact card for displaying inward items/tasks
 */

import React, { memo } from "react";
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/atoms/Badge";
import { Box, CheckCircle2, Clock } from "lucide-react";

export interface Task {
  sku: string;
  title: string;
  total: number;
  unassigned: number;
  putAway: number;
  progress: number;
  status: "Pending" | "Active" | "Complete";
}

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
  viewMode?: "compact" | "detailed";
}

const statusConfig = {
  Pending: {
    variant: "warning" as const,
    icon: Clock,
    bgColor: "bg-warning-400/10",
    borderColor: "border-warning-200",
    textColor: "text-warning-400",
  },
  Active: {
    variant: "primary" as const,
    icon: Box,
    bgColor: "bg-brand-400/10",
    borderColor: "border-brand-200",
    textColor: "text-brand-400",
  },
  Complete: {
    variant: "success" as const,
    icon: CheckCircle2,
    bgColor: "bg-success-400/10",
    borderColor: "border-success-200",
    textColor: "text-success-400",
  },
};

export const TaskCard = memo(function TaskCard({
  task,
  isSelected,
  onClick,
  viewMode = "compact",
}: TaskCardProps) {
  const config = statusConfig[task.status];
  const StatusIcon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-xl border-2 transition-all duration-200",
        "hover:shadow-float hover:-translate-y-0.5",
        isSelected
          ? "border-brand-500 bg-brand-50/50 shadow-float ring-1 ring-brand-500/20"
          : "border-white/10 bg-white/[0.04] hover:border-brand-300",
        viewMode === "compact" ? "p-3" : "p-4"
      )}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-400/100 rounded-r-full" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 rounded-lg flex items-center justify-center",
            config.bgColor,
            viewMode === "compact" ? "w-9 h-9" : "w-10 h-10"
          )}
        >
          <StatusIcon
            className={cn(
              config.textColor,
              viewMode === "compact" ? "w-4 h-4" : "w-5 h-5"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white text-sm truncate">
              {task.sku}
            </span>
            <Badge variant={config.variant} size="sm" className="flex-shrink-0">
              {task.status}
            </Badge>
          </div>

          <p className="text-xs text-neutral-500 truncate mb-2">{task.title}</p>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  task.progress === 100 ? "bg-success-400/100" : "bg-brand-400/100"
                )}
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-neutral-300 w-8 text-right">
              {task.progress}%
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-neutral-400">
              Total: <span className="font-medium text-neutral-300">{task.total}</span>
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-success-300">
              Done: <span className="font-medium">{task.putAway}</span>
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-brand-300">
              Left: <span className="font-medium">{task.unassigned}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
