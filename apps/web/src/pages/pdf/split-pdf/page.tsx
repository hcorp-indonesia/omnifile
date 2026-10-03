import {
  base64ToBlob,
  downloadBlob,
  splitPdfViaBackend,
  type SplitPdfResult,
} from "@/lib/pdf-split-api";
import { cn } from "@/lib/utils";
import { FileDropzone } from "@/pages/pdf/components/file-dropzone";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Layers,
  Loader2,
  RotateCcw,
  Scissors,
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

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState<string>("");
  const [splitMode, setSplitMode] = useState<"extract" | "split_every">(
    "extract",
  );
  const [mergeExtracted, setMergeExtracted] = useState<boolean>(true);
  const [everyN, setEveryN] = useState<number>(1);
  const [outputFileName, setOutputFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ percent: number; phase: string }>({
    percent: 0,
    phase: "uploading",
  });
  const [result, setResult] = useState<SplitPdfResult | null>(null);
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
    setOutputFileName(selected.name.replace(/\.pdf$/i, "") + "_split");
    setResult(null);
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

      // Initialize selected pages (all selected by default)
      const allPages = new Set<number>();
      const initialThumbs: PageThumbnail[] = [];
      for (let i = 1; i <= count; i++) {
        allPages.add(i);
        initialThumbs.push({
          pageNumber: i,
          thumbnailUrl: null,
          isLoading: true,
        });
      }
      setSelectedPages(allPages);
      setRangeInput(pagesToRangeString(allPages));
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

  const togglePageSelection = (pageNum: number) => {
    setSelectedPages((prev) => {
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
    setSelectedPages(parsed);
  };

  const clearAll = () => {
    setFile(null);
    setTotalPages(0);
    setThumbnails([]);
    setSelectedPages(new Set());
    setRangeInput("");
    setResult(null);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  const handleSplit = async () => {
    if (!file) {
      toast.error("Please upload a PDF document first");
      return;
    }

    if (splitMode === "extract" && selectedPages.size === 0) {
      toast.error("Please select at least one page to extract");
      return;
    }

    setIsProcessing(true);
    setProgress({ percent: 0, phase: "uploading" });

    try {
      const pagesString = pagesToRangeString(selectedPages);
      const ext = splitMode === "extract" && mergeExtracted ? ".pdf" : ".zip";
      const cleanBase = outputFileName.trim().replace(/\.(pdf|zip)$/i, "");
      const finalName = (cleanBase || "split_document") + ext;

      const res = await splitPdfViaBackend(
        file,
        {
          mode: splitMode,
          pages: pagesString,
          every_n: everyN,
          merge_extracted: mergeExtracted,
          output_file_name: finalName,
        },
        (uploadPercent) => {
          setProgress({
            percent: uploadPercent,
            phase: uploadPercent >= 100 ? "splitting" : "uploading",
          });
        },
      );

      setResult(res);

      if (!res.is_zip) {
        const blob = base64ToBlob(res.file_base64, "application/pdf");
        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
      }

      toast.success(
        res.is_zip
          ? `Successfully generated ZIP with ${res.file_count} documents!`
          : `Successfully extracted ${selectedPages.size} pages!`,
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to split PDF document");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const mimeType = result.is_zip ? "application/zip" : "application/pdf";
    const blob = base64ToBlob(result.file_base64, mimeType);
    downloadBlob(blob, result.file_name);
    toast.success("Download started!");
  };

  return (
    <div className={cn("mx-auto", "max-w-5xl", "space-y-6", "py-4")}>
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

      {/* Hero & Upload Dropzone */}
      <FileDropzone
        ref={fileInputRef}
        title="Split PDF Document"
        description="Extract specific page ranges or split your PDF into separate standalone documents."
        dropzoneTitle="Select or Drag & Drop PDF to Split"
        dropzoneSubtitle="Supports scanned reports, multi-page brochures, ebooks, and manuals."
        iconBg="bg-pink-300"
        icon={<Scissors className={cn("h-7", "w-7", "text-gray-900")} />}
        onFilesSelected={handleFilesSelected}
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
                  "bg-pink-300",
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
                  {totalPages} Pages • {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            <div className={cn("flex", "items-center", "gap-2")}>
              <span
                className={cn(
                  "rounded-lg",
                  "border-2",
                  "border-gray-900",
                  "bg-yellow-300",
                  "px-2.5",
                  "py-1",
                  "text-xs",
                  "font-black",
                  "text-gray-900",
                )}
              >
                {splitMode === "extract"
                  ? `${selectedPages.size} / ${totalPages} Selected`
                  : `Split every ${everyN} pages`}
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            className={cn(
              "grid",
              "grid-cols-1",
              "sm:grid-cols-2",
              "gap-3",
              "rounded-2xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-gray-100",
              "dark:bg-[#12141a]",
              "p-2",
            )}
          >
            <button
              type="button"
              onClick={() => setSplitMode("extract")}
              className={cn(
                "flex",
                "items-center",
                "justify-center",
                "gap-2",
                "rounded-xl",
                "border-2",
                "py-3",
                "text-sm",
                "font-black",
                "transition-all",
                "cursor-pointer",
                splitMode === "extract"
                  ? "border-gray-900 bg-pink-300 text-gray-900 shadow-[3px_3px_0_0_#111827]"
                  : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
              )}
            >
              <Scissors className={cn("h-4", "w-4")} />
              Extract Custom Pages
            </button>

            <button
              type="button"
              onClick={() => setSplitMode("split_every")}
              className={cn(
                "flex",
                "items-center",
                "justify-center",
                "gap-2",
                "rounded-xl",
                "border-2",
                "py-3",
                "text-sm",
                "font-black",
                "transition-all",
                "cursor-pointer",
                splitMode === "split_every"
                  ? "border-gray-900 bg-pink-300 text-gray-900 shadow-[3px_3px_0_0_#111827]"
                  : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
              )}
            >
              <Layers className={cn("h-4", "w-4")} />
              Split in Fixed Intervals
            </button>
          </div>

          {/* Mode Content: Extract Pages */}
          {splitMode === "extract" && (
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
                    Extract
                  </h3>
                  <p
                    className={cn(
                      "text-xs",
                      "font-bold",
                      "text-gray-500",
                      "dark:text-gray-400",
                    )}
                  >
                    Click on any page thumbnail or enter page numbers below.
                  </p>
                </div>
              </div>

              {/* Range Input & Merge Mode Toggle */}
              <div
                className={cn(
                  "grid",
                  "grid-cols-1",
                  "md:grid-cols-2",
                  "gap-4",
                  "pt-1",
                )}
              >
                <div>
                  <label
                    htmlFor="range-input"
                    className={cn(
                      "block",
                      "text-xs",
                      "font-black",
                      "text-gray-700",
                      "dark:text-gray-300",
                      "mb-1.5",
                    )}
                  >
                    Page Range
                  </label>
                  <input
                    id="range-input"
                    type="text"
                    value={rangeInput}
                    onChange={handleRangeInputChange}
                    placeholder="e.g. 1-3, 5, 8-10"
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
                      "focus:ring-pink-400",
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
                    <span className={cn("text-pink-600", "font-black")}>
                      1-3, 5
                    </span>{" "}
                    extracts pages 1, 2, 3, and 5.
                  </p>
                </div>

                <div>
                  <label
                    className={cn(
                      "block",
                      "text-xs",
                      "font-black",
                      "text-gray-700",
                      "dark:text-gray-300",
                      "mb-1.5",
                    )}
                  >
                    Format
                  </label>
                  <div className={cn("grid", "grid-cols-2", "gap-2")}>
                    <button
                      type="button"
                      onClick={() => setMergeExtracted(true)}
                      className={cn(
                        "rounded-xl",
                        "border-2",
                        "p-2",
                        "text-xs",
                        "font-black",
                        "text-center",
                        "transition-all",
                        "cursor-pointer",
                        mergeExtracted
                          ? "border-gray-900 bg-yellow-300 text-gray-900 shadow-[2px_2px_0_0_#111827]"
                          : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
                      )}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => setMergeExtracted(false)}
                      className={cn(
                        "rounded-xl",
                        "border-2",
                        "p-2",
                        "text-xs",
                        "font-black",
                        "text-center",
                        "transition-all",
                        "cursor-pointer",
                        !mergeExtracted
                          ? "border-gray-900 bg-yellow-300 text-gray-900 shadow-[2px_2px_0_0_#111827]"
                          : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
                      )}
                    >
                      Separate
                    </button>
                  </div>
                  <p
                    className={cn(
                      "text-[11px]",
                      "font-bold",
                      "text-gray-500",
                      "mt-1",
                    )}
                  >
                    {mergeExtracted
                      ? "Combines selected pages into 1 ordered PDF."
                      : "Packs each selected page into individual files inside a ZIP."}
                  </p>
                </div>
              </div>

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
                    const isSelected = selectedPages.has(t.pageNumber);
                    return (
                      <div
                        key={t.pageNumber}
                        onClick={() => togglePageSelection(t.pageNumber)}
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
                          isSelected
                            ? "border-gray-900 bg-pink-100 dark:bg-pink-950/40 shadow-[4px_4px_0_0_#111827] dark:shadow-[4px_4px_0_0_#000]"
                            : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 opacity-60 hover:opacity-100",
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
                            isSelected
                              ? "border-gray-900 bg-pink-300 text-gray-900 font-black"
                              : "border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold",
                            "text-xs",
                          )}
                        >
                          <span>#{t.pageNumber}</span>
                          <div
                            className={cn(
                              "flex",
                              "h-5",
                              "w-5",
                              "items-center",
                              "justify-center",
                              "rounded-md",
                              "border-2",
                              "border-gray-900",
                              isSelected
                                ? "bg-emerald-400 text-gray-900"
                                : "bg-white dark:bg-gray-700 text-transparent",
                            )}
                          >
                            <Check
                              className={cn("h-3.5", "w-3.5", "stroke-3")}
                            />
                          </div>
                        </div>

                        {/* Thumbnail Viewport */}
                        <div
                          className={cn(
                            "flex",
                            "items-center",
                            "justify-center",
                            "h-40",
                            "bg-white",
                            "dark:bg-[#12141a]",
                            "p-2",
                          )}
                        >
                          {t.isLoading ? (
                            <Loader2
                              className={cn(
                                "h-6",
                                "w-6",
                                "animate-spin",
                                "text-pink-500",
                              )}
                            />
                          ) : t.thumbnailUrl ? (
                            <img
                              src={t.thumbnailUrl}
                              alt={`Page ${t.pageNumber}`}
                              className={cn(
                                "max-h-full",
                                "max-w-full",
                                "object-contain",
                                "rounded-sm",
                                "border",
                                "border-gray-200",
                                "shadow-xs",
                              )}
                            />
                          ) : (
                            <FileText
                              className={cn("h-10", "w-10", "text-gray-300")}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Mode Content: Split in Fixed Intervals */}
          {splitMode === "split_every" && (
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
              <div>
                <h3
                  className={cn(
                    "text-lg",
                    "font-black",
                    "text-gray-900",
                    "dark:text-white",
                  )}
                >
                  Split into Fixed Intervals
                </h3>
                <p
                  className={cn(
                    "text-xs",
                    "font-bold",
                    "text-gray-500",
                    "dark:text-gray-400",
                  )}
                >
                  Splits the PDF into multiple documents containing a fixed
                  number of pages.
                </p>
              </div>

              <div className={cn("max-w-md", "space-y-2")}>
                <label
                  htmlFor="every-n-input"
                  className={cn(
                    "block",
                    "text-xs",
                    "font-black",
                    "text-gray-700",
                    "dark:text-gray-300",
                  )}
                >
                  Number of Pages
                </label>
                <div className={cn("flex", "items-center", "gap-3")}>
                  <input
                    id="every-n-input"
                    type="number"
                    min={1}
                    max={totalPages}
                    value={everyN}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setEveryN(
                        isNaN(val) || val < 1 ? 1 : Math.min(val, totalPages),
                      );
                    }}
                    className={cn(
                      "w-32",
                      "rounded-xl",
                      "border-2",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "bg-[#fdfbf7]",
                      "dark:bg-[#12141a]",
                      "px-3.5",
                      "py-2",
                      "text-sm",
                      "font-black",
                      "text-gray-900",
                      "dark:text-white",
                      "shadow-[2px_2px_0_0_#111827]",
                      "focus:outline-none",
                      "focus:ring-2",
                      "focus:ring-pink-400",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs",
                      "font-bold",
                      "text-gray-600",
                      "dark:text-gray-400",
                    )}
                  >
                    pages per split
                  </span>
                </div>
              </div>

              {/* Interval calculation preview badge */}
              <div
                className={cn(
                  "rounded-2xl",
                  "border-2",
                  "border-gray-900",
                  "bg-pink-100",
                  "dark:bg-pink-950/30",
                  "p-4",
                  "text-xs",
                  "font-bold",
                  "text-gray-800",
                  "dark:text-gray-200",
                )}
              >
                Splitting every{" "}
                <span
                  className={cn(
                    "font-black",
                    "text-pink-700",
                    "dark:text-pink-400",
                  )}
                >
                  {everyN} pages
                </span>{" "}
                will generate{" "}
                <span
                  className={cn(
                    "font-black",
                    "text-gray-900",
                    "dark:text-white",
                  )}
                >
                  {Math.ceil(totalPages / everyN)} individual PDF documents
                </span>{" "}
                packed neatly in a single ZIP download.
              </div>
            </div>
          )}

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
                    setOutputFileName(
                      e.target.value.replace(/\.(pdf|zip)$/i, ""),
                    )
                  }
                  placeholder="split-document"
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
                    "focus:ring-pink-400",
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
                    "border-2",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-gray-200",
                    "dark:bg-[#252932]",
                    "px-2",
                    "py-0.5",
                    "text-xs",
                    "font-black",
                    "text-gray-700",
                    "dark:text-gray-300",
                    "select-none",
                    "pointer-events-none",
                  )}
                >
                  {splitMode === "extract" && mergeExtracted ? ".pdf" : ".zip"}
                </span>
              </div>
            </div>

            {isProcessing ? (
              <div className={cn("space-y-3", "pt-2")}>
                <div
                  className={cn(
                    "flex",
                    "items-center",
                    "justify-between",
                    "text-xs",
                    "font-bold",
                  )}
                >
                  <span className={cn("flex", "items-center", "gap-2")}>
                    <Loader2
                      className={cn(
                        "h-4",
                        "w-4",
                        "animate-spin",
                        "text-pink-600",
                      )}
                    />
                    {progress.phase === "uploading"
                      ? "Uploading PDF file..."
                      : "Splitting PDF via Go engine..."}
                  </span>
                  <span>{progress.percent}%</span>
                </div>
                <div
                  className={cn(
                    "h-3.5",
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
                      "bg-pink-500",
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
                onClick={handleSplit}
                disabled={splitMode === "extract" && selectedPages.size === 0}
                className={cn(
                  "flex",
                  "w-full",
                  "items-center",
                  "justify-center",
                  "gap-2",
                  "rounded-2xl",
                  "border-3",
                  "border-gray-900",
                  "bg-pink-400",
                  "py-3.5",
                  "text-sm",
                  "sm:text-base",
                  "font-black",
                  "text-gray-900",
                  "shadow-[4px_4px_0_0_#111827]",
                  "transition-all",
                  "hover:-translate-y-1",
                  "hover:bg-pink-500",
                  "hover:shadow-[6px_6px_0_0_#111827]",
                  "disabled:opacity-50",
                  "disabled:pointer-events-none",
                  "cursor-pointer",
                )}
              >
                <Scissors className={cn("h-4", "w-4")} />
                {splitMode === "extract"
                  ? mergeExtracted
                    ? `Extract & Combine`
                    : `Extract to Individual Files`
                  : `Split into ${Math.ceil(totalPages / everyN)} Files`}
              </button>
            )}
          </div>

          {/* Result Card */}
          {result && (
            <div
              className={cn(
                "animate-in",
                "fade-in",
                "slide-in-from-bottom-4",
                "duration-300",
                "rounded-3xl",
                "border-3",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-emerald-100",
                "dark:bg-emerald-950/40",
                "p-6",
                "sm:p-8",
                "shadow-[6px_6px_0_0_#111827]",
                "dark:shadow-[6px_6px_0_0_#000]",
              )}
            >
              <div
                className={cn(
                  "flex",
                  "flex-col",
                  "sm:flex-row",
                  "items-start",
                  "sm:items-center",
                  "justify-between",
                  "gap-4",
                )}
              >
                <div className={cn("flex", "items-center", "gap-3")}>
                  <div
                    className={cn(
                      "flex",
                      "h-12",
                      "w-12",
                      "items-center",
                      "justify-center",
                      "rounded-2xl",
                      "border-2",
                      "border-gray-900",
                      "bg-emerald-400",
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
                      Split Successful!
                    </h3>
                    <p
                      className={cn(
                        "text-xs",
                        "font-bold",
                        "text-gray-600",
                        "dark:text-gray-300",
                      )}
                    >
                      {result.file_name} • {formatFileSize(result.file_size)} •{" "}
                      {result.is_zip
                        ? `${result.file_count} documents in ZIP`
                        : "Single PDF document"}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-2.5",
                    "w-full",
                    "sm:w-auto",
                  )}
                >
                  {!result.is_zip && previewBlobUrl && (
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className={cn(
                        "flex-1",
                        "sm:flex-none",
                        "inline-flex",
                        "items-center",
                        "justify-center",
                        "gap-1.5",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "bg-white",
                        "dark:bg-[#1a1c24]",
                        "px-4",
                        "py-2.5",
                        "text-xs",
                        "font-black",
                        "text-gray-900",
                        "dark:text-white",
                        "shadow-[3px_3px_0_0_#111827]",
                        "dark:shadow-[3px_3px_0_0_#000]",
                        "hover:-translate-y-0.5",
                        "cursor-pointer",
                        "transition-all",
                      )}
                    >
                      <Eye className={cn("h-4", "w-4")} />
                      Preview
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownload}
                    className={cn(
                      "flex-1",
                      "sm:flex-none",
                      "inline-flex",
                      "items-center",
                      "justify-center",
                      "gap-1.5",
                      "rounded-xl",
                      "border-2",
                      "border-gray-900",
                      "bg-emerald-400",
                      "px-5",
                      "py-2.5",
                      "text-xs",
                      "font-black",
                      "text-gray-900",
                      "shadow-[3px_3px_0_0_#111827]",
                      "hover:-translate-y-0.5",
                      "hover:bg-emerald-500",
                      "cursor-pointer",
                      "transition-all",
                    )}
                  >
                    <Download className={cn("h-4", "w-4")} />
                    Download {result.is_zip ? "ZIP" : "PDF"}
                  </button>
                </div>
              </div>

              {/* Items List inside ZIP */}
              {result.items && result.items.length > 0 && (
                <div
                  className={cn(
                    "mt-4",
                    "border-t-2",
                    "border-emerald-200",
                    "pt-3",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs",
                      "font-black",
                      "text-gray-800",
                      "dark:text-gray-200",
                      "mb-2",
                    )}
                  >
                    Generated Documents ({result.items.length} files):
                  </p>
                  <div
                    className={cn("max-h-36", "overflow-y-auto", "space-y-1.5")}
                  >
                    {result.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex",
                          "items-center",
                          "justify-between",
                          "rounded-lg",
                          "bg-white/80",
                          "dark:bg-[#12141a]/80",
                          "px-3",
                          "py-1.5",
                          "text-xs",
                          "font-bold",
                          "text-gray-800",
                          "dark:text-gray-200",
                        )}
                      >
                        <span className="truncate">{item.file_name}</span>
                        <span className={cn("shrink-0", "text-gray-500")}>
                          {formatFileSize(item.file_size)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF Preview Modal */}
      {isPreviewOpen && previewBlobUrl && (
        <div
          className={cn(
            "fixed",
            "inset-0",
            "z-50",
            "flex",
            "items-center",
            "justify-center",
            "p-4",
            "bg-black/60",
            "backdrop-blur-sm",
          )}
        >
          <div
            className={cn(
              "relative",
              "flex",
              "flex-col",
              "w-full",
              "max-w-4xl",
              "h-[88vh]",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "bg-white",
              "dark:bg-[#1a1c24]",
              "shadow-[8px_8px_0_0_#111827]",
              "overflow-hidden",
            )}
          >
            {/* Modal Header */}
            <div
              className={cn(
                "flex",
                "items-center",
                "justify-between",
                "border-b-3",
                "border-gray-900",
                "bg-pink-300",
                "dark:bg-pink-900/60",
                "px-6",
                "py-3.5",
              )}
            >
              <div className={cn("flex", "items-center", "gap-2")}>
                <FileText className={cn("h-5", "w-5", "text-gray-900")} />
                <span
                  className={cn(
                    "text-sm",
                    "font-black",
                    "text-gray-900",
                    "dark:text-white",
                  )}
                >
                  {result?.file_name || "Split Document Preview"}
                </span>
              </div>

              <div className={cn("flex", "items-center", "gap-2")}>
                <button
                  type="button"
                  onClick={handleDownload}
                  className={cn(
                    "inline-flex",
                    "items-center",
                    "gap-1",
                    "rounded-lg",
                    "border-2",
                    "border-gray-900",
                    "bg-emerald-400",
                    "px-3",
                    "py-1.5",
                    "text-xs",
                    "font-black",
                    "text-gray-900",
                    "shadow-[2px_2px_0_0_#111827]",
                    "hover:bg-emerald-500",
                    "cursor-pointer",
                  )}
                >
                  <Download className={cn("h-3.5", "w-3.5")} />
                  Download
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className={cn(
                    "flex",
                    "h-8",
                    "w-8",
                    "items-center",
                    "justify-center",
                    "rounded-lg",
                    "border-2",
                    "border-gray-900",
                    "bg-white",
                    "dark:bg-[#12141a]",
                    "text-gray-800",
                    "dark:text-gray-200",
                    "shadow-[2px_2px_0_0_#111827]",
                    "hover:bg-gray-100",
                    "cursor-pointer",
                  )}
                >
                  <X className={cn("h-4", "w-4")} />
                </button>
              </div>
            </div>

            {/* Modal Iframe Content */}
            <div className={cn("flex-1", "bg-gray-100", "dark:bg-[#12141a]")}>
              <iframe
                src={previewBlobUrl}
                title="Split PDF Preview"
                className={cn("w-full", "h-full", "border-none")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
