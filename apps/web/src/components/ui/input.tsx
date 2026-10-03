import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      labelClassName,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    // Generate fallback id for label association if not explicitly provided
    const generatedId = React.useId();
    const inputId = id || (label ? `input-${generatedId}` : undefined);

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-200",
              disabled && "opacity-60 cursor-not-allowed",
              labelClassName
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-4 z-10 flex items-center justify-center text-gray-500 pointer-events-none dark:text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            type={type}
            ref={ref}
            required={required}
            disabled={disabled}
            className={cn(
              "w-full py-3.5 px-4.5 rounded-2xl",
              "border-3 border-gray-900 dark:border-gray-700",
              "bg-gray-50 dark:bg-[#1e222a]",
              "text-sm font-semibold text-gray-900 dark:text-white",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "focus:outline-none focus:bg-white dark:focus:bg-[#252932]",
              "focus:border-gray-900 dark:focus:border-gray-500",
              "focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-500/50",
              "transition-all duration-150",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800",
              leftIcon && "pl-11",
              rightIcon && "pr-11",
              error &&
                "border-red-500 dark:border-red-500 focus:border-red-600 focus:ring-red-400",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs font-bold text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
            <span>•</span>
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
