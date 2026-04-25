/**
 * Badge Component
 * A versatile badge component with multiple variants and sizes
 */

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-950",
  {
    variants: {
      variant: {
        default: "border border-white/10 bg-white/6 text-neutral-100",
        primary: "border border-brand-300/20 bg-brand-400/12 text-brand-100",
        secondary: "border border-white/10 bg-white/6 text-neutral-100",
        success: "border border-success-400/20 bg-success-500/12 text-success-200",
        warning: "border border-warning-400/20 bg-warning-500/12 text-warning-100",
        danger: "border border-danger-400/20 bg-danger-500/12 text-danger-200",
        info: "border border-info-400/20 bg-info-500/12 text-info-100",
        outline: "bg-transparent border border-white/14 text-neutral-100",
        ghost: "bg-transparent text-neutral-200 hover:bg-white/8",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] leading-4 rounded-md gap-1",
        md: "px-2.5 py-0.5 text-xs leading-4 rounded-lg gap-1.5",
        lg: "px-3 py-1 text-sm leading-5 rounded-lg gap-1.5",
      },
      shape: {
        default: "rounded-lg",
        pill: "rounded-full",
        square: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "default",
    },
  }
);

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof badgeVariants> {
  /** Optional dot indicator */
  dot?: boolean;
  /** Dot color class (Tailwind class) */
  dotColor?: string;
  /** Optional icon before text */
  leftIcon?: React.ReactNode;
  /** Optional icon after text */
  rightIcon?: React.ReactNode;
  /** Whether badge is clickable */
  clickable?: boolean;
  /** Badge content */
  children?: React.ReactNode;
}

export function Badge({
  className,
  variant,
  size,
  shape,
  dot,
  dotColor,
  leftIcon,
  rightIcon,
  clickable,
  children,
  ...props
}: BadgeProps) {
  const Comp = clickable ? "button" : "span";

  return (
    <Comp
      className={cn(
        badgeVariants({ variant, size, shape }),
        clickable && "cursor-pointer hover:opacity-80 active:scale-95",
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "flex-shrink-0 rounded-full",
            size === "sm" ? "w-1 h-1" : size === "lg" ? "w-2 h-2" : "w-1.5 h-1.5",
            dotColor || (variant === "success" ? "bg-success-500" : 
                       variant === "warning" ? "bg-warning-500" :
                       variant === "danger" ? "bg-danger-500" :
                       variant === "primary" ? "bg-brand-500" :
                       "bg-neutral-500")
          )}
        />
      )}
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {children && <span className="truncate">{children}</span>}
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </Comp>
  );
}

Badge.displayName = "Badge";
