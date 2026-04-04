/**
 * StatCard Component
 * A statistic display card with trend indicator and icon
 */

import React from "react";
import { Card, CardContent } from "../../atoms/Card";
import { Badge } from "../../atoms/Badge";
import { cn } from "../../../lib/utils";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

export interface StatCardProps {
  /** Card title */
  title: string;
  /** Statistic value */
  value: string | number;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Trend data */
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  /** Card visual variant */
  variant?: "default" | "gradient" | "outlined" | "ghost";
  /** Additional CSS classes */
  className?: string;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  className,
  loading,
  onClick,
}: StatCardProps) {
  const isGradient = variant === "gradient";
  const isClickable = !!onClick;

  if (loading) {
    return (
      <Card className={cn("h-full", className)} loading>
        <CardContent className="p-6" />
      </Card>
    );
  }

  return (
    <Card
      variant={isClickable ? "interactive" : "default"}
      className={cn(
        "h-full overflow-hidden",
        isGradient && "bg-gradient-to-br from-brand-500 to-brand-700 text-white border-none",
        className
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-6", isGradient && "text-white")}>
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "p-2.5 rounded-xl",
              isGradient
                ? "bg-white/20 backdrop-blur-sm"
                : "bg-brand-50"
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5",
                isGradient ? "text-white" : "text-brand-600"
              )}
            />
          </div>
          {trend && (
            <Badge
              variant={
                trend.direction === "up"
                  ? "success"
                  : trend.direction === "down"
                  ? "danger"
                  : "default"
              }
              size="sm"
              leftIcon={
                trend.direction === "up" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : trend.direction === "down" ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )
              }
              className={cn(isGradient && "bg-white/20 text-white border-white/30")}
            >
              {Math.abs(trend.value)}%
            </Badge>
          )}
        </div>

        <div className="mt-4">
          <p
            className={cn(
              "text-sm font-medium",
              isGradient ? "text-brand-100" : "text-neutral-500"
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "text-3xl font-bold mt-1 font-accent",
              isGradient ? "text-white" : "text-neutral-900"
            )}
          >
            {value}
          </p>
        </div>

        {trend && (
          <p
            className={cn(
              "text-xs mt-2",
              isGradient ? "text-brand-100" : "text-neutral-400"
            )}
          >
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

StatCard.displayName = "StatCard";
