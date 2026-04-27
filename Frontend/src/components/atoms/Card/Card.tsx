import React from "react";
import { Box, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { cn } from "../../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "ghost" | "interactive" | "glass";
  padding?: "none" | "sm" | "md" | "lg";
  clickable?: boolean;
  loading?: boolean;
}

export const cardVariants = ({ className }: { className?: string } = {}) => className ?? "";

const paddingMap: Record<NonNullable<CardProps["padding"]>, number | string> = {
  none: 0,
  sm: "md",
  md: "lg",
  lg: "xl",
};

function getCardStyles(variant: NonNullable<CardProps["variant"]>) {
  switch (variant) {
    case "elevated":
      return {
        background: "rgba(10, 18, 32, 0.88)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "var(--shadow-float)",
      };
    case "outlined":
      return {
        background: "rgba(8, 14, 26, 0.76)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "var(--shadow-card)",
      };
    case "ghost":
      return {
        background: "transparent",
        border: "1px solid transparent",
        boxShadow: "none",
      };
    case "interactive":
      return {
        background: "rgba(10, 18, 32, 0.86)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "var(--shadow-card)",
      };
    case "glass":
      return {
        background: "linear-gradient(180deg, rgba(19,27,45,0.82) 0%, rgba(10,18,32,0.9) 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "var(--shadow-card)",
        backdropFilter: "blur(18px)",
      };
    default:
      return {
        background: "rgba(10, 18, 32, 0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "var(--shadow-card)",
      };
  }
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "none", clickable, loading, children, style, ...props }, ref) => {
    const resolvedVariant = variant as NonNullable<CardProps["variant"]>;

    return (
      <Paper
        ref={ref}
        radius="xl"
        p={paddingMap[padding]}
        className={cn(clickable && "cursor-pointer", loading && "pointer-events-none", className)}
        style={{
          ...getCardStyles(resolvedVariant),
          ...style,
        }}
        {...props}
      >
        {loading ? <CardSkeleton /> : children}
      </Paper>
    );
  }
);

Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
  divider?: boolean;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, action, divider = true, children, style, ...props }, ref) => {
    return (
      <Group
        ref={ref}
        justify="space-between"
        align="flex-start"
        wrap="nowrap"
        className={cn(divider && "border-b border-white/10 pb-3", className)}
        style={style}
        {...props}
      >
        <Box className="min-w-0 flex-1">{children}</Box>
        {action ? <Box>{action}</Box> : null}
      </Group>
    );
  }
);

CardHeader.displayName = "CardHeader";

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: "sm" | "md" | "lg" | "xs";
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      xs: "text-xs font-semibold",
      sm: "text-sm font-semibold",
      md: "text-base font-semibold",
      lg: "text-lg font-bold",
    };

    return (
      <Box
        ref={ref}
        component="h3"
        className={cn("tracking-tight text-white", sizeClasses[size], className)}
        {...props}
      />
    );
  }
);

CardTitle.displayName = "CardTitle";

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return <Text ref={ref} component="p" size="sm" c="dimmed" className={cn("mt-1", className)} {...props} />;
  }
);

CardDescription.displayName = "CardDescription";

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, noPadding, ...props }, ref) => {
    return <Box ref={ref} className={cn(!noPadding && "pt-3", className)} {...props} />;
  }
);

CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "center" | "right" | "between";
  divider?: boolean;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, align = "left", divider = true, style, ...props }, ref) => {
    const justifyMap = {
      left: "flex-start",
      center: "center",
      right: "flex-end",
      between: "space-between",
    } as const;

    return (
      <Group
        ref={ref}
        justify={justifyMap[align]}
        className={cn(divider && "mt-3 border-t border-white/10 pt-3", className)}
        style={style}
        {...props}
      />
    );
  }
);

CardFooter.displayName = "CardFooter";

function CardSkeleton() {
  return (
    <Stack gap="sm">
      <Skeleton height={20} radius="md" width="32%" />
      <Skeleton height={16} radius="md" width="48%" />
      <Skeleton height={12} radius="md" />
      <Skeleton height={12} radius="md" width="88%" />
      <Skeleton height={12} radius="md" width="72%" />
    </Stack>
  );
}
