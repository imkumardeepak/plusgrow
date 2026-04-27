/**
 * Input Component
 * A comprehensive input component with label, helper text, and error states
 */

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

export const inputVariants = cva(
  "flex w-full bg-white/[0.04] transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:bg-white/[0.04] disabled:text-neutral-300",
  {
    variants: {
      variant: {
        default: "border border-white/10 text-white hover:border-brand-300/30 focus-visible:border-brand-400",
        error: "border border-danger-300 text-danger-300 placeholder:text-danger-300 hover:border-danger-400 focus-visible:ring-danger-500",
        success: "border border-success-300 text-success-900 hover:border-success-400 focus-visible:ring-success-500",
        ghost: "border-0 bg-transparent hover:bg-white/6 focus-visible:bg-white/8 focus-visible:ring-1",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-xl",
        md: "h-10 px-3.5 text-sm rounded-xl",
        lg: "h-11 px-4 text-base rounded-xl",
        xl: "h-12 px-5 text-base rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  /** Label text */
  label?: string;
  /** Helper text displayed below input */
  helperText?: string;
  /** Error message displayed below input */
  error?: string;
  /** Optional left icon/element */
  leftElement?: React.ReactNode;
  /** Optional right icon/element */
  rightElement?: React.ReactNode;
  /** Whether the input takes full width */
  fullWidth?: boolean;
  /** Ref for the input element */
  inputRef?: React.Ref<HTMLInputElement>;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helperText,
      error,
      leftElement,
      rightElement,
      fullWidth,
      disabled,
      id,
      inputRef,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const hasError = !!error;
    const inputVariant = hasError ? "error" : variant;

    return (
      <div ref={ref} className={cn("flex flex-col gap-1.5", fullWidth && "w-full", className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-100"
          >
            {label}
            {props.required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}
        <div className={cn("relative flex items-center", fullWidth && "w-full")}>
          {leftElement && (
            <div className="absolute left-3 flex items-center pointer-events-none text-neutral-500">
              {leftElement}
            </div>
          )}
          <input
            id={inputId}
            ref={inputRef}
            className={cn(
              inputVariants({ variant: inputVariant, size }),
              leftElement && "pl-10",
              rightElement && "pr-10",
              fullWidth && "w-full"
            )}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center text-neutral-500">
              {rightElement}
            </div>
          )}
        </div>
        {helperText && !hasError && (
          <p id={`${inputId}-helper`} className="text-xs text-neutral-400">
            {helperText}
          </p>
        )}
        {hasError && (
          <p id={`${inputId}-error`} className="text-xs text-danger-300 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
