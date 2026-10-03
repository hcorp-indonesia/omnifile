import type { ConvertedPage } from "@/lib/pdf-renderer";
import { cn } from "@/lib/utils";
import { Download, X } from "lucide-react";

export interface PdfPreviewModalProps {
  isOpen: boolean;
  page: ConvertedPage | null;
  formatName: string;
  isTransparentPattern?: boolean;
  onClose: () => void;
  onDownload?: (page: ConvertedPage) => void;
}

export function PdfPreviewModal({
  isOpen,
  page,
  formatName,
  isTransparentPattern = false,
  onClose,
  onDownload,
}: PdfPreviewModalProps) {
  if (!isOpen || !page) return null;

  return (
    <div
      className={cn(
        "fixed",
        "inset-0",
        "z-50",
        "flex",
        "items-center",
        "justify-center",
        "bg-black/60",
        "p-4",
        "backdrop-blur-xs",
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "relative",
          "max-h-[90vh]",
          "max-w-3xl",
          "w-full",
          "overflow-hidden",
          "rounded-3xl",
          "border-3",
          "border-gray-900",
          "bg-white",
          "p-4",
          "shadow-[8px_8px_0_0_#111827]",
          "dark:border-gray-700",
          "dark:bg-[#16181d]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn(
            "flex",
            "items-center",
            "justify-between",
            "border-b-2",
            "border-gray-200",
            "dark:border-gray-800",
            "pb-3",
            "mb-3",
          )}
        >
          <span
            className={cn(
              "font-bold",
              "text-sm",
              "text-gray-900",
              "dark:text-white",
              "truncate",
              "max-w-md",
            )}
          >
            {page.fileName} (Page {page.pageNumber})
          </span>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-lg",
              "border-2",
              "border-gray-900",
              "p-1",
              "hover:bg-gray-100",
              "dark:border-gray-700",
              "dark:text-white",
              "dark:hover:bg-gray-800",
              "cursor-pointer",
              "transition-colors",
            )}
          >
            <X className={cn("h-5", "w-5")} />
          </button>
        </div>

        {/* Image Preview Container */}
        <div
          className={cn(
            "max-h-[70vh]",
            "overflow-auto",
            "flex",
            "items-center",
            "justify-center",
            isTransparentPattern
              ? "bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-size-[12px_12px]"
              : "bg-gray-100 dark:bg-black/40",
            "rounded-xl",
            "p-2",
          )}
        >
          <img
            src={page.previewUrl}
            alt={page.fileName}
            className={cn("max-h-[68vh]", "object-contain", "rounded-md")}
          />
        </div>

        {/* Footer Actions */}
        <div
          className={cn(
            "mt-4",
            "flex",
            "flex-wrap",
            "items-center",
            "justify-end",
            "gap-3",
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "dark:border-gray-700",
              "px-4",
              "py-2",
              "text-xs",
              "font-bold",
              "text-gray-900",
              "dark:text-white",
              "hover:bg-gray-100",
              "dark:hover:bg-gray-800",
              "cursor-pointer",
              "transition-colors",
            )}
          >
            Close
          </button>

          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(page)}
              className={cn(
                "flex",
                "items-center",
                "gap-2",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-yellow-400",
                "px-4",
                "py-2",
                "text-xs",
                "font-black",
                "text-gray-900",
                "hover:bg-yellow-500",
                "cursor-pointer",
                "transition-all",
                "shadow-[2px_2px_0_0_#111827]",
              )}
            >
              <Download className={cn("h-4", "w-4")} />
              Download This {formatName}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
