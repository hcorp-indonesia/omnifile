import React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      containerClassName,
      labelClassName,
      label,
      error,
      helperText,
      id,
      required,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || (label ? `textarea-${generatedId}` : undefined);

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
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

        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
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
            "transition-all duration-150 resize-y",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800",
            error &&
              "border-red-500 dark:border-red-500 focus:border-red-600 focus:ring-red-400",
            className
          )}
          {...props}
        />

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

Textarea.displayName = "Textarea";
