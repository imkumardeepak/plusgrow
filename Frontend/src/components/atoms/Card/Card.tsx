/**
 * Card Component
 * A flexible card component with header, content, and footer sections
 */

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

// Card Container
export const cardVariants = cva(
  "rounded-[26px] border transition-all duration-300",
  {
    variants: {
      variant: {
        default: "card-base",
        elevated: "bg-white/[0.05] border-white/10 shadow-float",
        outlined: "bg-white/[0.03] border-white/12 shadow-card",
        ghost: "border-transparent shadow-none bg-transparent",
        interactive: "card-base card-hover cursor-pointer",
        glass: "glassmorphism",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "none",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof cardVariants> {
  /** Whether the card is clickable */
  clickable?: boolean;
  /** Loading state with skeleton */
  loading?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, clickable, loading, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding }),
          clickable && "cursor-pointer",
          loading && "pointer-events-none",
          className
        )}
        {...props}
      >
        {loading ? (
          <CardSkeleton padding={padding} />
        ) : (
          children
        )}
      </div>
    );
  }
);

Card.displayName = "Card";

// Card Header
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional action element (button, link, etc.) */
  action?: React.ReactNode;
  /** Whether to show a divider below header */
  divider?: boolean;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, action, divider = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between gap-4",
          divider && "border-b border-white/10 pb-4",
          className
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">{children}</div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

// Card Title
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Title size variant */
  size?: "sm" | "md" | "lg";
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "text-sm font-semibold",
      md: "text-base font-semibold",
      lg: "text-lg font-bold",
    };

    return (
      <h3
        ref={ref}
        className={cn("text-white tracking-tight", sizeClasses[size], className)}
        {...props}
      />
    );
  }
);

CardTitle.displayName = "CardTitle";

// Card Description
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> { }

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-neutral-300 mt-1", className)}
        {...props}
      />
    );
  }
);

CardDescription.displayName = "CardDescription";

// Card Content
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove default padding */
  noPadding?: boolean;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, noPadding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(!noPadding && "pt-4", className)}
        {...props}
      />
    );
  }
);

CardContent.displayName = "CardContent";

// Card Footer
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alignment of footer content */
  align?: "left" | "center" | "right" | "between";
  /** Whether to show a divider above footer */
  divider?: boolean;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, align = "left", divider = true, ...props }, ref) => {
    const alignClasses = {
      left: "justify-start",
      center: "justify-center",
      right: "justify-end",
      between: "justify-between",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3",
          divider && "border-t border-white/10 pt-4 mt-4",
          alignClasses[align],
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = "CardFooter";

// Skeleton loader for card
function CardSkeleton({ padding }: { padding?: "none" | "sm" | "md" | "lg" }) {
  const paddingClass = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div className={cn("animate-pulse", paddingClass[padding || "none"])}>
      <div className="h-5 bg-white/10 rounded w-1/3 mb-2" />
      <div className="h-4 bg-white/10 rounded w-2/3 mb-4" />
      <div className="space-y-2">
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-5/6" />
        <div className="h-3 bg-white/10 rounded w-4/6" />
      </div>
    </div>
  );
}
