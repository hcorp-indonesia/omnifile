import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  FileArchive,
  Loader2,
  RotateCcw,
  Scissors,
  Sparkles,
  Trash2,
  Upload,
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
  upscaleImageViaBackend,
  type ConvertImageResult,
  type SupportedImageFormat,
} from "@/lib/image-convert-api";
import { cn } from "@/lib/utils";

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
  hdScale?: 2 | 4;
  isUpscaling?: boolean;
}

const availableFormats: {
  id: SupportedImageFormat;
  label: string;
  desc: string;
  badge: string;
}[] = [
  {
    id: "webp",
    label: "WebP",
    desc: "Ultra-compact for web",
    badge: "Recommended",
  },
  { id: "png", label: "PNG", desc: "Lossless with alpha", badge: "Lossless" },
  {
    id: "jpg",
    label: "JPG",
    desc: "Universal photo format",
    badge: "Universal",
  },
  {
    id: "avif",
    label: "AVIF",
    desc: "Next-gen compression",
    badge: "Next-Gen",
  },
  { id: "bmp", label: "BMP", desc: "Raw bitmap", badge: "Bitmap" },
  { id: "tiff", label: "TIFF", desc: "Print fidelity", badge: "Print" },
  { id: "ico", label: "ICO", desc: "Favicon format", badge: "Icon" },
  { id: "gif", label: "GIF", desc: "Indexed graphic", badge: "Graphic" },
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

  // HD Upscale Modal State
  const [hdModalItem, setHdModalItem] = useState<ImageFileItemState | null>(null);
  const [selectedHdScale, setSelectedHdScale] = useState<2 | 4>(2);
  const [isUpscalingGlobal, setIsUpscalingGlobal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpscaleItem = async (item: ImageFileItemState, scale: 2 | 4) => {
    if (!item.result?.file_base64) {
      toast.error("Data gambar tidak ditemukan untuk di-upscale");
      return;
    }

    try {
      setIsUpscalingGlobal(true);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isUpscaling: true } : it)),
      );
      toast.loading(`Meningkatkan resolusi ke HD ${scale}x...`, {
        id: `hd-${item.id}`,
      });

      const upscaled = await upscaleImageViaBackend({
        file_base64: item.result.file_base64,
        scale: scale,
        output_format:
          targetFormat === "jpg"
            ? "jpg"
            : targetFormat === "webp"
              ? "webp"
              : "png",
        output_file_name:
          item.result.file_name.replace(/\.[^/.]+$/, "") +
          `_hd_${scale}x.${targetFormat}`,
      });

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== item.id) return it;
          return {
            ...it,
            isUpscaling: false,
            hdScale: scale,
            result: {
              ...it.result!,
              file_name: upscaled.file_name,
              converted_size: upscaled.upscaled_size,
              converted_width: upscaled.upscaled_width,
              converted_height: upscaled.upscaled_height,
              file_base64: upscaled.file_base64,
              mime_type: upscaled.mime_type,
            },
          };
        }),
      );

      toast.success(
        `Berhasil ditingkatkan ke HD ${scale}x (${upscaled.upscaled_width} x ${upscaled.upscaled_height})!`,
        { id: `hd-${item.id}` },
      );
      setHdModalItem(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal meningkatkan ke HD";
      toast.error(msg, { id: `hd-${item.id}` });
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isUpscaling: false } : it)),
      );
    } finally {
      setIsUpscalingGlobal(false);
    }
  };

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

  const handleFilesSelected = (rawFiles: FileList | File[] | null) => {
    if (!rawFiles || rawFiles.length === 0) return;

    const fileArray = Array.from(rawFiles);
    const validImageFiles = fileArray.filter(
      (f) =>
        f.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|avif|bmp|tiff?|gif|ico|heic|heif|svg)$/i.test(
          f.name,
        ),
    );

    if (validImageFiles.length === 0) {
      toast.error(
        "Please upload valid image files (JPG, PNG, WebP, AVIF, BMP, TIFF, GIF, ICO)",
      );
      return;
    }

    const newItems: ImageFileItemState[] = validImageFiles.map((file, idx) => ({
      file,
      id: `${file.name}-${file.lastModified}-${Date.now()}-${idx}`,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
    }));

    setItems((prev) => [...prev, ...newItems]);
    toast.info(
      `Added ${validImageFiles.length} image${validImageFiles.length > 1 ? "s" : ""} to list.`,
    );
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

  const handleConvertAll = async () => {
    const pendingItems = items.filter((it) => it.status !== "done");
    if (pendingItems.length === 0 && items.length > 0) {
      toast.info(
        "All images are already converted! Choose a different format or add new files.",
      );
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one image to convert.");
      return;
    }

    setIsProcessing(true);
    let currentPool = [...items];

    const convertOptions = {
      target_format: targetFormat,
      quality: 85,
      remove_bg: removeBg,
    };

    let successCount = 0;
    for (let i = 0; i < items.length; i++) {
      const target = items[i];
      if (target.status === "done") continue;

      currentPool = currentPool.map((it) =>
        it.id === target.id
          ? { ...it, status: "converting", progress: 20 }
          : it,
      );
      setItems([...currentPool]);

      try {
        const res = await convertImageViaBackend(
          target.file,
          convertOptions,
          (pct) => {
            currentPool = currentPool.map((it) =>
              it.id === target.id ? { ...it, progress: pct } : it,
            );
            setItems([...currentPool]);
          },
        );

        currentPool = currentPool.map((it) =>
          it.id === target.id
            ? { ...it, status: "done", result: res, progress: 100 }
            : it,
        );
        setItems([...currentPool]);
        successCount++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Conversion failed";
        currentPool = currentPool.map((it) =>
          it.id === target.id
            ? { ...it, status: "error", errorMessage: errMsg }
            : it,
        );
        setItems([...currentPool]);
      }
    }

    setIsProcessing(false);
    if (successCount > 0) {
      toast.success(
        `Successfully converted ${successCount} image${successCount > 1 ? "s" : ""} to ${targetFormat.toUpperCase()}!`,
      );
    }
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
            WebP, PNG, JPG, AVIF, BMP, TIFF, ICO
          </span>{" "}
          with instant previews and batch ZIP download.
        </p>
      </div>

      {/* 1. TARGET FORMAT */}
      <Card
        variant="elevated"
        rounded="3xl"
        className={cn("p-6", "sm:p-8", "space-y-6")}
      >
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
            Target Format
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
                onClick={() => setTargetFormat(fmt.id)}
                className={cn(
                  "flex",
                  "flex-col",
                  "justify-between",
                  "p-4",
                  "rounded-2xl",
                  "border-3",
                  "border-gray-900",
                  "text-left",
                  "transition-all",
                  "cursor-pointer",
                  isSelected
                    ? "bg-purple-400 text-gray-900 shadow-[4px_4px_0_0_#111827] -translate-y-1 dark:shadow-[4px_4px_0_0_#000]"
                    : "bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#1a1c22] dark:text-gray-200 dark:hover:bg-[#232630]",
                )}
              >
                <div
                  className={cn(
                    "flex",
                    "items-center",
                    "justify-between",
                    "w-full",
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
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-lg font-black border border-gray-900",
                      isSelected
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
                    )}
                  >
                    {fmt.badge}
                  </span>
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-semibold leading-relaxed",
                    isSelected
                      ? "text-gray-900"
                      : "text-gray-500 dark:text-gray-400",
                  )}
                >
                  {fmt.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* AI Background Removal Toggle */}
        <div
          className={cn(
            "flex",
            "flex-col",
            "sm:flex-row",
            "sm:items-center",
            "justify-between",
            "gap-4",
            "p-4",
            "sm:p-5",
            "rounded-2xl",
            "border-3",
            "border-gray-900",
            "transition-all",
            removeBg
              ? "bg-purple-100 dark:bg-purple-950/40 border-purple-900 shadow-[3px_3px_0_0_#7e22ce]"
              : "bg-gray-50 dark:bg-[#1f222a] border-gray-900 shadow-[3px_3px_0_0_#111827] dark:shadow-[3px_3px_0_0_#000]",
          )}
        >
          <div className={cn("flex", "items-center", "gap-3.5")}>
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
                "shadow-[2px_2px_0_0_#111827]",
                removeBg ? "bg-purple-400" : "bg-white dark:bg-gray-800",
              )}
            >
              <Scissors className={cn("h-6", "w-6", "text-gray-900", "dark:text-white")} />
            </div>
            <div>
              <div className={cn("flex", "items-center", "gap-2")}>
                <span className={cn("text-base", "font-black", "text-gray-900", "dark:text-white")}>
                  Bersihkan Background AI (Transparan)
                </span>
                <span className={cn("rounded-md", "border", "border-purple-900", "bg-purple-300", "px-2", "py-0.5", "text-[10px]", "font-black", "text-purple-950")}>
                  AI Model
                </span>
              </div>
              <p className={cn("text-xs", "text-gray-500", "dark:text-gray-400", "mt-0.5")}>
                Otomatis hilangkan background gambar menjadi pixel transparan (*alpha channel*) saat konversi.
              </p>
            </div>
          </div>

          {/* Active status indicator badge (no toggle) */}
          <div
            className={cn(
              "flex",
              "items-center",
              "gap-2",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "bg-emerald-300",
              "dark:bg-emerald-400",
              "px-3.5",
              "py-1.5",
              "shadow-[2px_2px_0_0_#111827]",
              "self-start",
              "sm:self-center",
            )}
          >
            <span className={cn("relative", "flex", "h-2.5", "w-2.5")}>
              <span className={cn("animate-ping", "absolute", "inline-flex", "h-full", "w-full", "rounded-full", "bg-emerald-950", "opacity-75")}></span>
              <span className={cn("relative", "inline-flex", "rounded-full", "h-2.5", "w-2.5", "bg-emerald-950")}></span>
            </span>
            <span className={cn("text-xs", "font-black", "text-gray-900", "uppercase", "tracking-wide")}>
              Selalu Aktif
            </span>
          </div>
        </div>
      </Card>

      {/* 2. UPLOAD & CONVERT */}
      <Card
        variant="elevated"
        rounded="3xl"
        className={cn("p-6", "sm:p-8", "space-y-6")}
      >
        {/* Dropzone Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesSelected(e.dataTransfer.files);
          }}
          className={cn(
            "relative",
            "flex",
            "min-h-52",
            "cursor-pointer",
            "flex-col",
            "items-center",
            "justify-center",
            "overflow-hidden",
            "rounded-3xl",
            "border-3",
            "border-dashed",
            "border-gray-300",
            "bg-gray-50/70",
            "p-8",
            "text-center",
            "transition-all",
            "hover:border-emerald-500",
            "hover:bg-emerald-50/30",
            "dark:border-gray-700",
            "dark:bg-[#1a1c22]",
            "dark:hover:border-emerald-400",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          <div
            className={cn(
              "mx-auto",
              "mb-3",
              "flex",
              "h-16",
              "w-16",
              "items-center",
              "justify-center",
              "rounded-2xl",
              "border-3",
              "border-gray-900",
              "bg-yellow-400",
              "shadow-[3px_3px_0_0_#111827]",
            )}
          >
            <Upload className={cn("h-8", "w-8", "text-gray-900")} />
          </div>
          <p
            className={cn(
              "text-lg",
              "font-black",
              "text-gray-900",
              "dark:text-white",
            )}
          >
            Click to upload or Drag & Drop images here
          </p>
          <p
            className={cn(
              "mt-1",
              "text-xs",
              "font-semibold",
              "text-gray-500",
              "dark:text-gray-400",
            )}
          >
            Supports multiple PNG, JPG, JPEG, WEBP, AVIF, BMP, TIFF, GIF, ICO
            (Max 50MB per file)
          </p>
        </div>

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
                    "sm:flex-row",
                    "items-start",
                    "sm:items-center",
                    "justify-between",
                    "gap-4",
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
                  {/* Left: Thumbnail & Info */}
                  <div
                    className={cn("flex", "items-center", "gap-3.5", "min-w-0")}
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
                            <span className={cn("text-[10px]", "font-semibold", "text-gray-400")}>
                              ({item.result.converted_width}x{item.result.converted_height}px)
                            </span>
                            {item.hdScale && (
                              <span
                                className={cn(
                                  "rounded",
                                  "border",
                                  "border-gray-900",
                                  "bg-amber-400",
                                  "px-1.5",
                                  "py-0.5",
                                  "text-[10px]",
                                  "font-black",
                                  "text-gray-900",
                                  "shadow-[1px_1px_0_0_#111827]",
                                )}
                              >
                                HD {item.hdScale}x ✨
                              </span>
                            )}
                            {item.result.saved_percentage > 0 && !item.hdScale && (
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
                        {/* HD Upscale Action Button */}
                        <button
                          type="button"
                          disabled={item.isUpscaling}
                          onClick={() => setHdModalItem(item)}
                          className={cn(
                            "flex",
                            "items-center",
                            "gap-1.5",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "px-3",
                            "py-1.5",
                            "text-xs",
                            "font-black",
                            "transition-all",
                            "cursor-pointer",
                            "shadow-[2px_2px_0_0_#111827]",
                            "hover:-translate-y-0.5",
                            item.hdScale
                              ? "bg-amber-300 text-gray-900 hover:bg-amber-400"
                              : "bg-yellow-400 text-gray-900 hover:bg-yellow-300",
                            item.isUpscaling && "opacity-75 cursor-not-allowed",
                          )}
                          title="Tingkatkan resolusi gambar ke HD"
                        >
                          {item.isUpscaling ? (
                            <>
                              <Loader2 className={cn("h-3.5", "w-3.5", "animate-spin")} />
                              <span>Upscaling...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className={cn("h-3.5", "w-3.5", "text-gray-900")} />
                              <span>{item.hdScale ? `HD ${item.hdScale}x Aktif` : "Tingkatkan HD ✨"}</span>
                            </>
                          )}
                        </button>

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
                            "items-center",
                            "gap-1.5",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "bg-emerald-400",
                            "px-3",
                            "py-1.5",
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
              ))}
            </div>
          </div>
        )}

        {/* Actions: ZIP + Convert Now */}
        <div
          className={cn(
            "pt-4",
            "flex",
            "flex-wrap",
            "items-center",
            "justify-end",
            "gap-3",
            "border-t",
            "border-gray-200",
            "dark:border-gray-800",
          )}
        >
          {completedCount > 1 && (
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
                "px-5",
                "py-3",
                "text-sm",
                "font-black",
                "text-gray-900",
                "shadow-[3px_3px_0_0_#111827]",
                "hover:-translate-y-0.5",
                "transition-all",
                "cursor-pointer",
              )}
            >
              <FileArchive className={cn("h-4", "w-4")} />
              Download All as ZIP
            </button>
          )}

          <button
            type="button"
            disabled={isProcessing || items.length === 0}
            onClick={handleConvertAll}
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
              "bg-purple-400",
              "px-7",
              "py-3.5",
              "text-base",
              "font-black",
              "text-gray-900",
              "shadow-[4px_4px_0_0_#111827]",
              "transition-all",
              "hover:-translate-y-1",
              "hover:bg-purple-500",
              "disabled:cursor-not-allowed",
              "disabled:bg-gray-200",
              "disabled:text-gray-400",
              "disabled:shadow-none",
              "cursor-pointer",
              "dark:border-gray-700",
              "dark:shadow-[4px_4px_0_0_#000]",
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className={cn("h-5", "w-5", "animate-spin")} />
                Converting Images...
              </>
            ) : (
              <>Convert Now</>
            )}
          </button>
        </div>
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

      {/* HD Upscale Confirmation Modal */}
      {hdModalItem && hdModalItem.result && (
        <div
          className={cn(
            "fixed",
            "inset-0",
            "z-50",
            "flex",
            "items-center",
            "justify-center",
            "bg-black/60",
            "backdrop-blur-sm",
            "p-4",
            "animate-in",
            "fade-in",
          )}
        >
          <div
            className={cn(
              "relative",
              "w-full",
              "max-w-md",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "bg-white",
              "p-6",
              "shadow-[6px_6px_0_0_#111827]",
              "dark:border-gray-700",
              "dark:bg-[#1a1c22]",
              "space-y-5",
            )}
          >
            {/* Modal Header */}
            <div className={cn("flex", "items-center", "justify-between")}>
              <div className={cn("flex", "items-center", "gap-2.5")}>
                <div
                  className={cn(
                    "flex",
                    "h-10",
                    "w-10",
                    "items-center",
                    "justify-center",
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "bg-amber-400",
                    "shadow-[2px_2px_0_0_#111827]",
                  )}
                >
                  <Sparkles className={cn("h-5", "w-5", "text-gray-900")} />
                </div>
                <div>
                  <h3
                    className={cn(
                      "text-base",
                      "font-black",
                      "text-gray-900",
                      "dark:text-white",
                    )}
                  >
                    Tingkatkan Resolusi ke HD
                  </h3>
                  <p
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-gray-500",
                      "dark:text-gray-400",
                    )}
                  >
                    AI & Super Resolution Enhancer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHdModalItem(null)}
                className={cn(
                  "flex",
                  "h-8",
                  "w-8",
                  "items-center",
                  "justify-center",
                  "rounded-lg",
                  "border-2",
                  "border-gray-900",
                  "bg-gray-100",
                  "hover:bg-gray-200",
                  "cursor-pointer",
                  "dark:bg-gray-800",
                  "dark:text-white",
                )}
              >
                <X className={cn("h-4", "w-4")} />
              </button>
            </div>

            {/* Current vs Target Info */}
            <div
              className={cn(
                "rounded-2xl",
                "border-2",
                "border-gray-900",
                "bg-amber-50",
                "p-4",
                "dark:bg-amber-950/30",
                "dark:border-amber-800",
                "space-y-2",
              )}
            >
              <p
                className={cn(
                  "truncate",
                  "text-xs",
                  "font-bold",
                  "text-gray-700",
                  "dark:text-gray-300",
                )}
              >
                File:{" "}
                <span className={cn("font-black text-gray-900 dark:text-white")}>
                  {hdModalItem.result.file_name}
                </span>
              </p>
              <div
                className={cn(
                  "flex",
                  "items-center",
                  "justify-between",
                  "text-xs",
                  "font-bold",
                )}
              >
                <span className={cn("text-gray-600 dark:text-gray-400")}>
                  Resolusi Saat Ini:
                </span>
                <span className={cn("font-black text-gray-900 dark:text-white")}>
                  {hdModalItem.result.converted_width} x{" "}
                  {hdModalItem.result.converted_height} px
                </span>
              </div>
              <div
                className={cn(
                  "flex",
                  "items-center",
                  "justify-between",
                  "text-xs",
                  "font-bold",
                  "text-amber-800",
                  "dark:text-amber-300",
                )}
              >
                <span>Hasil Setelah HD ({selectedHdScale}x):</span>
                <span className={cn("font-black")}>
                  {hdModalItem.result.converted_width * selectedHdScale} x{" "}
                  {hdModalItem.result.converted_height * selectedHdScale} px
                </span>
              </div>
            </div>

            {/* Scale Options */}
            <div className={cn("space-y-2")}>
              <label
                className={cn(
                  "text-xs",
                  "font-black",
                  "text-gray-700",
                  "dark:text-gray-300",
                )}
              >
                Pilih Kualitas HD:
              </label>
              <div className={cn("grid", "grid-cols-2", "gap-3")}>
                <button
                  type="button"
                  onClick={() => setSelectedHdScale(2)}
                  className={cn(
                    "flex",
                    "flex-col",
                    "p-3.5",
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "text-left",
                    "cursor-pointer",
                    "transition-all",
                    selectedHdScale === 2
                      ? "bg-amber-300 text-gray-900 shadow-[3px_3px_0_0_#111827] -translate-y-0.5"
                      : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#232630] dark:text-gray-300",
                  )}
                >
                  <div className={cn("flex", "items-center", "justify-between")}>
                    <span className={cn("text-sm", "font-black")}>2x HD</span>
                    {selectedHdScale === 2 && (
                      <Check className={cn("h-4", "w-4")} />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[11px]",
                      "font-semibold",
                      "text-gray-600",
                      "dark:text-gray-400",
                      "mt-1",
                    )}
                  >
                    Tajam & Cepat
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHdScale(4)}
                  className={cn(
                    "flex",
                    "flex-col",
                    "p-3.5",
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "text-left",
                    "cursor-pointer",
                    "transition-all",
                    selectedHdScale === 4
                      ? "bg-amber-300 text-gray-900 shadow-[3px_3px_0_0_#111827] -translate-y-0.5"
                      : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#232630] dark:text-gray-300",
                  )}
                >
                  <div className={cn("flex", "items-center", "justify-between")}>
                    <span className={cn("text-sm", "font-black")}>
                      4x Ultra HD
                    </span>
                    {selectedHdScale === 4 && (
                      <Check className={cn("h-4", "w-4")} />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[11px]",
                      "font-semibold",
                      "text-gray-600",
                      "dark:text-gray-400",
                      "mt-1",
                    )}
                  >
                    Detail Maksimal
                  </span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div
              className={cn(
                "flex",
                "items-center",
                "justify-end",
                "gap-3",
                "pt-2",
              )}
            >
              <button
                type="button"
                onClick={() => setHdModalItem(null)}
                className={cn(
                  "rounded-xl",
                  "border-2",
                  "border-gray-900",
                  "bg-gray-100",
                  "px-4",
                  "py-2.5",
                  "text-xs",
                  "font-bold",
                  "hover:bg-gray-200",
                  "cursor-pointer",
                  "dark:bg-gray-800",
                  "dark:text-white",
                )}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isUpscalingGlobal}
                onClick={() => handleUpscaleItem(hdModalItem, selectedHdScale)}
                className={cn(
                  "flex",
                  "items-center",
                  "gap-2",
                  "rounded-xl",
                  "border-2",
                  "border-gray-900",
                  "bg-amber-400",
                  "px-5",
                  "py-2.5",
                  "text-xs",
                  "font-black",
                  "text-gray-900",
                  "shadow-[3px_3px_0_0_#111827]",
                  "hover:-translate-y-0.5",
                  "hover:bg-amber-300",
                  "transition-all",
                  "cursor-pointer",
                  isUpscalingGlobal && "opacity-75 cursor-not-allowed",
                )}
              >
                {isUpscalingGlobal ? (
                  <>
                    <Loader2 className={cn("h-4", "w-4", "animate-spin")} />
                    <span>Memproses HD...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className={cn("h-4", "w-4")} />
                    <span>Terapkan HD {selectedHdScale}x ✨</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
