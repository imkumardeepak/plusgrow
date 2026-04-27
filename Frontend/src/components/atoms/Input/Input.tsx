import React from "react";
import { TextInput } from "@mantine/core";
import { cn } from "../../../lib/utils";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: "default" | "error" | "success" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  helperText?: string;
  error?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  containerClassName?: string;
}

export const inputVariants = ({ className }: { className?: string } = {}) => className ?? "";

const sizeMap: Record<NonNullable<InputProps["size"]>, "xs" | "sm" | "md" | "lg" | "xl"> = {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      variant = "default",
      size = "md",
      label,
      helperText,
      error,
      leftElement,
      rightElement,
      fullWidth,
      disabled,
      id,
      inputRef,
      style,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const hasError = Boolean(error);
    const resolvedRef = inputRef || ref;

    return (
      <TextInput
        id={inputId}
        ref={resolvedRef}
        label={label}
        description={!hasError ? helperText : undefined}
        error={error}
        leftSection={leftElement}
        rightSection={rightElement}
        disabled={disabled}
        size={sizeMap[size]}
        w={fullWidth ? "100%" : undefined}
        classNames={{
          root: cn(fullWidth && "w-full", containerClassName),
          input: cn(fullWidth && "w-full", className),
        }}
        styles={{
          label: {
            marginBottom: 6,
            fontWeight: 600,
          },
          input: {
            backgroundColor: variant === "ghost" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)",
            borderColor: hasError ? "var(--mantine-color-red-6)" : "rgba(255,255,255,0.12)",
          },
          description: {
            color: "var(--mantine-color-gray-4)",
          },
        }}
        style={style}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
