/**
 * Button Component
 * A versatile button component with multiple variants, sizes, and states
 */

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 text-neutral-950 shadow-brand hover:from-brand-200 hover:via-brand-300 hover:to-brand-400 hover:shadow-brand-lg hover:-translate-y-px",
        primary: "bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 text-neutral-950 shadow-brand hover:from-brand-200 hover:via-brand-300 hover:to-brand-400 hover:shadow-brand-lg hover:-translate-y-px",
        secondary: "border border-white/12 bg-white/6 text-white shadow-card hover:bg-white/10 hover:border-brand-300/30 hover:shadow-card-hover active:bg-white/12",
        outline: "border border-white/14 bg-transparent text-neutral-100 hover:bg-white/8 hover:text-white hover:border-brand-300/40",
        ghost: "text-neutral-200 hover:bg-white/8 hover:text-white active:bg-white/10",
        link: "text-brand-200 underline-offset-4 hover:underline hover:text-brand-100",
        destructive: "bg-danger-600 text-white shadow-sm hover:bg-danger-700 hover:shadow-md hover:-translate-y-px",
        success: "bg-success-600 text-white shadow-sm hover:bg-success-700 hover:shadow-md hover:-translate-y-px",
        warning: "bg-warning-500 text-white shadow-sm hover:bg-warning-600 hover:shadow-md hover:-translate-y-px",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md gap-1",
        sm: "h-9 px-3 text-sm rounded-full gap-1.5",
        md: "h-11 px-5 text-sm rounded-full gap-2",
        lg: "h-12 px-6 text-base rounded-full gap-2",
        xl: "h-14 px-8 text-base rounded-full gap-2.5",
        icon: "h-10 w-10 rounded-full",
        "icon-sm": "h-9 w-9 rounded-full",
        "icon-lg": "h-12 w-12 rounded-full",
      },
      width: {
        auto: "w-auto",
        full: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      width: "auto",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Loading state */
  loading?: boolean;
  /** Loading text to display */
  loadingText?: string;
  /** Position of loading spinner */
  loadingPosition?: "left" | "right";
  /** Optional left icon */
  leftIcon?: React.ReactNode;
  /** Optional right icon */
  rightIcon?: React.ReactNode;
  /** Whether button takes full width */
  fullWidth?: boolean;
  /** Button content */
  children?: React.ReactNode;
}

const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg
    className={cn("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      loading = false,
      loadingText,
      loadingPosition = "left",
      leftIcon,
      rightIcon,
      fullWidth,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const showLeftSpinner = loading && loadingPosition === "left";
    const showRightSpinner = loading && loadingPosition === "right";

    return (
      <button
        className={cn(
          buttonVariants({ variant, size, width: fullWidth ? "full" : width }),
          className
        )}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {showLeftSpinner && <LoadingSpinner className={cn(size === "xs" || size === "icon-sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />}
        {!showLeftSpinner && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        
        {loading && loadingText ? (
          <span>{loadingText}</span>
        ) : (
          children
        )}
        
        {showRightSpinner && <LoadingSpinner className={cn(size === "xs" || size === "icon-sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />}
        {!showRightSpinner && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
