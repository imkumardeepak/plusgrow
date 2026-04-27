import React from "react";
import { Button as MantineButton } from "@mantine/core";
import { cn } from "../../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "link" | "destructive" | "success" | "warning";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "icon" | "icon-sm" | "icon-lg";
  width?: "auto" | "full";
  loading?: boolean;
  loadingText?: string;
  loadingPosition?: "left" | "right";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const buttonVariants = ({ className }: { className?: string } = {}) => className ?? "";

const sizeMap: Record<NonNullable<ButtonProps["size"]>, { mantineSize: "xs" | "sm" | "md" | "lg" | "xl"; iconWidth?: number }> = {
  xs: { mantineSize: "xs" },
  sm: { mantineSize: "sm" },
  md: { mantineSize: "md" },
  lg: { mantineSize: "lg" },
  xl: { mantineSize: "xl" },
  icon: { mantineSize: "md", iconWidth: 40 },
  "icon-sm": { mantineSize: "sm", iconWidth: 36 },
  "icon-lg": { mantineSize: "lg", iconWidth: 44 },
};

function getVariantConfig(variant: NonNullable<ButtonProps["variant"]>) {
  switch (variant) {
    case "primary":
    case "default":
      return { variant: "gradient" as const, gradient: { from: "cyan.4", to: "blue.7", deg: 135 } };
    case "secondary":
      return { variant: "light" as const, color: "gray" as const };
    case "outline":
      return { variant: "outline" as const, color: "gray" as const };
    case "ghost":
      return { variant: "subtle" as const, color: "gray" as const };
    case "link":
      return { variant: "subtle" as const, color: "cyan" as const };
    case "destructive":
      return { variant: "filled" as const, color: "red" as const };
    case "success":
      return { variant: "filled" as const, color: "green" as const };
    case "warning":
      return { variant: "filled" as const, color: "yellow" as const };
    default:
      return { variant: "gradient" as const, gradient: { from: "cyan.4", to: "blue.7", deg: 135 } };
  }
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      width = "auto",
      loading = false,
      loadingText,
      loadingPosition = "left",
      leftIcon,
      rightIcon,
      fullWidth,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const resolvedVariant = variant as NonNullable<ButtonProps["variant"]>;
    const config = getVariantConfig(resolvedVariant);
    const mappedSize = sizeMap[size];
    const isIconButton = typeof mappedSize.iconWidth === "number";
    const isDisabled = disabled || loading;

    return (
      <MantineButton
        ref={ref}
        type={props.type}
        onClick={props.onClick}
        onBlur={props.onBlur}
        onFocus={props.onFocus}
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}
        name={props.name}
        value={props.value}
        disabled={isDisabled}
        loading={loading}
        leftSection={loading && loadingPosition === "left" ? undefined : leftIcon}
        rightSection={loading && loadingPosition === "right" ? undefined : rightIcon}
        fullWidth={fullWidth || width === "full"}
        size={mappedSize.mantineSize}
        radius={isIconButton ? "xl" : "xl"}
        className={cn(resolvedVariant === "link" && "px-0", className)}
        style={{
          ...(isIconButton
            ? {
                minWidth: mappedSize.iconWidth,
                width: mappedSize.iconWidth,
                paddingInline: 0,
              }
            : {}),
          ...(resolvedVariant === "link"
            ? {
                background: "transparent",
                height: "auto",
              }
            : {}),
          ...style,
        }}
        {...config}
        {...props}
      >
        {loading && loadingText ? loadingText : children}
      </MantineButton>
    );
  }
);

Button.displayName = "Button";
