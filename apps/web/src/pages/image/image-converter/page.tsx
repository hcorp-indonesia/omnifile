import {
  ArrowLeft,
  Download,
  Eye,
  FileArchive,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import {
  convertImageViaBackend,
  downloadAllImagesAsZip,
  downloadImageResult,
  type ConvertImageResult,
  type SupportedImageFormat,
} from "@/lib/image-convert-api";
import { cn } from "@/lib/utils";
import { ImageDropzone } from "@/pages/image/components/image-dropzone";


export interface ImageFileItemState {
  file: File;
  id: string;
  name: string;
  size: number;
  previewUrl: string;
  status: "pending" | "converting" | "done" | "error";
  progress?: number;
  result?: ConvertImageResult;
  errorMessage?: string;
}

const availableFormats: {
  id: SupportedImageFormat;
  label: string;
  desc: string;
  badge?: string;
}[] = [
  {
    id: "webp",
    label: "WebP",
    desc: "Ultra-compact for web",
  },
  { id: "png", label: "PNG", desc: "Lossless with alpha" },
  {
    id: "jpg",
    label: "JPG",
    desc: "Universal photo format",
  },
  {
    id: "avif",
    label: "AVIF",
    desc: "Next-gen compression",
  },
  { id: "jpeg", label: "JPEG", desc: "Standard JPEG photo" },
  { id: "tiff", label: "TIFF", desc: "Print fidelity" },
  { id: "ico", label: "ICO", desc: "Favicon format" },
  { id: "gif", label: "GIF", desc: "Indexed graphic" },
];

export default function ImageConverterPage() {
  const location = useLocation();
  const routeState = location.state as {
    targetFormat?: SupportedImageFormat;
  } | null;

  const [items, setItems] = useState<ImageFileItemState[]>([]);
  const [targetFormat, setTargetFormat] = useState<SupportedImageFormat>(
    routeState?.targetFormat ?? "webp",
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const removeBg = true; // AI background removal runs automatically without toggle

  // Preview Modal State
  const [previewResult, setPreviewResult] = useState<ConvertImageResult | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when items change or unmount
  useEffect(() => {
    return () => {
      items.forEach((it) => {
        if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
      });
    };
  }, [items]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const convertItems = async (targetItems: ImageFileItemState[]) => {
    const selectedFormat = targetFormat;
    setIsProcessing(true);

    const convertOptions = {
      target_format: selectedFormat,
      quality: 85,
      remove_bg: removeBg,
    };

    let successCount = 0;
    for (const target of targetItems) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? { ...item, status: "converting", progress: 15 }
            : item,
        ),
      );

      const convTimer = setInterval(() => {
        setItems((prev) =>
          prev.map((it) => {
            if (it.id !== target.id || it.status !== "converting") return it;
            const current = it.progress ?? 15;
            if (current >= 90) return it;
            const next = current + Math.floor(Math.random() * 6) + 3;
            return { ...it, progress: Math.min(next, 92) };
          }),
        );
      }, 200);

      try {
        const res = await convertImageViaBackend(
          target.file,
          convertOptions,
          (pct) => {
            const mapped = Math.min(Math.round(pct * 0.4), 45);
            setItems((prev) =>
              prev.map((it) => {
                if (it.id !== target.id) return it;
                const current = it.progress ?? 15;
                return { ...it, progress: Math.max(current, mapped) };
              }),
            );
          },
        );

        clearInterval(convTimer);

        setItems((prev) =>
          prev.map((item) =>
            item.id === target.id
              ? { ...item, status: "done", result: res, progress: 100 }
              : item,
          ),
        );
        successCount++;
      } catch (err) {
        clearInterval(convTimer);
        const errMsg = err instanceof Error ? err.message : "Conversion failed";
        setItems((prev) =>
          prev.map((item) =>
            item.id === target.id
              ? { ...item, status: "error", errorMessage: errMsg }
              : item,
          ),
        );
      }
    }

    setIsProcessing(false);
    if (successCount > 0) {
      toast.success(
        `Successfully converted ${successCount} image${successCount > 1 ? "s" : ""} to ${selectedFormat.toUpperCase()}!`,
      );
    }
  };

  const handleFilesSelected = (rawFiles: FileList | File[] | null) => {
    if (!rawFiles || rawFiles.length === 0) return;

    const fileArray = Array.from(rawFiles);
    const validImageFiles = fileArray.filter(
      (file) =>
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|avif|bmp|tiff?|gif|ico|heic|heif|svg)$/i.test(
          file.name,
        ),
    );

    if (validImageFiles.length === 0) {
      toast.error(
        "Please upload valid image files (JPG, PNG, WebP, AVIF, BMP, TIFF, GIF, ICO)",
      );
      return;
    }

    const newItems: ImageFileItemState[] = validImageFiles.map((file, index) => ({
      file,
      id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
    }));

    setItems((prev) => [...prev, ...newItems]);
    toast.info(
      `Converting ${validImageFiles.length} image${validImageFiles.length > 1 ? "s" : ""} to ${targetFormat.toUpperCase()}...`,
    );
    void convertItems(newItems);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => {
      const itemToDelete = prev.find((it) => it.id === id);
      if (itemToDelete?.previewUrl) {
        URL.revokeObjectURL(itemToDelete.previewUrl);
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  const handleClearAll = () => {
    items.forEach((it) => {
      if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
    });
    setItems([]);
  };

  const handleDownloadAllZip = async () => {
    const doneResults = items
      .filter((it) => it.status === "done" && it.result)
      .map((it) => it.result!);

    if (doneResults.length === 0) {
      toast.error("No converted images ready for download.");
      return;
    }

    try {
      toast.loading("Preparing ZIP archive...", { id: "zip-toast" });
      await downloadAllImagesAsZip(
        doneResults,
        `magic_converted_${targetFormat}_images.zip`,
      );
      toast.success("Downloaded all converted images in ZIP!", {
        id: "zip-toast",
      });
    } catch {
      toast.error("Failed to build ZIP archive.", { id: "zip-toast" });
    }
  };

  const completedCount = items.filter((it) => it.status === "done").length;

  return (
    <div className={cn("mx-auto", "max-w-5xl", "space-y-6", "py-4", "pb-24")}>
      {/* Top Header Navigation */}
      <div className={cn("flex", "items-center", "justify-between")}>
        <Link
          to="/image"
          className={cn(
            "inline-flex",
            "items-center",
            "gap-2",
            "rounded-xl",
            "border-3",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-white",
            "dark:bg-[#16181d]",
            "px-4",
            "py-2",
            "text-xs",
            "font-black",
            "shadow-[3px_3px_0_0_#111827]",
            "dark:shadow-[3px_3px_0_0_#000]",
            "transition-all",
            "hover:-translate-y-0.5",
          )}
        >
          <ArrowLeft className={cn("h-4", "w-4")} />
          Back
        </Link>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
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

      {/* Header Section */}
      <div className={cn("space-y-4", "text-center")}>
        <h1
          className={cn(
            "text-4xl",
            "font-black",
            "leading-tight",
            "tracking-tight",
            "text-gray-900",
            "dark:text-white",
            "md:text-5xl",
          )}
        >
          Image Converter
        </h1>
        <p
          className={cn(
            "mx-auto",
            "max-w-2xl",
            "text-base",
            "font-bold",
            "text-gray-600",
            "dark:text-gray-400",
            "md:text-lg",
          )}
        >
          Convert multiple images to{" "}
          <span className={cn("text-emerald-500", "font-black")}>
            WebP, PNG, JPG, JPEG, AVIF, TIFF, ICO
          </span>{" "}
          with instant previews and batch ZIP download.
        </p>
      </div>

      {/* 1. TARGET FORMAT */}
      <div className={cn("space-y-6")}>
        <div
          className={cn(
            "flex",
            "items-center",
            "justify-between",
            "border-b",
            "border-gray-200",
            "pb-4",
            "dark:border-gray-800",
          )}
        >
          <h2
            className={cn(
              "text-lg",
              "font-black",
              "text-gray-900",
              "dark:text-white",
            )}
          >
            Format Target
          </h2>
        </div>

        {/* Format Grid */}
        <div className={cn("grid", "grid-cols-2", "sm:grid-cols-4", "gap-3")}>
          {availableFormats.map((fmt) => {
            const isSelected = targetFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                disabled={isProcessing}
                onClick={() => setTargetFormat(fmt.id)}
                className={cn(
                  "flex",
                  "items-center",
                  "justify-center",
                  "p-4",
                  "rounded-2xl",
                  "border-3",
                  "border-gray-900",
                  "transition-all",
                  "cursor-pointer",
                  "disabled:cursor-not-allowed",
                  "disabled:opacity-60",
                  isSelected
                    ? "bg-purple-400 text-gray-900 shadow-[4px_4px_0_0_#111827] -translate-y-1 dark:shadow-[4px_4px_0_0_#000]"
                    : "bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#1a1c22] dark:text-gray-200 dark:hover:bg-[#232630]",
                )}
              >
                <span
                  className={cn(
                    "text-lg",
                    "font-black",
                    "uppercase",
                    "tracking-wide",
                  )}
                >
                  {fmt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. UPLOAD & CONVERT */}
      <Card
        variant="elevated"
        rounded="3xl"
        className={cn("p-6", "sm:p-8", "space-y-6")}
      >
        {/* Dropzone Box */}
        <ImageDropzone
          ref={fileInputRef}
          dropzoneTitle="Click to upload or Drag & Drop images here"
          dropzoneSubtitle="Supports multiple PNG, JPG, JPEG, WEBP, AVIF, TIFF, GIF, ICO (Max 50MB per file)"
          multiple={true}
          disabled={isProcessing}
          onFilesSelected={handleFilesSelected}
        />


        {/* Queue Items List */}
        {items.length > 0 && (
          <div className={cn("space-y-4")}>
            <div className={cn("flex", "items-center", "justify-between")}>
              <span
                className={cn(
                  "text-sm",
                  "font-black",
                  "text-gray-800",
                  "dark:text-gray-200",
                )}
              >
                Selected Images ({items.length})
              </span>

              {completedCount > 0 && (
                <span
                  className={cn(
                    "text-xs",
                    "font-black",
                    "text-emerald-600",
                    "dark:text-emerald-400",
                  )}
                >
                  {completedCount} of {items.length} Converted
                </span>
              )}
            </div>

            <div className={cn("grid", "grid-cols-1", "gap-3")}>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex",
                    "flex-col",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "bg-white",
                    "p-4",
                    "shadow-[3px_3px_0_0_#111827]",
                    "dark:border-gray-700",
                    "dark:bg-[#1a1c22]",
                    "dark:shadow-[3px_3px_0_0_#000]",
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
                      "w-full",
                    )}
                  >
                    {/* Left: Thumbnail & Info */}
                    <div
                      className={cn(
                        "flex",
                        "items-center",
                        "gap-3.5",
                        "min-w-0",
                      )}
                    >
                      <div
                        className={cn(
                          "relative",
                          "h-14",
                          "w-14",
                          "shrink-0",
                          "overflow-hidden",
                          "rounded-xl",
                          "border-2",
                          "border-gray-900",
                          "bg-gray-100",
                          "p-0.5",
                        )}
                      >
                        <img
                          src={
                            item.result
                              ? `data:${item.result.mime_type};base64,${item.result.file_base64}`
                              : item.previewUrl
                          }
                          alt={item.name}
                          className={cn(
                            "h-full",
                            "w-full",
                            "object-cover",
                            "rounded-lg",
                          )}
                        />
                      </div>
                      <div className={cn("min-w-0", "space-y-0.5")}>
                        <p
                          className={cn(
                            "truncate",
                            "text-sm",
                            "font-black",
                            "text-gray-900",
                            "dark:text-white",
                          )}
                        >
                          {item.result ? item.result.file_name : item.name}
                        </p>
                        <div
                          className={cn(
                            "flex",
                            "items-center",
                            "gap-2",
                            "text-xs",
                            "font-semibold",
                            "text-gray-500",
                            "dark:text-gray-400",
                          )}
                        >
                          <span>{formatFileSize(item.size)}</span>
                          {item.result && (
                            <>
                              <span>&rarr;</span>
                              <span
                                className={cn("text-emerald-500", "font-bold")}
                              >
                                {formatFileSize(item.result.converted_size)}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px]",
                                  "font-semibold",
                                  "text-gray-400",
                                )}
                              >
                                ({item.result.converted_width}x
                                {item.result.converted_height}px)
                              </span>
                              {item.result.saved_percentage > 0 && (
                                  <span
                                    className={cn(
                                      "rounded",
                                      "bg-emerald-100",
                                      "px-1",
                                      "py-0.2",
                                      "text-[10px]",
                                      "font-black",
                                      "text-emerald-700",
                                      "dark:bg-emerald-950/50",
                                      "dark:text-emerald-300",
                                    )}
                                  >
                                    -{item.result.saved_percentage.toFixed(0)}%
                                  </span>
                                )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status & Actions */}
                    <div
                      className={cn(
                        "flex",
                        "items-center",
                        "gap-2",
                        "self-end",
                        "sm:self-auto",
                      )}
                    >
                      {item.status === "converting" && (
                        <span
                          className={cn(
                            "inline-flex",
                            "items-center",
                            "gap-1.5",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "bg-amber-300",
                            "px-3",
                            "py-1.5",
                            "text-xs",
                            "font-black",
                            "text-gray-900",
                          )}
                        >
                          <Loader2
                            className={cn("h-3.5", "w-3.5", "animate-spin")}
                          />
                          Converting...
                        </span>
                      )}

                      {item.status === "done" && item.result && (
                        <div className={cn("flex", "items-center", "gap-2")}>
                          <button
                            type="button"
                            onClick={() => setPreviewResult(item.result!)}
                            className={cn(
                              "flex",
                              "h-9",
                              "w-9",
                              "items-center",
                              "justify-center",
                              "rounded-xl",
                              "border-2",
                              "border-gray-900",
                              "bg-gray-100",
                              "hover:bg-gray-200",
                              "transition-colors",
                              "cursor-pointer",
                              "dark:border-gray-700",
                              "dark:bg-[#232630]",
                              "dark:text-white",
                            )}
                            title="Preview converted image"
                          >
                            <Eye className={cn("h-4", "w-4")} />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadImageResult(item.result!)}
                            className={cn(
                              "flex",
                              "h-9",
                              "items-center",
                              "gap-1.5",
                              "px-3",
                              "rounded-xl",
                              "border-2",
                              "border-gray-900",
                              "bg-emerald-400",
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
                        </div>
                      )}

                      {item.status === "error" && (
                        <span
                          className={cn(
                            "rounded-xl",
                            "border-2",
                            "border-rose-900",
                            "bg-rose-100",
                            "px-2.5",
                            "py-1",
                            "text-xs",
                            "font-bold",
                            "text-rose-700",
                            "dark:bg-rose-950/40",
                            "dark:text-rose-300",
                          )}
                        >
                          Error: {item.errorMessage}
                        </span>
                      )}

                      {item.status !== "converting" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className={cn(
                            "flex",
                            "h-9",
                            "w-9",
                            "items-center",
                            "justify-center",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "bg-white",
                            "text-gray-700",
                            "hover:bg-rose-100",
                            "hover:text-rose-700",
                            "transition-colors",
                            "cursor-pointer",
                            "dark:border-gray-700",
                            "dark:bg-[#1e222a]",
                            "dark:text-gray-300",
                          )}
                          title="Remove file"
                        >
                          <Trash2 className={cn("h-4", "w-4")} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conversion progress */}
                  {item.status === "converting" && (
                    <div
                      className={cn(
                        "w-full",
                        "pt-3",
                        "mt-1",
                        "border-t-2",
                        "border-dashed",
                        "border-gray-200",
                        "dark:border-gray-800",
                        "space-y-1.5",
                      )}
                    >
                      <div
                        className={cn(
                          "flex",
                          "items-center",
                          "justify-between",
                          "text-xs",
                          "font-black",
                        )}
                      >
                        <span
                          className={cn(
                            "flex",
                            "items-center",
                            "gap-1.5",
                            "text-gray-700",
                            "dark:text-gray-300",
                          )}
                        >
                          <Loader2
                            className={cn(
                              "h-3.5",
                              "w-3.5",
                              "animate-spin",
                              "text-emerald-500",
                            )}
                          />
                          <span>Converting format...</span>
                        </span>
                        <span className={cn("text-emerald-600", "font-black", "dark:text-emerald-400")}>
                          {item.progress ?? 0}%
                        </span>
                      </div>
                      <div
                        className={cn(
                          "h-2.5",
                          "w-full",
                          "overflow-hidden",
                          "rounded-full",
                          "border-2",
                          "border-gray-900",
                          "bg-gray-100",
                          "dark:bg-gray-800",
                          "shadow-[1px_1px_0_0_#111827]",
                        )}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300 ease-out",
                            "bg-emerald-400",
                          )}
                          style={{
                            width: `${Math.min(Math.max(item.progress ?? 5, 5), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download converted batch */}
        {completedCount > 0 && (
          <div
            className={cn(
              "pt-4",
              "flex",
              "items-center",
              "justify-end",
              "border-t",
              "border-gray-200",
              "dark:border-gray-800",
            )}
          >
            <button
              type="button"
              onClick={handleDownloadAllZip}
              className={cn(
                "flex-1",
                "sm:flex-none",
                "flex",
                "items-center",
                "justify-center",
                "gap-2",
                "rounded-xl",
                "border-3",
                "border-gray-900",
                "bg-amber-400",
                "px-7",
                "py-3.5",
                "text-base",
                "font-black",
                "text-gray-900",
                "shadow-[4px_4px_0_0_#111827]",
                "hover:-translate-y-1",
                "transition-all",
                "cursor-pointer",
              )}
            >
              <FileArchive className={cn("h-4", "w-4")} />
              Download All
            </button>
          </div>
        )}
      </Card>

      {/* Modal Preview for Converted Image (same style as PDF preview modal) */}
      {previewResult && (
        <div
          className={cn(
            "fixed",
            "inset-0",
            "z-50",
            "flex",
            "items-center",
            "justify-center",
            "bg-black/80",
            "p-3",
            "backdrop-blur-xs",
            "sm:p-6",
          )}
          onClick={() => setPreviewResult(null)}
        >
          <div
            className={cn(
              "relative",
              "flex",
              "h-[90vh]",
              "w-full",
              "max-w-5xl",
              "flex-col",
              "overflow-hidden",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "bg-white",
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
                "border-b-3",
                "border-gray-900",
                "bg-emerald-400",
                "px-4",
                "py-2",
                "dark:border-gray-700",
              )}
            >
              <div className={cn("min-w-0", "pr-3")}>
                <p
                  className={cn(
                    "truncate",
                    "text-sm",
                    "font-black",
                    "text-gray-900",
                  )}
                >
                  {previewResult.file_name}
                </p>
                <p className={cn("text-[11px]", "font-bold", "text-gray-800")}>
                  {previewResult.converted_width} ×{" "}
                  {previewResult.converted_height} px ·{" "}
                  {formatFileSize(previewResult.converted_size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewResult(null)}
                aria-label="Close preview"
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
                <X className={cn("h-4", "w-4", "stroke-3")} />
              </button>
            </div>

            {/* Image Preview Container */}
            <div
              className={cn(
                "relative flex-1 overflow-auto p-4",
                "flex items-center justify-center",
                "bg-gray-200/80 dark:bg-[#0d0e12]",
              )}
            >
              <img
                src={`data:${previewResult.mime_type};base64,${previewResult.file_base64}`}
                alt={previewResult.file_name}
                className={cn(
                  "max-h-[76vh]",
                  "max-w-[92%]",
                  "rounded-sm",
                  "border",
                  "border-gray-300",
                  "object-contain",
                  "shadow-md",
                  "dark:border-gray-700",
                )}
              />
            </div>

            {/* Footer Actions */}
            <div
              className={cn(
                "flex",
                "flex-wrap",
                "items-center",
                "justify-between",
                "gap-3",
                "border-t-3",
                "border-gray-900",
                "bg-white",
                "px-5",
                "py-3",
                "dark:border-gray-700",
                "dark:bg-[#16181d]",
              )}
            >
              <span
                className={cn(
                  "text-xs",
                  "font-black",
                  "text-gray-500",
                  "dark:text-gray-400",
                )}
              >
                Preview {previewResult.converted_format}
              </span>

              <div
                className={cn(
                  "flex",
                  "flex-wrap",
                  "items-center",
                  "justify-end",
                  "gap-2",
                )}
              >
                <button
                  type="button"
                  onClick={() => setPreviewResult(null)}
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
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => downloadImageResult(previewResult)}
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-2",
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-emerald-400",
                    "px-5 py-2",
                    "text-xs",
                    "font-black",
                    "text-gray-900",
                    "hover:bg-emerald-500",
                    "cursor-pointer",
                    "transition-all",
                    "shadow-[3px_3px_0_0_#111827]",
                    "hover:-translate-y-0.5",
                  )}
                >
                  <Download className={cn("h-4", "w-4")} />
                  Download {previewResult.converted_format}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
