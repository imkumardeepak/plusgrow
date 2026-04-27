import React from "react";
import { Badge as MantineBadge, Group } from "@mantine/core";
import { cn } from "../../../lib/utils";

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  shape?: "default" | "pill" | "square";
  dot?: boolean;
  dotColor?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clickable?: boolean;
  children?: React.ReactNode;
}

export const badgeVariants = ({ className }: { className?: string } = {}) => className ?? "";

function getVariantConfig(variant: NonNullable<BadgeProps["variant"]>) {
  switch (variant) {
    case "primary":
      return { variant: "light" as const, color: "cyan" as const };
    case "secondary":
      return { variant: "light" as const, color: "gray" as const };
    case "success":
      return { variant: "light" as const, color: "green" as const };
    case "warning":
      return { variant: "light" as const, color: "yellow" as const };
    case "danger":
      return { variant: "light" as const, color: "red" as const };
    case "info":
      return { variant: "light" as const, color: "blue" as const };
    case "outline":
      return { variant: "outline" as const, color: "gray" as const };
    case "ghost":
      return { variant: "transparent" as const, color: "gray" as const };
    default:
      return { variant: "light" as const, color: "gray" as const };
  }
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  shape = "default",
  dot,
  leftIcon,
  rightIcon,
  clickable,
  children,
  ...props
}: BadgeProps) {
  const config = getVariantConfig(variant);

  return (
    <MantineBadge
      radius={shape === "pill" ? "xl" : shape === "square" ? "sm" : "md"}
      size={size}
      className={cn(clickable && "cursor-pointer", className)}
      leftSection={dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : leftIcon}
      rightSection={rightIcon}
      {...config}
      {...props}
    >
      <Group gap={6} wrap="nowrap">
        {leftIcon && !dot ? leftIcon : null}
        {children}
      </Group>
    </MantineBadge>
  );
}

Badge.displayName = "Badge";
