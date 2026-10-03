import {
  base64ToPdfBlob,
  compressPdfViaBackend,
  downloadPdfBlob,
  type CompressPdfOptions,
  type CompressPdfResult,
} from "@/lib/pdf-compress-api";
import { cn } from "@/lib/utils";
import { FileDropzone } from "@/pages/pdf/components/file-dropzone";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  FileArchive,
  FileText,
  Gauge,
  Loader2,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export type CompressionPreset = "recommended" | "extreme" | "low" | "custom";

export interface CompressFileItemState {
  file: File;
  id: string;
  name: string;
  size: number;
  status: "pending" | "compressing" | "done" | "error";
  result?: CompressPdfResult;
  errorMessage?: string;
}

interface PresetOption {
  id: CompressionPreset;
  title: string;
  badge: string;
  description: string;
  icon: typeof Sparkles;
  accentBg: string;
  activeBorder: string;
  activeBg: string;
}

const presetOptions: PresetOption[] = [
  {
    id: "recommended",
    title: "Recommended",
    badge: "Balanced",
    description:
      "Good compression, high visual quality. Best for emails & standard uploads.",
    icon: Sparkles,
    accentBg: "bg-teal-300",
    activeBorder: "border-teal-600 dark:border-teal-400",
    activeBg: "bg-teal-100 dark:bg-teal-950/40",
  },
  {
    id: "extreme",
    title: "Extreme",
    badge: "Smallest Size",
    description:
      "Maximum compression ratio. Best for strict file limits & job portals.",
    icon: Zap,
    accentBg: "bg-amber-300",
    activeBorder: "border-amber-600 dark:border-amber-400",
    activeBg: "bg-amber-100 dark:bg-amber-950/40",
  },
  {
    id: "low",
    title: "Low Compression",
    badge: "High Quality",
    description:
      "Light optimization. Keeps pristine sharpness for printing & high-res forms.",
    icon: Gauge,
    accentBg: "bg-blue-300",
    activeBorder: "border-blue-600 dark:border-blue-400",
    activeBg: "bg-blue-100 dark:bg-blue-950/40",
  },
  {
    id: "custom",
    title: "Target File Size",
    badge: "Custom Size",
    description:
      "Specify your desired target file size (e.g. 200 KB, 500 KB, 1 MB).",
    icon: Sliders,
    accentBg: "bg-purple-300",
    activeBorder: "border-purple-600 dark:border-purple-400",
    activeBg: "bg-purple-100 dark:bg-purple-950/40",
  },
];

export default function CompressPdfPage() {
  const [items, setItems] = useState<CompressFileItemState[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [preset, setPreset] = useState<CompressionPreset>("recommended");

  // Custom Target File Size settings
  const [targetSizeValue, setTargetSizeValue] = useState<number>(200);
  const [targetSizeUnit, setTargetSizeUnit] = useState<"KB" | "MB">("KB");

  // Overall batch progress
  const [progress, setProgress] = useState<{
    currentIndex: number;
    total: number;
    currentName: string;
    percent: number;
  }>({
    currentIndex: 0,
    total: 0,
    currentName: "",
    percent: 0,
  });

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<{
    name: string;
    blobUrl: string;
    compressedSize: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleProcessFiles = async (rawFiles: File[]) => {
    const validPdfs = rawFiles.filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );

    if (validPdfs.length === 0) {
      toast.error("Please upload valid PDF documents (.pdf)");
      return;
    }

    const newItems: CompressFileItemState[] = validPdfs.map((file, idx) => ({
      file,
      id: `${file.name}-${file.lastModified}-${Date.now()}-${idx}`,
      name: file.name,
      size: file.size,
      status: "pending",
    }));

    // Append to queue
    const updatedItems = [...items, ...newItems];
    setItems(updatedItems);
    toast.info(
      `Added ${validPdfs.length} file${validPdfs.length > 1 ? "s" : ""} to queue.`,
    );

    // Auto-compress the new items
    await compressItemsList(newItems, updatedItems);
  };

  const compressItemsList = async (
    itemsToCompress: CompressFileItemState[],
    allItems: CompressFileItemState[],
  ) => {
    setIsProcessing(true);
    let currentPool = [...allItems];

    const targetKb =
      preset === "custom"
        ? targetSizeUnit === "MB"
          ? targetSizeValue * 1024
          : targetSizeValue
        : undefined;

    const compressOpts: CompressPdfOptions = {
      level: preset,
      target_size_kb: targetKb,
    };

    for (let i = 0; i < itemsToCompress.length; i++) {
      const target = itemsToCompress[i];
      setProgress({
        currentIndex: i + 1,
        total: itemsToCompress.length,
        currentName: target.name,
        percent: Math.round((i / itemsToCompress.length) * 100),
      });

      // Mark current as compressing
      currentPool = currentPool.map((it) =>
        it.id === target.id ? { ...it, status: "compressing" } : it,
      );
      setItems(currentPool);

      try {
        const cleanBase = target.name.replace(/\.pdf$/i, "");
        const res = await compressPdfViaBackend(target.file, {
          ...compressOpts,
          output_file_name: `${cleanBase}_compressed.pdf`,
        });

        currentPool = currentPool.map((it) =>
          it.id === target.id ? { ...it, status: "done", result: res } : it,
        );
        setItems(currentPool);
      } catch (err: any) {
        currentPool = currentPool.map((it) =>
          it.id === target.id
            ? {
                ...it,
                status: "error",
                errorMessage: err.message || "Failed to compress",
              }
            : it,
        );
        setItems(currentPool);
      }
    }

    setProgress({
      currentIndex: itemsToCompress.length,
      total: itemsToCompress.length,
      currentName: "Completed",
      percent: 100,
    });

    setIsProcessing(false);
    toast.success("Compression process completed!");
  };

  const handleRecompressAll = async () => {
    if (items.length === 0) return;
    const itemsToRecompress = items.map((it) => ({
      ...it,
      status: "pending" as const,
      result: undefined,
      errorMessage: undefined,
    }));
    setItems(itemsToRecompress);
    await compressItemsList(itemsToRecompress, itemsToRecompress);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDownloadSingle = (item: CompressFileItemState) => {
    if (!item.result) return;
    const blob = base64ToPdfBlob(item.result.file_base64);
    downloadPdfBlob(blob, item.result.file_name);
  };

  const handlePreviewItem = (item: CompressFileItemState) => {
    if (!item.result) return;
    const blob = base64ToPdfBlob(item.result.file_base64);
    const blobUrl = URL.createObjectURL(blob);
    setPreviewItem({
      name: item.result.file_name,
      blobUrl,
      compressedSize: item.result.compressed_size,
    });
  };

  const handleClosePreview = () => {
    if (previewItem) {
      URL.revokeObjectURL(previewItem.blobUrl);
      setPreviewItem(null);
    }
  };

  const clearAll = () => {
    handleClosePreview();
    setItems([]);
    setProgress({ currentIndex: 0, total: 0, currentName: "", percent: 0 });
  };

  const doneCount = items.filter((i) => i.status === "done").length;

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

        {items.length > 0 && (
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
        title="Upload PDF to Compress"
        description="Drag & drop one or multiple PDF files here to reduce file size."
        dropzoneSubtitle="Supports documents, forms, reports, ebooks, and scanned PDFs."
        accept=".pdf,application/pdf"
        multiple={true}
        iconBg="bg-teal-300"
        icon={<FileArchive className={cn("h-7", "w-7", "text-gray-900")} />}
        onFilesSelected={handleProcessFiles}
        disabled={isProcessing}
      />

      {/* Compression Level Selector Card */}
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
            "gap-3",
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
              Compression Settings
            </h3>
            <p
              className={cn(
                "text-xs",
                "font-bold",
                "text-gray-500",
                "dark:text-gray-400",
              )}
            >
              Choose a preset level or customize your quality and resolution.
            </p>
          </div>
        </div>

        {/* 4 Presets Grid */}
        <div
          className={cn(
            "grid",
            "grid-cols-1",
            "sm:grid-cols-2",
            "lg:grid-cols-4",
            "gap-3.5",
          )}
        >
          {presetOptions.map((opt) => {
            const isSelected = preset === opt.id;
            const Icon = opt.icon;
            return (
              <div
                key={opt.id}
                onClick={() => setPreset(opt.id)}
                className={cn(
                  "group",
                  "relative",
                  "flex",
                  "flex-col",
                  "justify-between",
                  "gap-3",
                  "rounded-2xl",
                  "border-3",
                  "p-4",
                  "transition-all",
                  "cursor-pointer",
                  "hover:-translate-y-1",
                  isSelected
                    ? `${opt.activeBorder} ${opt.activeBg} shadow-[4px_4px_0_0_#111827] dark:shadow-[4px_4px_0_0_#000]`
                    : "border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 hover:border-gray-900",
                )}
              >
                <div className={cn("space-y-2")}>
                  <div
                    className={cn("flex", "items-center", "justify-between")}
                  >
                    <div
                      className={cn(
                        "flex",
                        "h-8",
                        "w-8",
                        "items-center",
                        "justify-center",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        opt.accentBg,
                        "text-gray-900",
                        "shadow-[1px_1px_0_0_#111827]",
                      )}
                    >
                      <Icon className={cn("h-4", "w-4")} />
                    </div>
                    <span
                      className={cn(
                        "rounded-md",
                        "border",
                        "border-gray-900/30",
                        "px-2",
                        "py-0.5",
                        "text-[10px]",
                        "font-black",
                        isSelected
                          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                          : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                      )}
                    >
                      {opt.badge}
                    </span>
                  </div>

                  <h4
                    className={cn(
                      "text-sm",
                      "font-black",
                      "text-gray-900",
                      "dark:text-white",
                    )}
                  >
                    {opt.title}
                  </h4>
                  <p
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-gray-600",
                      "dark:text-gray-400",
                      "leading-relaxed",
                    )}
                  >
                    {opt.description}
                  </p>
                </div>

                <div
                  className={cn(
                    "mt-1",
                    "flex",
                    "items-center",
                    "gap-1.5",
                    "text-[10px]",
                    "font-black",
                    isSelected
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-400",
                  )}
                ></div>
              </div>
            );
          })}
        </div>

        {/* Custom Target File Size Panel (visible when Custom is selected) */}
        {preset === "custom" && (
          <div
            className={cn(
              "space-y-4",
              "rounded-2xl",
              "border-2",
              "border-purple-900",
              "dark:border-purple-600",
              "bg-purple-50",
              "dark:bg-purple-950/20",
              "p-5",
              "shadow-[3px_3px_0_0_#111827]",
            )}
          >
            <div
              className={cn("flex", "items-center", "justify-between", "gap-2")}
            >
              <div className={cn("flex", "items-center", "gap-2")}>
                <Sliders
                  className={cn(
                    "h-4",
                    "w-4",
                    "text-purple-700",
                    "dark:text-purple-300",
                  )}
                />
                <h4
                  className={cn(
                    "text-xs",
                    "font-black",
                    "uppercase",
                    "tracking-wider",
                    "text-purple-900",
                    "dark:text-purple-200",
                  )}
                >
                  Target File Size
                </h4>
              </div>
              <span
                className={cn(
                  "text-xs",
                  "font-bold",
                  "text-purple-800",
                  "dark:text-purple-300",
                )}
              >
                Target:{" "}
                <strong
                  className={cn(
                    "text-gray-900",
                    "dark:text-white",
                    "font-black",
                  )}
                >
                  {targetSizeValue} {targetSizeUnit}
                </strong>
              </span>
            </div>

            {/* Input & Unit Selector */}
            <div className={cn("flex", "items-center", "gap-3")}>
              <div className={cn("relative", "w-44")}>
                <input
                  type="number"
                  min="1"
                  max={targetSizeUnit === "MB" ? 100 : 100000}
                  value={targetSizeValue || ""}
                  onChange={(e) =>
                    setTargetSizeValue(
                      Math.max(1, parseInt(e.target.value, 10) || 0),
                    )
                  }
                  placeholder="e.g. 200"
                  className={cn(
                    "w-full",
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "bg-white",
                    "dark:bg-gray-800",
                    "px-3.5",
                    "py-2",
                    "text-base",
                    "font-black",
                    "text-gray-900",
                    "dark:text-white",
                    "shadow-[2px_2px_0_0_#111827]",
                    "focus:outline-none",
                    "focus:ring-2",
                    "focus:ring-purple-500",
                  )}
                />
              </div>

              {/* Unit Selector Toggle (KB / MB) */}
              <div
                className={cn(
                  "flex",
                  "rounded-xl",
                  "border-2",
                  "border-gray-900",
                  "bg-white",
                  "dark:bg-gray-800",
                  "p-1",
                  "shadow-[2px_2px_0_0_#111827]",
                )}
              >
                <button
                  type="button"
                  onClick={() => setTargetSizeUnit("KB")}
                  className={cn(
                    "px-3.5",
                    "py-1.5",
                    "rounded-lg",
                    "text-xs",
                    "font-black",
                    "transition-all",
                    "cursor-pointer",
                    targetSizeUnit === "KB"
                      ? "bg-purple-300 text-gray-900 shadow-[1px_1px_0_0_#111827]"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900",
                  )}
                >
                  KB
                </button>
                <button
                  type="button"
                  onClick={() => setTargetSizeUnit("MB")}
                  className={cn(
                    "px-3.5",
                    "py-1.5",
                    "rounded-lg",
                    "text-xs",
                    "font-black",
                    "transition-all",
                    "cursor-pointer",
                    targetSizeUnit === "MB"
                      ? "bg-purple-300 text-gray-900 shadow-[1px_1px_0_0_#111827]"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900",
                  )}
                >
                  MB
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Execution Action Button */}
        <div
          className={cn(
            "pt-3",
            "border-t-2",
            "border-gray-100",
            "dark:border-gray-800",
            "flex",
            "items-center",
            "justify-end",
            "gap-3",
            "flex-wrap",
          )}
        >
          {items.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "rounded-xl",
                "border-3",
                "border-gray-900",
                "bg-teal-400",
                "dark:bg-teal-500",
                "px-5",
                "py-2.5",
                "text-sm",
                "font-black",
                "text-gray-900",
                "shadow-[3px_3px_0_0_#111827]",
                "dark:shadow-[3px_3px_0_0_#000]",
                "hover:-translate-y-0.5",
                "hover:shadow-[4px_4px_0_0_#111827]",
                "transition-all",
                "cursor-pointer",
              )}
            >
              Select PDF
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRecompressAll}
              disabled={isProcessing}
              className={cn(
                "rounded-xl",
                "border-3",
                "border-gray-900",
                "bg-teal-400",
                "dark:bg-teal-500",
                "px-6",
                "py-2.5",
                "text-sm",
                "font-black",
                "text-gray-900",
                "shadow-[3px_3px_0_0_#111827]",
                "dark:shadow-[3px_3px_0_0_#000]",
                "hover:-translate-y-0.5",
                "hover:shadow-[4px_4px_0_0_#111827]",
                "transition-all",
                "cursor-pointer",
                "disabled:opacity-50",
                "disabled:cursor-not-allowed",
              )}
            >
              {isProcessing ? "Compressing..." : "Compress PDF"}
            </button>
          )}
        </div>
      </div>

      {/* Processing Status Bar */}
      {isProcessing && (
        <div
          className={cn(
            "space-y-3",
            "rounded-2xl",
            "border-3",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-white",
            "dark:bg-[#16181d]",
            "p-5",
            "shadow-[4px_4px_0_0_#111827]",
            "dark:shadow-[4px_4px_0_0_#000]",
          )}
        >
          <div
            className={cn(
              "flex",
              "items-center",
              "justify-between",
              "text-xs",
              "sm:text-sm",
              "font-black",
              "text-gray-900",
              "dark:text-white",
            )}
          >
            <span className={cn("inline-flex", "items-center", "gap-2")}>
              <Loader2
                className={cn("h-4", "w-4", "animate-spin", "text-teal-600")}
              />
              <span>
                Compressing{" "}
                <span className={cn("text-teal-600", "dark:text-teal-400")}>
                  {progress.currentName}
                </span>{" "}
                ({progress.currentIndex}/{progress.total})...
              </span>
            </span>
            <span>{progress.percent}%</span>
          </div>

          <div
            className={cn(
              "h-3.5",
              "overflow-hidden",
              "rounded-full",
              "border-2",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-gray-100",
              "dark:bg-gray-800",
            )}
          >
            <div
              className={cn(
                "h-full",
                "bg-linear-to-r",
                "from-teal-400",
                "to-emerald-500",
                "transition-all",
                "duration-300",
              )}
              style={{ width: `${Math.max(5, progress.percent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Document Queue List (like Convert pages) */}
      {items.length > 0 && (
        <div className={cn("space-y-3")}>
          <div className={cn("space-y-3")}>
            {items.map((item, index) => {
              const isDone = item.status === "done";
              const isCompressing = item.status === "compressing";
              const isError = item.status === "error";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex",
                    "flex-col",
                    "sm:flex-row",
                    "sm:items-center",
                    "justify-between",
                    "gap-4",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-white",
                    "dark:bg-[#1a1c24]",
                    "p-4",
                    "sm:p-5",
                    "shadow-[4px_4px_0_0_#111827]",
                    "dark:shadow-[4px_4px_0_0_#000]",
                    "transition-all",
                  )}
                >
                  {/* File Info */}
                  <div
                    className={cn("flex", "items-center", "gap-3.5", "min-w-0")}
                  >
                    <span
                      className={cn(
                        "flex",
                        "h-8",
                        "w-8",
                        "shrink-0",
                        "items-center",
                        "justify-center",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "bg-teal-300",
                        "text-xs",
                        "font-black",
                        "text-gray-900",
                        "shadow-[1px_1px_0_0_#111827]",
                      )}
                    >
                      #{index + 1}
                    </span>

                    <div
                      className={cn(
                        "flex",
                        "h-10",
                        "w-10",
                        "shrink-0",
                        "items-center",
                        "justify-center",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "bg-red-400",
                        "text-white",
                        "shadow-[1px_1px_0_0_#111827]",
                      )}
                    >
                      <FileText className={cn("h-5", "w-5")} />
                    </div>

                    <div className={cn("min-w-0")}>
                      <p
                        className={cn(
                          "truncate",
                          "text-sm",
                          "font-black",
                          "text-gray-900",
                          "dark:text-white",
                        )}
                      >
                        {item.name}
                      </p>
                      <div
                        className={cn(
                          "flex",
                          "items-center",
                          "gap-2",
                          "text-xs",
                          "font-bold",
                        )}
                      >
                        <span
                          className={cn("text-gray-500", "dark:text-gray-400")}
                        >
                          {formatFileSize(item.size)}
                        </span>

                        {isDone && item.result && (
                          <>
                            <ArrowRight
                              className={cn("h-3", "w-3", "text-gray-400")}
                            />
                            <span
                              className={cn("text-emerald-600", "font-black")}
                            >
                              {formatFileSize(item.result.compressed_size)}
                            </span>
                            <span
                              className={cn(
                                "rounded-md",
                                "border",
                                "border-gray-900/20",
                                "bg-emerald-100",
                                "dark:bg-emerald-950/40",
                                "px-1.5",
                                "py-0.5",
                                "text-[10px]",
                                "font-black",
                                "text-emerald-700",
                                "dark:text-emerald-300",
                              )}
                            >
                              {item.result.saved_percentage > 0
                                ? `-${item.result.saved_percentage.toFixed(1)}%`
                                : "Optimized"}
                            </span>
                          </>
                        )}

                        {isCompressing && (
                          <span
                            className={cn(
                              "text-teal-600",
                              "font-bold",
                              "inline-flex",
                              "items-center",
                              "gap-1",
                            )}
                          >
                            <Loader2
                              className={cn("h-3", "w-3", "animate-spin")}
                            />
                            Compressing...
                          </span>
                        )}

                        {isError && (
                          <span className={cn("text-rose-500", "font-bold")}>
                            {item.errorMessage || "Compression failed"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div
                    className={cn(
                      "flex",
                      "items-center",
                      "gap-2",
                      "self-end",
                      "sm:self-center",
                    )}
                  >
                    {isDone && item.result && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(item)}
                          className={cn(
                            "flex",
                            "items-center",
                            "gap-1.5",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "bg-yellow-300",
                            "px-3.5",
                            "py-2",
                            "text-xs",
                            "font-black",
                            "text-gray-900",
                            "shadow-[2px_2px_0_0_#111827]",
                            "hover:-translate-y-0.5",
                            "transition-all",
                            "cursor-pointer",
                          )}
                        >
                          <Download className={cn("h-3.5", "w-3.5")} />
                          Download
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePreviewItem(item)}
                          className={cn(
                            "flex",
                            "items-center",
                            "gap-1.5",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "bg-white",
                            "dark:bg-gray-800",
                            "px-3.5",
                            "py-2",
                            "text-xs",
                            "font-black",
                            "text-gray-900",
                            "dark:text-white",
                            "shadow-[2px_2px_0_0_#111827]",
                            "dark:shadow-[2px_2px_0_0_#000]",
                            "hover:-translate-y-0.5",
                            "transition-all",
                            "cursor-pointer",
                          )}
                        >
                          <Eye className={cn("h-3.5", "w-3.5")} />
                          Preview
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={isCompressing}
                      className={cn(
                        "flex",
                        "h-8",
                        "w-8",
                        "items-center",
                        "justify-center",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "bg-rose-100",
                        "dark:bg-rose-950/40",
                        "text-rose-600",
                        "shadow-[2px_2px_0_0_#111827]",
                        "hover:-translate-y-0.5",
                        "transition-all",
                        "cursor-pointer",
                      )}
                    >
                      <Trash2 className={cn("h-4", "w-4")} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen PDF Preview Modal */}
      {previewItem && (
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
                "bg-teal-300",
                "px-5",
                "py-3",
              )}
            >
              <div className={cn("flex", "items-center", "gap-2")}>
                <FileText className={cn("h-5", "w-5", "text-gray-900")} />
                <span className={cn("text-sm", "font-black", "text-gray-900")}>
                  {previewItem.name} (
                  {formatFileSize(previewItem.compressedSize)})
                </span>
              </div>
              <button
                type="button"
                onClick={handleClosePreview}
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
                src={previewItem.blobUrl}
                title="Compressed PDF Preview"
                className={cn("h-full", "w-full", "border-0")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
