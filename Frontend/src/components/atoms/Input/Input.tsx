/**
 * Input Component
 * A comprehensive input component with label, helper text, and error states
 */

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

export const inputVariants = cva(
  "input input-bordered transition-all duration-200",
  {
    variants: {
      variant: {
        default: "",
        error: "input-error",
        success: "input-success",
        ghost: "input-ghost",
      },
      size: {
        sm: "input-sm rounded-xl",
        md: "input-md rounded-xl",
        lg: "input-lg rounded-xl",
        xl: "input-lg h-12 text-base rounded-xl",
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
  /** Optional container class name */
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
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
      <div ref={ref} className={cn("form-control", fullWidth && "w-full", containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="label pb-1">
            <span className="label-text text-sm font-medium text-neutral-100">
              {label}
              {props.required && <span className="text-error ml-1">*</span>}
            </span>
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
              fullWidth && "w-full",
              className
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
        {(helperText || hasError) && (
          <label className="label pt-1 pb-0">
            {helperText && !hasError && (
              <span id={`${inputId}-helper`} className="label-text-alt text-neutral-400">
                {helperText}
              </span>
            )}
            {hasError && (
              <span id={`${inputId}-error`} className="label-text-alt text-error flex items-center gap-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
