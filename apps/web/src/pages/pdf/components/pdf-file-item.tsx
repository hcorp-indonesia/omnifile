import type { ExcelConversionResult } from "@/lib/pdf-excel-api";
import type { ConvertedPage, ConvertedPdfResult } from "@/lib/pdf-renderer";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

export interface FileItemState {
  file: File;
  id: string;
  name: string;
  size: number;
  status: "pending" | "converting" | "done" | "error";
  engine?: string;
  result?: ConvertedPdfResult;
  excelResult?: ExcelConversionResult;
  errorMessage?: string;
  isExpanded?: boolean;
}

export interface PdfFileItemProps {
  item: any;
  index: number;
  formatName: string;
  largeFileThresholdBytes?: number;
  onToggleExpand?: (id: string) => void;
  onEditPage?: (fileId: string, page: ConvertedPage) => void;
  onDeleteFile: (fileId: string) => void;
  onDeletePage?: (page: ConvertedPage) => void;
  onDownloadFile: (item: any) => void;
  onDownloadSinglePage?: (page: ConvertedPage) => void;
  onPreviewPage?: (page: ConvertedPage) => void;
  onPreviewExcel?: (result: ExcelConversionResult) => void;
}

export function PdfFileItem({
  item,
  index,
  formatName,
  largeFileThresholdBytes = 50 * 1024 * 1024,
  onToggleExpand,
  onEditPage,
  onDeleteFile,
  onDeletePage,
  onDownloadFile,
  onDownloadSinglePage,
  onPreviewPage,
  onPreviewExcel,
}: PdfFileItemProps) {
  const isDone = item.status === "done";
  const isConverting = item.status === "converting";
  const pagesCount = item.result?.pages.length || 0;

  return (
    <div
      className={cn(
        "overflow-hidden",
        "rounded-2xl",
        "border-3",
        "border-gray-900",
        "dark:border-gray-700",
        "bg-white",
        "dark:bg-[#16181d]",
        "shadow-[4px_4px_0_0_#111827]",
        "dark:shadow-[4px_4px_0_0_#000]",
        "transition-all",
      )}
    >
      <div
        className={cn(
          "flex",
          "items-center",
          "justify-between",
          "gap-4",
          "p-4",
        )}
      >
        {/* Left: Thumbnail & Info */}
        <div className={cn("flex", "items-center", "gap-3.5", "min-w-0")}>
          <div
            className={cn(
              "relative",
              "flex",
              "h-12",
              "w-12",
              "shrink-0",
              "items-center",
              "justify-center",
              "overflow-hidden",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-gray-100 dark:bg-gray-800",
            )}
          >
            {item.excelResult ? (
              <FileSpreadsheet className={cn("h-6", "w-6", "text-emerald-600", "dark:text-emerald-400")} />
            ) : item.result && item.result.pages.length > 0 ? (
              <img
                src={item.result.pages[0].previewUrl}
                alt={item.name}
                onClick={() =>
                  item.result && onPreviewPage?.(item.result.pages[0])
                }
                className={cn(
                  "h-full",
                  "w-full",
                  "object-contain",
                  "cursor-pointer",
                )}
              />
            ) : (
              <FileText className={cn("h-6", "w-6", "text-red-500")} />
            )}
            <span
              className={cn(
                "absolute",
                "bottom-0",
                "right-0",
                "rounded-tl-md",
                "bg-gray-900",
                "px-1",
                "py-0.5",
                "text-[8px]",
                "font-black",
                "text-white",
              )}
            >
              #{index + 1}
            </span>
          </div>

          <div className="min-w-0">
            <p
              title={item.name}
              className={cn(
                "truncate",
                "text-sm",
                "font-bold",
                "text-gray-900",
                "dark:text-white",
              )}
            >
              {item.name}
            </p>
            <div
              className={cn(
                "mt-0.5",
                "flex",
                "flex-wrap",
                "items-center",
                "gap-2",
                "text-xs",
                "font-semibold",
                "text-gray-500",
                "dark:text-gray-400",
              )}
            >
              <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
              {item.excelResult ? (
                <>
               
                  <span
                    className={cn(
                      "rounded-md",
                      "bg-yellow-300",
                      "px-1.5",
                      "py-0.5",
                      "text-[11px]",
                      "font-black",
                      "text-gray-900",
                    )}
                  >
                    {item.excelResult.total_sheets}{" "}
                    {item.excelResult.total_sheets > 1 ? "sheets" : "sheet"} (
                    {item.excelResult.total_rows} rows)
                  </span>
                  <span>• {(item.excelResult.file_size / 1024).toFixed(1)} KB</span>
                </>
              ) : item.size >= largeFileThresholdBytes ? (
                <span
                  className={cn(
                    "rounded-md",
                    "bg-purple-100",
                    "dark:bg-purple-950/60",
                    "text-purple-700",
                    "dark:text-purple-300",
                    "px-1.5",
                    "py-0.5",
                    "text-[10px]",
                    "font-black",
                    "border",
                    "border-purple-300",
                    "dark:border-purple-800",
                  )}
                >
                  🚀 Server Engine
                </span>
              ) : null}
              {isDone && !item.excelResult ? (
                <span
                  className={cn(
                    "rounded-md",
                    "bg-yellow-300",
                    "px-1.5",
                    "py-0.5",
                    "text-[11px]",
                    "font-black",
                    "text-gray-900",
                  )}
                >
                  {pagesCount} {pagesCount > 1 ? "pages" : "page"}
                </span>
              ) : isConverting ? (
                <span
                  className={cn(
                    "text-amber-500",
                    "font-bold",
                    "flex",
                    "items-center",
                    "gap-1",
                  )}
                >
                  <Loader2 className={cn("h-3.5", "w-3.5", "animate-spin")} />{" "}
                  Converting...
                </span>
              ) : item.status === "error" ? (
                <span className="text-red-500 font-bold">
                  {item.errorMessage || "Error"}
                </span>
              ) : !item.excelResult ? (
                <span className="text-gray-400">Ready</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className={cn("flex", "items-center", "gap-2", "shrink-0")}>
          {isDone && pagesCount > 1 && (
            <button
              type="button"
              onClick={() => onToggleExpand?.(item.id)}
              className={cn(
                "inline-flex",
                "items-center",
                "gap-1",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-gray-100",
                "dark:bg-[#1e222a]",
                "px-2.5",
                "py-1.5",
                "text-xs",
                "font-bold",
                "text-gray-700",
                "dark:text-gray-300",
                "hover:bg-gray-200",
                "dark:hover:bg-gray-700",
                "cursor-pointer",
                "transition-colors",
              )}
            >
              <span>Pages</span>
              {item.isExpanded ? (
                <ChevronUp className={cn("h-3.5", "w-3.5")} />
              ) : (
                <ChevronDown className={cn("h-3.5", "w-3.5")} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDeleteFile(item.id)}
            className={cn(
              "inline-flex",
              "h-8",
              "w-8",
              "items-center",
              "justify-center",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-white",
              "dark:bg-[#1a1c22]",
              "text-rose-600",
              "dark:text-rose-400",
              "shadow-[2px_2px_0_0_#111827]",
              "dark:shadow-[2px_2px_0_0_#000]",
              "hover:bg-rose-50",
              "dark:hover:bg-rose-950/40",
              "hover:-translate-y-0.5",
              "transition-all",
              "cursor-pointer",
            )}
            title="Hapus file ini"
          >
            <Trash2 className={cn("h-4", "w-4")} />
          </button>
          {/* Excel Preview button (Eye icon) */}
          {isDone && item.excelResult && onPreviewExcel && (
            <button
              type="button"
              onClick={() => onPreviewExcel(item.excelResult!)}
              className={cn(
                "inline-flex",
                "h-8",
                "w-8",
                "items-center",
                "justify-center",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-white",
                "dark:bg-[#1a1c22]",
                "text-gray-900",
                "dark:text-white",
                "shadow-[2px_2px_0_0_#111827]",
                "dark:shadow-[2px_2px_0_0_#000]",
                "hover:bg-gray-100",
                "dark:hover:bg-[#252a34]",
                "hover:-translate-y-0.5",
                "transition-all",
                "cursor-pointer",
              )}
              title="Preview Spreadsheet"
            >
              <Eye className={cn("h-4", "w-4")} />
            </button>
          )}

          {/* Single page: Edit button with simple pencil icon */}
          {isDone && !item.excelResult && pagesCount === 1 && onEditPage && (
            <button
              type="button"
              onClick={() =>
                item.result?.pages[0] &&
                onEditPage(item.id, item.result.pages[0])
              }
              className={cn(
                "inline-flex",
                "h-8",
                "w-8",
                "items-center",
                "justify-center",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-white",
                "dark:bg-[#1a1c22]",
                "text-gray-900",
                "dark:text-white",
                "shadow-[2px_2px_0_0_#111827]",
                "dark:shadow-[2px_2px_0_0_#000]",
                "hover:bg-yellow-100",
                "dark:hover:bg-yellow-950/30",
                "hover:-translate-y-0.5",
                "transition-all",
                "cursor-pointer",
              )}
              title="Edit Halaman"
            >
              <Pencil className={cn("h-4", "w-4")} />
            </button>
          )}

          {/* Download button */}
          {isDone ? (
            <button
              type="button"
              onClick={() => onDownloadFile(item)}
              className={cn(
                "inline-flex",
                "items-center",
                "gap-1.5",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                formatName.toLowerCase() === "xlsx"
                  ? "bg-emerald-400 hover:bg-emerald-500 text-gray-900"
                  : "bg-yellow-400 hover:bg-yellow-500 text-gray-900",
                "px-4",
                "py-2",
                "text-xs",
                "font-black",
                "shadow-[2px_2px_0_0_#111827]",
                "hover:-translate-y-0.5",
                "transition-all",
                "cursor-pointer",
              )}
            >
              <Download className={cn("h-3.5", "w-3.5")} />
              <span>Download {formatName}</span>
            </button>
          ) : isConverting ? (
            <span
              className={cn(
                "flex",
                "items-center",
                "gap-1.5",
                "text-xs",
                "font-bold",
                "text-gray-500",
                "px-3",
                "py-2",
              )}
            >
              <Loader2 className={cn("h-3.5", "w-3.5", "animate-spin")} />
              Processing
            </span>
          ) : null}
        </div>
      </div>

      {/* Expanded grid for multi-page PDF */}
      {isDone && item.isExpanded && item.result && (
        <div
          className={cn(
            "border-t-2",
            "border-gray-100",
            "dark:border-gray-800",
            "bg-gray-50/60",
            "dark:bg-[#121316]",
            "p-3",
            "flex",
            "flex-wrap",
            "gap-2",
          )}
        >
          {item.result.pages.map((p: ConvertedPage) => (
            <div
              key={p.fileName}
              className={cn(
                "flex",
                "items-center",
                "gap-2",
                "rounded-xl",
                "border",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-white",
                "dark:bg-[#1a1c22]",
                "p-1.5",
                "pr-2",
                "shadow-xs",
              )}
            >
              <img
                src={p.previewUrl}
                alt={p.fileName}
                onClick={() => onPreviewPage?.(p)}
                className={cn(
                  "h-9",
                  "w-7",
                  "rounded",
                  "object-contain",
                  "cursor-pointer",
                  "border",
                  "border-gray-200",
                  "bg-white",
                )}
              />
              <span
                className={cn(
                  "text-[11px]",
                  "font-bold",
                  "text-gray-800",
                  "dark:text-gray-200",
                )}
              >
                P.{p.pageNumber}
              </span>

              {/* Edit button with pencil icon */}
              <button
                type="button"
                onClick={() => onEditPage?.(item.id, p)}
                className={cn(
                  "rounded-md",
                  "border",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "p-1",
                  "hover:bg-yellow-400",
                  "dark:hover:bg-yellow-500",
                  "dark:text-gray-200",
                  "dark:hover:text-gray-900",
                  "transition-colors",
                  "cursor-pointer",
                )}
                title="Edit Halaman"
              >
                <Pencil className={cn("h-3", "w-3")} />
              </button>

              {/* Download single page */}
              {onDownloadSinglePage && (
                <button
                  type="button"
                  onClick={() => onDownloadSinglePage(p)}
                  className={cn(
                    "rounded-md",
                    "border",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "p-1",
                    "hover:bg-yellow-400",
                    "dark:hover:bg-yellow-500",
                    "dark:text-gray-200",
                    "dark:hover:text-gray-900",
                    "transition-colors",
                    "cursor-pointer",
                  )}
                  title="Download Page"
                >
                  <Download className={cn("h-3", "w-3")} />
                </button>
              )}

              {/* Delete single page */}
              {onDeletePage && (
                <button
                  type="button"
                  onClick={() => onDeletePage(p)}
                  className={cn(
                    "rounded-md",
                    "border",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "p-1",
                    "text-rose-600",
                    "dark:text-rose-400",
                    "hover:bg-rose-100",
                    "dark:hover:bg-rose-950/40",
                    "transition-colors",
                    "cursor-pointer",
                  )}
                  title="Hapus Halaman Ini (Tidak Diunduh)"
                >
                  <Trash2 className={cn("h-3", "w-3")} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface PdfBatchActionBarProps {
  totalFiles: number;
  totalPages: number;
  formatName: string;
  onAddFiles: () => void;
  onDownloadAllZip: () => void;
}

export function PdfBatchActionBar({
  totalFiles,
  totalPages,
  formatName,
  onAddFiles,
  onDownloadAllZip,
}: PdfBatchActionBarProps) {
  if (totalFiles <= 0) return null;

  return (
    <div
      className={cn(
        "sticky",
        "bottom-6",
        "z-20",
        "rounded-3xl",
        "border-3",
        "border-gray-900",
        "dark:border-gray-700",
        "bg-white/95",
        "dark:bg-[#16181d]/95",
        "backdrop-blur-md",
        "p-4",
        "sm:p-5",
        "shadow-[6px_6px_0_0_#111827]",
        "dark:shadow-[6px_6px_0_0_#000]",
        "mt-6",
      )}
    >
      <div
        className={cn(
          "flex",
          "flex-col",
          "sm:flex-row",
          "items-center",
          "justify-between",
          "gap-4",
        )}
      >
        <div className={cn("flex", "items-center", "gap-2")}>
          <CheckCircle2
            className={cn("h-5", "w-5", "text-emerald-500", "shrink-0")}
          />
          <p
            className={cn(
              "text-xs",
              "font-bold",
              "text-gray-700",
              "dark:text-gray-300",
            )}
          >
            {totalFiles} {totalFiles === 1 ? "file" : "files"} • {totalPages}{" "}
            {formatName.toUpperCase()}{" "}
            {formatName.toLowerCase() === "xlsx"
              ? totalPages === 1
                ? "spreadsheet"
                : "spreadsheets"
              : totalPages === 1
                ? "image"
                : "images"}{" "}
            ready
          </p>
        </div>

        <div
          className={cn("flex", "items-center", "gap-3", "w-full", "sm:w-auto")}
        >
          <button
            type="button"
            onClick={onAddFiles}
            className={cn(
              "inline-flex",
              "items-center",
              "justify-center",
              "h-10",
              "rounded-xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-white",
              "dark:bg-[#1e222a]",
              "px-5",
              "text-xs",
              "font-black",
              "text-gray-900",
              "dark:text-white",
              "shadow-[3px_3px_0_0_#111827]",
              "dark:shadow-[3px_3px_0_0_#000]",
              "hover:bg-gray-100",
              "dark:hover:bg-[#252a34]",
              "hover:-translate-y-0.5",
              "transition-all",
              "cursor-pointer",
            )}
          >
            Add
          </button>

          <button
            type="button"
            onClick={onDownloadAllZip}
            className={cn(
              "flex-1",
              "sm:flex-none",
              "inline-flex",
              "items-center",
              "justify-center",
              "gap-2",
              "h-10",
              "rounded-xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-emerald-400",
              "px-6",
              "text-xs",
              "sm:text-sm",
              "font-black",
              "text-gray-900",
              "shadow-[3px_3px_0_0_#111827]",
              "dark:shadow-[3px_3px_0_0_#000]",
              "hover:-translate-y-0.5",
              "hover:bg-emerald-500",
              "transition-all",
              "cursor-pointer",
            )}
          >
            <FileArchive className={cn("h-4", "w-4")} />
            Download All as ZIP (.zip)
          </button>
        </div>
      </div>
    </div>
  );
}
