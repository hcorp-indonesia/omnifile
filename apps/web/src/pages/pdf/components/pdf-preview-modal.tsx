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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-3 border-gray-900 bg-white shadow-[8px_8px_0_0_#111827] dark:border-gray-700 dark:bg-[#16181d]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-3 border-gray-900 bg-yellow-400 px-4 py-2 dark:border-gray-700">
          <div className="min-w-0 pr-3">
            <p className="truncate text-sm font-black text-gray-900">
              {page.fileName}
            </p>
            <p className="text-[11px] font-bold text-gray-800">
              Halaman {page.pageNumber} · {page.width} × {page.height} px
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup preview gambar"
            className={cn(
              "shrink-0",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "bg-white",
              "p-1.5",
              "text-gray-900",
              "shadow-[2px_2px_0_0_#111827]",
              "hover:bg-gray-100",
              "cursor-pointer",
              "transition-transform",
              "hover:scale-105",
            )}
          >
            <X className="h-4 w-4 stroke-3" />
          </button>
        </div>

        {/* Image Preview Container */}
        <div
          className={cn(
            "relative flex-1 overflow-auto p-4",
            "flex items-center justify-center",
            isTransparentPattern
              ? "bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-size-[12px_12px]"
              : "bg-gray-200/80 dark:bg-[#0d0e12]",
          )}
        >
          <img
            src={page.previewUrl}
            alt={page.fileName}
            className="max-h-[76vh] max-w-[92%] rounded-sm border border-gray-300 object-contain shadow-md dark:border-gray-700"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-3 border-gray-900 bg-white px-5 py-3 dark:border-gray-700 dark:bg-[#16181d]">
          <span className="text-xs font-black text-gray-500 dark:text-gray-400">
            Preview {formatName}
          </span>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-gray-100",
                "px-4 py-2",
                "text-xs",
                "font-bold",
                "text-gray-800",
                "hover:bg-gray-200",
                "cursor-pointer",
              )}
            >
              Tutup
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
                  "px-5 py-2",
                  "text-xs",
                  "font-black",
                  "text-gray-900",
                  "hover:bg-yellow-500",
                  "cursor-pointer",
                  "transition-all",
                  "shadow-[3px_3px_0_0_#111827]",
                  "hover:-translate-y-0.5",
                )}
              >
                <Download className={cn("h-4", "w-4")} />
                Download {formatName}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
