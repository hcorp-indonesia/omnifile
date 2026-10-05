import React, { useRef, useState, useImperativeHandle } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageDropzoneProps {
  title?: string;
  description?: string;
  dropzoneTitle?: string;
  dropzoneSubtitle?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconBg?: string;
  className?: string;
  dropzoneClassName?: string;
  children?: React.ReactNode;
  onFilesSelected: (files: File[]) => void;
}

export const ImageDropzone = React.forwardRef<HTMLInputElement, ImageDropzoneProps>(
  (
    {
      title,
      description,
      dropzoneTitle = "Select or Drag & Drop images",
      dropzoneSubtitle = "Supports JPG, PNG, WebP, AVIF, TIFF, GIF, ICO (Max 50MB per file)",
      accept = "image/*",
      multiple = true,
      disabled = false,
      icon,
      iconBg = "bg-yellow-400",
      className,
      dropzoneClassName,
      children,
      onFilesSelected,
    },
    forwardedRef
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const internalInputRef = useRef<HTMLInputElement>(null);

    // Synchronize forwardedRef if provided
    useImperativeHandle(
      forwardedRef,
      () => internalInputRef.current as HTMLInputElement,
      []
    );

    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const fileArray = Array.from(e.dataTransfer.files);
        onFilesSelected(fileArray);
      }
    };

    const handleClick = () => {
      if (disabled) return;
      internalInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const fileArray = Array.from(e.target.files);
        onFilesSelected(fileArray);
        e.target.value = "";
      }
    };

    return (
      <div className={cn("space-y-6", className)}>
        {/* Optional Title & Description Header */}
        {(title || description) && (
          <div className={cn("text-center space-y-2")}>
            {title && (
              <h1
                className={cn(
                  "text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white"
                )}
              >
                {title}
              </h1>
            )}
            {description && (
              <p
                className={cn(
                  "text-sm font-semibold text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Hidden Native File Input */}
        <input
          ref={internalInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className={cn("hidden")}
          onChange={handleInputChange}
        />

        {/* Drag & Drop Surface */}
        <section
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "group relative flex min-h-[220px] sm:min-h-[240px] w-full flex-col items-center justify-center text-center",
            "rounded-3xl border-3 border-dashed p-8 sm:p-12 transition-all",
            "cursor-pointer select-none",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            isDragging
              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 scale-[1.01]"
              : "border-gray-900 dark:border-gray-700 bg-white dark:bg-[#16181d] hover:bg-yellow-50/50 dark:hover:bg-[#1e222a]",
            "shadow-[6px_6px_0_0_#111827] dark:shadow-[6px_6px_0_0_#000]",
            dropzoneClassName
          )}
        >
          <div
            className={cn(
              "mb-3 flex h-16 w-16 items-center justify-center rounded-2xl",
              "border-3 border-gray-900 dark:border-gray-700",
              iconBg,
              "text-gray-900",
              "shadow-[3px_3px_0_0_#111827] dark:shadow-[3px_3px_0_0_#000]",
              "transition-transform group-hover:scale-110"
            )}
          >
            {icon || <Upload className={cn("h-8", "w-8", "stroke-[2.5]")} />}
          </div>

          <h3
            className={cn(
              "text-xl font-extrabold text-gray-900 dark:text-white"
            )}
          >
            {dropzoneTitle}
          </h3>
          {dropzoneSubtitle && (
            <p
              className={cn(
                "mt-1 text-xs font-bold text-gray-500 dark:text-gray-400"
              )}
            >
              {dropzoneSubtitle}
            </p>
          )}

          {children && (
            <div
              className={cn("mt-4")}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          )}
        </section>
      </div>
    );
  }
);

ImageDropzone.displayName = "ImageDropzone";

export default ImageDropzone;
