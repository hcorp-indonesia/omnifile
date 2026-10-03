import {
  base64ToPdfBlob,
  downloadPdfBlob,
  removePdfPagesViaBackend,
  type RemovePdfResult,
} from "@/lib/pdf-remove-api";
import { cn } from "@/lib/utils";
import { FileDropzone } from "@/pages/pdf/components/file-dropzone";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileMinus,
  FileText,
  FileX,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
}

interface PageThumbnail {
  pageNumber: number;
  thumbnailUrl: string | null;
  isLoading: boolean;
}

export default function RemovePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState<string>("");
  const [outputFileName, setOutputFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ percent: number; phase: string }>({
    percent: 0,
    phase: "uploading",
  });
  const [result, setResult] = useState<RemovePdfResult | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);

  const scrollThumbnails = (direction: "left" | "right") => {
    if (thumbnailsContainerRef.current) {
      const scrollAmount = direction === "left" ? -350 : 350;
      thumbnailsContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Convert Set of page numbers to comma-separated range string (e.g. "1-3, 5, 8")
  const pagesToRangeString = (pagesSet: Set<number>): string => {
    if (pagesSet.size === 0) return "";
    const sorted = Array.from(pagesSet).sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = sorted[i];
        end = sorted[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(", ");
  };

  // Parse comma-separated range string to Set of page numbers
  const parseRangeStringToPages = (
    str: string,
    maxPages: number,
  ): Set<number> => {
    const set = new Set<number>();
    const parts = str.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (trimmed.includes("-")) {
        const [startStr, endStr] = trimmed.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start > 0) {
          const from = Math.min(start, end);
          const to = Math.min(Math.max(start, end), maxPages);
          for (let p = from; p <= to; p++) {
            set.add(p);
          }
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num > 0 && num <= maxPages) {
          set.add(num);
        }
      }
    }
    return set;
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a valid PDF file");
      return;
    }

    setFile(selected);
    setOutputFileName(selected.name.replace(/\.pdf$/i, "") + "_pages_removed");
    setResult(null);
    setDeletedPages(new Set());
    setRangeInput("");
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const count = pdfDoc.numPages;
      setTotalPages(count);

      const initialThumbs: PageThumbnail[] = [];
      for (let i = 1; i <= count; i++) {
        initialThumbs.push({
          pageNumber: i,
          thumbnailUrl: null,
          isLoading: true,
        });
      }
      setThumbnails(initialThumbs);

      // Render thumbnails asynchronously in background
      renderThumbnails(pdfDoc, count);
      toast.success(`Loaded PDF with ${count} pages`);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse PDF document");
    }
  };

  const renderThumbnails = async (pdfDoc: any, count: number) => {
    for (let i = 1; i <= count; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        // Render at high resolution so text, barcodes, and details are crisp and clear
        const unscaledViewport = page.getViewport({ scale: 1 });
        const targetWidth = 600;
        const scale = Math.max(1.0, targetWidth / unscaledViewport.width);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d", { alpha: false });
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({
            canvasContext: ctx,
            viewport: viewport,
          }).promise;
          const url = canvas.toDataURL("image/jpeg", 0.92);
          setThumbnails((prev) =>
            prev.map((t) =>
              t.pageNumber === i
                ? { ...t, thumbnailUrl: url, isLoading: false }
                : t,
            ),
          );
        }
      } catch {
        setThumbnails((prev) =>
          prev.map((t) =>
            t.pageNumber === i ? { ...t, isLoading: false } : t,
          ),
        );
      }
    }
  };

  const togglePageDeletion = (pageNum: number) => {
    setDeletedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      setRangeInput(pagesToRangeString(next));
      return next;
    });
  };

  const handleRangeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRangeInput(val);
    const parsed = parseRangeStringToPages(val, totalPages);
    setDeletedPages(parsed);
  };

  const clearAll = () => {
    setFile(null);
    setTotalPages(0);
    setThumbnails([]);
    setDeletedPages(new Set());
    setRangeInput("");
    setResult(null);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  const handleRemovePages = async () => {
    if (!file) {
      toast.error("Please upload a PDF document first");
      return;
    }

    if (deletedPages.size === 0) {
      toast.error("Please select at least one page to remove");
      return;
    }

    if (deletedPages.size >= totalPages) {
      toast.error("You cannot remove all pages. At least 1 page must remain.");
      return;
    }

    setIsProcessing(true);
    setProgress({ percent: 0, phase: "uploading" });

    try {
      const pagesString = pagesToRangeString(deletedPages);
      const cleanName = outputFileName.trim().replace(/\.pdf$/i, "");
      const finalFileName = cleanName ? `${cleanName}.pdf` : undefined;

      const res = await removePdfPagesViaBackend(
        file,
        {
          pages: pagesString,
          output_file_name: finalFileName,
        },
        (percent) => {
          if (percent < 90) {
            setProgress({ percent, phase: "uploading" });
          } else {
            setProgress({ percent: 90, phase: "processing" });
          }
        },
      );

      setProgress({ percent: 100, phase: "completed" });
      setResult(res);

      const blob = base64ToPdfBlob(res.file_base64);
      const blobUrl = URL.createObjectURL(blob);
      setPreviewBlobUrl(blobUrl);

      toast.success(
        `Successfully removed ${res.removed_pages_count} page${res.removed_pages_count > 1 ? "s" : ""}!`,
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to remove pages from PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResult = () => {
    if (!result) return;
    const blob = base64ToPdfBlob(result.file_base64);
    downloadPdfBlob(blob, result.file_name);
  };

  const remainingPagesCount = totalPages - deletedPages.size;
  const isAllPagesSelected = totalPages > 0 && deletedPages.size >= totalPages;
  const isNoPagesSelected = deletedPages.size === 0;

  return (
    <div className={cn("max-w-5xl", "mx-auto", "space-y-6", "py-4")}>
      {/* Top Header Navigation */}
      <div className={cn("flex", "items-center", "justify-between")}>
        <Link
          to="/pdf"
          className={cn(
            "inline-flex",
            "items-center",
            "gap-2",
            "rounded-xl",
            "border-3",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-white",
            "dark:bg-[#1a1c24]",
            "px-4",
            "py-2",
            "text-sm",
            "font-bold",
            "shadow-[3px_3px_0_0_#111827]",
            "dark:shadow-[3px_3px_0_0_#000]",
            "transition-all",
            "hover:-translate-y-0.5",
            "hover:shadow-[4px_4px_0_0_#111827]",
          )}
        >
          <ArrowLeft className={cn("h-4", "w-4")} />
          Back
        </Link>

        {file && (
          <button
            type="button"
            onClick={clearAll}
            disabled={isProcessing}
            className={cn(
              "inline-flex",
              "items-center",
              "gap-1.5",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-gray-100",
              "dark:bg-[#1a1c24]",
              "px-3.5",
              "py-2",
              "text-xs",
              "font-bold",
              "text-gray-700",
              "dark:text-gray-300",
              "shadow-[2px_2px_0_0_#111827]",
              "dark:shadow-[2px_2px_0_0_#000]",
              "hover:bg-gray-200",
              "dark:hover:bg-gray-700",
              "transition-all",
              "cursor-pointer",
            )}
          >
            <RotateCcw className={cn("h-3.5", "w-3.5")} />
            Reset All
          </button>
        )}
      </div>

      {/* Main Upload Dropzone */}
      <FileDropzone
        ref={fileInputRef}
        title="Remove PDF Pages"
        description="Select unwanted pages to delete from your PDF document."
        dropzoneTitle="Select or Drag & Drop PDF to Remove Pages"
        dropzoneSubtitle="Supports documents, forms, scans, reports, and manuals."
        iconBg="bg-red-300"
        icon={<FileMinus className={cn("h-7", "w-7", "text-gray-900")} />}
        onFilesSelected={handleFilesSelected}
        multiple={false}
        disabled={isProcessing}
      />

      {/* Loaded Document Configuration Area */}
      {file && totalPages > 0 && (
        <div className={cn("space-y-6")}>
          {/* File Overview Card */}
          <div
            className={cn(
              "flex",
              "flex-col",
              "sm:flex-row",
              "items-start",
              "sm:items-center",
              "justify-between",
              "gap-4",
              "rounded-2xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-white",
              "dark:bg-[#1a1c24]",
              "p-5",
              "shadow-[4px_4px_0_0_#111827]",
              "dark:shadow-[4px_4px_0_0_#000]",
            )}
          >
            <div className={cn("flex", "items-center", "gap-3.5", "min-w-0")}>
              <div
                className={cn(
                  "flex",
                  "h-12",
                  "w-12",
                  "shrink-0",
                  "items-center",
                  "justify-center",
                  "rounded-xl",
                  "border-2",
                  "border-gray-900",
                  "bg-red-300",
                  "text-gray-900",
                  "shadow-[2px_2px_0_0_#111827]",
                )}
              >
                <FileText className={cn("h-6", "w-6")} />
              </div>
              <div className={cn("min-w-0")}>
                <h3
                  className={cn(
                    "truncate",
                    "text-base",
                    "font-black",
                    "text-gray-900",
                    "dark:text-white",
                  )}
                >
                  {file.name}
                </h3>
                <p
                  className={cn(
                    "text-xs",
                    "font-bold",
                    "text-gray-500",
                    "dark:text-gray-400",
                  )}
                >
                  {totalPages} Total Pages • {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            <div className={cn("flex", "items-center", "gap-2")}>
              <span
                className={cn(
                  "rounded-xl",
                  "border-2",
                  "border-gray-900",
                  "px-3",
                  "py-1.5",
                  "text-xs",
                  "font-black",
                  deletedPages.size > 0
                    ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                )}
              >
                {deletedPages.size} Marked to Remove
              </span>
              <span
                className={cn(
                  "rounded-xl",
                  "border-2",
                  "border-gray-900",
                  "bg-emerald-100",
                  "dark:bg-emerald-950/40",
                  "px-3",
                  "py-1.5",
                  "text-xs",
                  "font-black",
                  "text-emerald-700",
                  "dark:text-emerald-300",
                )}
              >
                {remainingPagesCount} Remaining
              </span>
            </div>
          </div>

          {/* Page Selection Controls & Grid */}
          <div
            className={cn(
              "space-y-6",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-white",
              "dark:bg-[#1a1c24]",
              "p-6",
              "sm:p-8",
              "shadow-[5px_5px_0_0_#111827]",
              "dark:shadow-[5px_5px_0_0_#000]",
            )}
          >
            {/* Header info & range input */}
            <div
              className={cn(
                "flex",
                "flex-col",
                "sm:flex-row",
                "sm:items-center",
                "justify-between",
                "gap-4",
                "border-b-2",
                "border-gray-200",
                "dark:border-gray-800",
                "pb-4",
              )}
            >
              <div>
                <h3
                  className={cn(
                    "text-lg",
                    "font-black",
                    "text-gray-900",
                    "dark:text-white",
                  )}
                >
                  Delete
                </h3>
                <p
                  className={cn(
                    "text-xs",
                    "font-bold",
                    "text-gray-500",
                    "dark:text-gray-400",
                  )}
                >
                  Click pages below to mark them for removal, or type specific
                  page numbers.
                </p>
              </div>

              {deletedPages.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDeletedPages(new Set());
                    setRangeInput("");
                  }}
                  className={cn(
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-gray-100",
                    "dark:bg-gray-800",
                    "px-3",
                    "py-1",
                    "text-xs",
                    "font-bold",
                    "text-gray-700",
                    "dark:text-gray-300",
                    "hover:bg-gray-200",
                    "transition-all",
                    "cursor-pointer",
                  )}
                >
                  Unmark All
                </button>
              )}
            </div>

            {/* Range Input Field */}
            <div className={cn("space-y-1.5")}>
              <label
                htmlFor="range-input"
                className={cn(
                  "block",
                  "text-xs",
                  "font-black",
                  "text-gray-700",
                  "dark:text-gray-300",
                )}
              >
                Page Numbers to Remove
              </label>
              <input
                id="range-input"
                type="text"
                value={rangeInput}
                onChange={handleRangeInputChange}
                placeholder="e.g. 2, 4-6"
                className={cn(
                  "w-full",
                  "rounded-xl",
                  "border-2",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "bg-[#fdfbf7]",
                  "dark:bg-[#12141a]",
                  "px-3.5",
                  "py-2",
                  "text-xs",
                  "sm:text-sm",
                  "font-bold",
                  "text-gray-900",
                  "dark:text-white",
                  "shadow-[2px_2px_0_0_#111827]",
                  "dark:shadow-[2px_2px_0_0_#000]",
                  "focus:outline-none",
                  "focus:ring-2",
                  "focus:ring-red-400",
                )}
              />
              <p
                className={cn(
                  "text-[11px]",
                  "font-bold",
                  "text-gray-500",
                  "mt-1",
                )}
              >
                Example:{" "}
                <span className={cn("text-red-600", "font-black")}>2, 4-6</span>{" "}
                removes pages 2, 4, 5, and 6 from the document.
              </p>
            </div>

            {/* Status alerts */}
            {isAllPagesSelected && (
              <div
                className={cn(
                  "flex",
                  "items-center",
                  "gap-2.5",
                  "rounded-xl",
                  "border-2",
                  "border-red-900",
                  "bg-red-100",
                  "dark:bg-red-950/50",
                  "p-3",
                  "text-xs",
                  "font-black",
                  "text-red-700",
                  "dark:text-red-300",
                )}
              >
                <AlertTriangle className={cn("h-4", "w-4", "shrink-0")} />
                <span>
                  You cannot delete all pages. At least 1 page must be retained
                  in the resulting PDF.
                </span>
              </div>
            )}

            {/* Visual Page Thumbnails Horizontal Scroll Row */}
            <div className={cn("pt-2", "space-y-3")}>
              <div
                className={cn(
                  "flex",
                  "items-center",
                  "justify-between",
                  "gap-2",
                )}
              >
                <span
                  className={cn(
                    "text-xs",
                    "font-bold",
                    "text-gray-500",
                    "dark:text-gray-400",
                  )}
                >
                  Scroll to the right to view all pages ({thumbnails.length}{" "}
                  total)
                </span>
                {thumbnails.length > 2 && (
                  <div className={cn("flex", "items-center", "gap-1.5")}>
                    <button
                      type="button"
                      onClick={() => scrollThumbnails("left")}
                      title="Scroll Left"
                      className={cn(
                        "flex",
                        "h-8",
                        "w-8",
                        "items-center",
                        "justify-center",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "dark:border-gray-700",
                        "bg-white",
                        "dark:bg-gray-800",
                        "text-gray-900",
                        "dark:text-white",
                        "shadow-[2px_2px_0_0_#111827]",
                        "dark:shadow-[2px_2px_0_0_#000]",
                        "hover:-translate-y-0.5",
                        "transition-all",
                        "cursor-pointer",
                      )}
                    >
                      <ChevronLeft className={cn("h-4", "w-4")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollThumbnails("right")}
                      title="Scroll Right"
                      className={cn(
                        "flex",
                        "h-8",
                        "w-8",
                        "items-center",
                        "justify-center",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "dark:border-gray-700",
                        "bg-white",
                        "dark:bg-gray-800",
                        "text-gray-900",
                        "dark:text-white",
                        "shadow-[2px_2px_0_0_#111827]",
                        "dark:shadow-[2px_2px_0_0_#000]",
                        "hover:-translate-y-0.5",
                        "transition-all",
                        "cursor-pointer",
                      )}
                    >
                      <ChevronRight className={cn("h-4", "w-4")} />
                    </button>
                  </div>
                )}
              </div>

              <div
                ref={thumbnailsContainerRef}
                className={cn(
                  "flex",
                  "gap-4",
                  "overflow-x-auto",
                  "pb-4",
                  "pt-1",
                  "px-1",
                  "scroll-smooth",
                )}
              >
                {thumbnails.map((t) => {
                  const isMarkedForDeletion = deletedPages.has(t.pageNumber);
                  return (
                    <div
                      key={t.pageNumber}
                      onClick={() => togglePageDeletion(t.pageNumber)}
                      className={cn(
                        "group",
                        "relative",
                        "flex",
                        "flex-col",
                        "w-48",
                        "sm:w-56",
                        "shrink-0",
                        "rounded-2xl",
                        "border-3",
                        "overflow-hidden",
                        "transition-all",
                        "cursor-pointer",
                        "hover:-translate-y-1",
                        isMarkedForDeletion
                          ? "border-red-600 bg-red-100 dark:bg-red-950/40 shadow-[4px_4px_0_0_#dc2626]"
                          : "border-gray-900 dark:border-gray-700 bg-white dark:bg-[#12141a] shadow-[3px_3px_0_0_#111827] dark:shadow-[3px_3px_0_0_#000]",
                      )}
                    >
                      {/* Page Header Bar */}
                      <div
                        className={cn(
                          "flex",
                          "items-center",
                          "justify-between",
                          "px-3",
                          "py-1.5",
                          "border-b-2",
                          isMarkedForDeletion
                            ? "border-red-500 bg-red-200 dark:bg-red-900/60"
                            : "border-gray-900 dark:border-gray-700 bg-gray-50 dark:bg-gray-800",
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs",
                            "font-black",
                            isMarkedForDeletion
                              ? "text-red-700 dark:text-red-300 line-through"
                              : "text-gray-900 dark:text-white",
                          )}
                        >
                          Page {t.pageNumber}
                        </span>
                        <div
                          className={cn(
                            "flex",
                            "h-5",
                            "items-center",
                            "gap-1",
                            "rounded-md",
                            "px-1.5",
                            "text-[10px]",
                            "font-black",
                            isMarkedForDeletion
                              ? "bg-red-600 text-white"
                              : "bg-emerald-500 text-white",
                          )}
                        >
                          {isMarkedForDeletion ? (
                            <>
                              <Trash2 className={cn("h-3", "w-3")} />
                              <span>Remove</span>
                            </>
                          ) : (
                            <>
                              <Check className={cn("h-3", "w-3")} />
                              <span>Keep</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Thumbnail Preview Area */}
                      <div
                        className={cn(
                          "relative",
                          "aspect-3/4",
                          "w-full",
                          "flex",
                          "items-center",
                          "justify-center",
                          "p-2",
                          isMarkedForDeletion && "opacity-40 grayscale",
                        )}
                      >
                        {t.isLoading ? (
                          <div
                            className={cn(
                              "flex",
                              "flex-col",
                              "items-center",
                              "gap-1.5",
                              "text-gray-400",
                            )}
                          >
                            <Loader2
                              className={cn("h-5", "w-5", "animate-spin")}
                            />
                            <span className={cn("text-[10px]", "font-bold")}>
                              Rendering...
                            </span>
                          </div>
                        ) : t.thumbnailUrl ? (
                          <img
                            src={t.thumbnailUrl}
                            alt={`Page ${t.pageNumber}`}
                            className={cn(
                              "h-full",
                              "w-full",
                              "object-contain",
                              "rounded-lg",
                              "shadow-xs",
                            )}
                          />
                        ) : (
                          <FileText
                            className={cn("h-8", "w-8", "text-gray-400")}
                          />
                        )}

                        {/* Large delete overlay icon when marked */}
                        {isMarkedForDeletion && (
                          <div
                            className={cn(
                              "absolute",
                              "inset-0",
                              "flex",
                              "items-center",
                              "justify-center",
                              "bg-red-500/20",
                            )}
                          >
                            <div
                              className={cn(
                                "flex",
                                "h-10",
                                "w-10",
                                "items-center",
                                "justify-center",
                                "rounded-full",
                                "bg-red-600",
                                "text-white",
                                "shadow-lg",
                              )}
                            >
                              <FileX className={cn("h-6", "w-6")} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Output Filename & Main Action Button */}
          <div
            className={cn(
              "space-y-4",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-white",
              "dark:bg-[#1a1c24]",
              "p-6",
              "shadow-[5px_5px_0_0_#111827]",
              "dark:shadow-[5px_5px_0_0_#000]",
            )}
          >
            <div className={cn("space-y-1.5")}>
              <label
                htmlFor="output-name"
                className={cn(
                  "block",
                  "text-xs",
                  "font-black",
                  "text-gray-700",
                  "dark:text-gray-300",
                )}
              >
                File Name
              </label>
              <div className={cn("relative", "flex", "items-center")}>
                <input
                  id="output-name"
                  type="text"
                  value={outputFileName}
                  onChange={(e) =>
                    setOutputFileName(e.target.value.replace(/\.pdf$/i, ""))
                  }
                  placeholder="document_pages_removed"
                  disabled={isProcessing}
                  className={cn(
                    "w-full",
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-[#fdfbf7]",
                    "dark:bg-[#12141a]",
                    "pl-3.5",
                    "pr-18",
                    "py-2",
                    "text-xs",
                    "sm:text-sm",
                    "font-bold",
                    "text-gray-900",
                    "dark:text-white",
                    "shadow-[2px_2px_0_0_#111827]",
                    "dark:shadow-[2px_2px_0_0_#000]",
                    "focus:outline-none",
                    "focus:ring-2",
                    "focus:ring-red-400",
                  )}
                />
                <span
                  className={cn(
                    "absolute",
                    "right-2.5",
                    "flex",
                    "items-center",
                    "justify-center",
                    "rounded-lg",
                    "border",
                    "border-gray-900/40",
                    "bg-gray-200",
                    "dark:bg-gray-800",
                    "px-2",
                    "py-0.5",
                    "text-[10px]",
                    "font-black",
                    "text-gray-700",
                    "dark:text-gray-300",
                    "select-none",
                    "pointer-events-none",
                  )}
                >
                  .pdf
                </span>
              </div>
            </div>

            {/* Action Button & Progress */}
            {isProcessing ? (
              <div
                className={cn(
                  "space-y-3",
                  "rounded-2xl",
                  "border-2",
                  "border-gray-900",
                  "bg-red-50",
                  "dark:bg-red-950/30",
                  "p-5",
                )}
              >
                <div
                  className={cn(
                    "flex",
                    "items-center",
                    "justify-between",
                    "text-xs",
                    "font-black",
                    "text-gray-900",
                    "dark:text-white",
                  )}
                >
                  <div className={cn("flex", "items-center", "gap-2")}>
                    <Loader2
                      className={cn(
                        "h-4",
                        "w-4",
                        "animate-spin",
                        "text-red-600",
                      )}
                    />
                    <span>
                      {progress.phase === "uploading"
                        ? "Uploading PDF..."
                        : "Deleting unwanted pages via pdfcpu..."}
                    </span>
                  </div>
                  <span>{progress.percent}%</span>
                </div>
                <div
                  className={cn(
                    "h-3",
                    "w-full",
                    "overflow-hidden",
                    "rounded-full",
                    "border-2",
                    "border-gray-900",
                    "bg-gray-200",
                  )}
                >
                  <div
                    className={cn(
                      "h-full",
                      "bg-red-500",
                      "transition-all",
                      "duration-300",
                    )}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRemovePages}
                disabled={isNoPagesSelected || isAllPagesSelected}
                className={cn(
                  "flex",
                  "w-full",
                  "items-center",
                  "justify-center",
                  "gap-2.5",
                  "rounded-2xl",
                  "border-3",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "py-3.5",
                  "text-sm",
                  "sm:text-base",
                  "font-black",
                  "transition-all",
                  "cursor-pointer",
                  isNoPagesSelected || isAllPagesSelected
                    ? "bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed opacity-60 shadow-none"
                    : "bg-red-400 text-gray-900 shadow-[4px_4px_0_0_#111827] dark:shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#111827]",
                )}
              >
                <Trash2 className={cn("h-5", "w-5")} />
                {isNoPagesSelected
                  ? "Remove"
                  : isAllPagesSelected
                    ? "Cannot Delete All Pages"
                    : `Remove ${deletedPages.size} Page${deletedPages.size > 1 ? "s" : ""} from PDF`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div
          className={cn(
            "space-y-5",
            "rounded-3xl",
            "border-3",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-emerald-50",
            "dark:bg-emerald-950/20",
            "p-6",
            "sm:p-8",
            "shadow-[5px_5px_0_0_#111827]",
            "dark:shadow-[5px_5px_0_0_#000]",
          )}
        >
          <div className={cn("flex", "items-center", "gap-3")}>
            <div
              className={cn(
                "flex",
                "h-12",
                "w-12",
                "shrink-0",
                "items-center",
                "justify-center",
                "rounded-2xl",
                "border-2",
                "border-gray-900",
                "bg-emerald-300",
                "text-gray-900",
                "shadow-[2px_2px_0_0_#111827]",
              )}
            >
              <CheckCircle2 className={cn("h-6", "w-6")} />
            </div>
            <div>
              <h3
                className={cn(
                  "text-lg",
                  "font-black",
                  "text-gray-900",
                  "dark:text-white",
                )}
              >
                Pages Removed Successfully!
              </h3>
              <p
                className={cn(
                  "text-xs",
                  "font-bold",
                  "text-gray-600",
                  "dark:text-gray-400",
                )}
              >
                Your cleaned PDF document is ready for preview or download.
              </p>
            </div>
          </div>

          {/* Details summary */}
          <div
            className={cn(
              "grid",
              "grid-cols-2",
              "sm:grid-cols-4",
              "gap-3",
              "rounded-2xl",
              "border-2",
              "border-gray-900",
              "bg-white",
              "dark:bg-[#1a1c24]",
              "p-4",
            )}
          >
            <div>
              <span
                className={cn(
                  "block",
                  "text-[10px]",
                  "font-black",
                  "text-gray-400",
                )}
              >
                Original Pages
              </span>
              <span
                className={cn(
                  "text-sm",
                  "font-black",
                  "text-gray-900",
                  "dark:text-white",
                )}
              >
                {result.original_pages} pages
              </span>
            </div>
            <div>
              <span
                className={cn(
                  "block",
                  "text-[10px]",
                  "font-black",
                  "text-gray-400",
                )}
              >
                Removed
              </span>
              <span className={cn("text-sm", "font-black", "text-red-600")}>
                {result.removed_pages_count} pages
              </span>
            </div>
            <div>
              <span
                className={cn(
                  "block",
                  "text-[10px]",
                  "font-black",
                  "text-gray-400",
                )}
              >
                Remaining Pages
              </span>
              <span className={cn("text-sm", "font-black", "text-emerald-600")}>
                {result.remaining_pages} pages
              </span>
            </div>
            <div>
              <span
                className={cn(
                  "block",
                  "text-[10px]",
                  "font-black",
                  "text-gray-400",
                )}
              >
                New File Size
              </span>
              <span
                className={cn(
                  "text-sm",
                  "font-black",
                  "text-gray-900",
                  "dark:text-white",
                )}
              >
                {formatFileSize(result.file_size)}
              </span>
            </div>
          </div>

          {/* Download & Preview Actions */}
          <div className={cn("flex", "flex-col", "sm:flex-row", "gap-3")}>
            <button
              type="button"
              onClick={handleDownloadResult}
              className={cn(
                "flex",
                "flex-1",
                "items-center",
                "justify-center",
                "gap-2",
                "rounded-2xl",
                "border-3",
                "border-gray-900",
                "bg-yellow-300",
                "px-5",
                "py-3.5",
                "text-sm",
                "font-black",
                "text-gray-900",
                "shadow-[4px_4px_0_0_#111827]",
                "hover:-translate-y-0.5",
                "hover:shadow-[5px_5px_0_0_#111827]",
                "transition-all",
                "cursor-pointer",
              )}
            >
              <Download className={cn("h-4", "w-4")} />
              Download
            </button>

            {previewBlobUrl && (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className={cn(
                  "flex",
                  "items-center",
                  "justify-center",
                  "gap-2",
                  "rounded-2xl",
                  "border-3",
                  "border-gray-900",
                  "bg-white",
                  "dark:bg-[#1a1c24]",
                  "px-5",
                  "py-3.5",
                  "text-sm",
                  "font-black",
                  "text-gray-900",
                  "dark:text-white",
                  "shadow-[4px_4px_0_0_#111827]",
                  "dark:shadow-[4px_4px_0_0_#000]",
                  "hover:-translate-y-0.5",
                  "transition-all",
                  "cursor-pointer",
                )}
              >
                <Eye className={cn("h-4", "w-4")} />
                Preview
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className={cn("hidden")}
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
          }
        }}
      />

      {/* Fullscreen PDF Preview Modal */}
      {isPreviewOpen && previewBlobUrl && (
        <div
          className={cn(
            "fixed",
            "inset-0",
            "z-50",
            "flex",
            "items-center",
            "justify-center",
            "bg-black/70",
            "p-4",
            "backdrop-blur-xs",
          )}
        >
          <div
            className={cn(
              "flex",
              "flex-col",
              "h-[90vh]",
              "w-full",
              "max-w-4xl",
              "rounded-3xl",
              "border-4",
              "border-gray-900",
              "bg-white",
              "dark:bg-[#1a1c24]",
              "overflow-hidden",
              "shadow-[8px_8px_0_0_#111827]",
            )}
          >
            <div
              className={cn(
                "flex",
                "items-center",
                "justify-between",
                "border-b-3",
                "border-gray-900",
                "bg-red-300",
                "px-5",
                "py-3",
              )}
            >
              <div className={cn("flex", "items-center", "gap-2")}>
                <FileText className={cn("h-5", "w-5", "text-gray-900")} />
                <span className={cn("text-sm", "font-black", "text-gray-900")}>
                  PDF Preview ({result?.remaining_pages} pages remaining)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className={cn(
                  "flex",
                  "h-8",
                  "w-8",
                  "items-center",
                  "justify-center",
                  "rounded-xl",
                  "border-2",
                  "border-gray-900",
                  "bg-white",
                  "shadow-[2px_2px_0_0_#111827]",
                  "hover:-translate-y-0.5",
                  "transition-all",
                  "cursor-pointer",
                )}
              >
                <X className={cn("h-4", "w-4", "text-gray-900")} />
              </button>
            </div>
            <div
              className={cn(
                "flex-1",
                "w-full",
                "bg-gray-100",
                "dark:bg-gray-900",
              )}
            >
              <iframe
                src={previewBlobUrl}
                title="PDF Preview"
                className={cn("h-full", "w-full", "border-0")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
