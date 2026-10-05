import { ArrowLeft, Download, Minimize2, RefreshCw, RotateCcw, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  convertImageViaBackend,
  downloadImageResult,
  type ConvertImageResult,
  type SupportedImageFormat,
} from "@/lib/image-convert-api";
import { cn } from "@/lib/utils";
import { ImageDropzone } from "@/pages/image/components/image-dropzone";
import { ImageProcessingCard } from "@/pages/image/components/image-processing-card";

type CompressStatus = "pending" | "processing" | "done" | "error";

interface CompressItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: CompressStatus;
  targetBytes?: number;
  result?: ConvertImageResult;
  errorMessage?: string;
}

type CompressionMode = "default" | "custom";
type SizeUnit = "KB" | "MB";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${Number((bytes / 1024 ** unitIndex).toFixed(1))} ${units[unitIndex]}`;
}

function getTargetFormat(fileName: string): SupportedImageFormat {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (
    extension === "png" ||
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "webp" ||
    extension === "avif"
  ) {
    return extension;
  }
  return "webp";
}

async function compressToTarget(
  file: File,
  targetBytes: number,
  baseName: string,
  onProgress: (progress: number) => void,
): Promise<ConvertImageResult> {
  let minimumQuality = 10;
  let maximumQuality = 90;
  let bestResult: ConvertImageResult | undefined;
  let smallestResult: ConvertImageResult | undefined;

  for (let attempt = 0; attempt < 4; attempt++) {
    const quality = Math.round((minimumQuality + maximumQuality) / 2);
    const result = await convertImageViaBackend(file, {
      target_format: "webp",
      quality,
      output_file_name: `${baseName}_compressed.webp`,
    });
    onProgress(20 + attempt * 15);

    if (!smallestResult || result.converted_size < smallestResult.converted_size) {
      smallestResult = result;
    }
    if (result.converted_size <= targetBytes) {
      bestResult = result;
      minimumQuality = quality + 1;
    } else {
      maximumQuality = quality - 1;
    }
  }

  let result = bestResult ?? smallestResult;
  if (!result) throw new Error("Unable to compress this image.");

  for (let attempt = 0; result.converted_size > targetBytes && attempt < 2; attempt++) {
    const scale = Math.min(
      0.9,
      Math.max(0.2, Math.sqrt(targetBytes / result.converted_size) * 0.9),
    );
    const width = Math.max(64, Math.round(result.converted_width * scale));
    const height = Math.max(64, Math.round(result.converted_height * scale));
    result = await convertImageViaBackend(file, {
      target_format: "webp",
      quality: 55,
      width,
      height,
      output_file_name: `${baseName}_compressed.webp`,
    });
    onProgress(80 + attempt * 10);
  }

  return result;
}

export default function CompressImagePage() {
  const [items, setItems] = useState<CompressItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionMode, setCompressionMode] = useState<CompressionMode>("default");
  const [targetSize, setTargetSize] = useState("500");
  const [targetUnit, setTargetUnit] = useState<SizeUnit>("KB");
  const itemsRef = useRef<CompressItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const processItems = async (targets: CompressItem[]) => {
    if (targets.length === 0) return;
    setIsProcessing(true);
    let successCount = 0;

    for (const target of targets) {
      setItems((current) =>
        current.map((item) =>
          item.id === target.id
            ? { ...item, status: "processing", progress: 10, errorMessage: undefined }
            : item,
        ),
      );

      try {
        const baseName = target.file.name.replace(/\.[^.]+$/, "") || "image";
        const updateProgress = (percentage: number) => {
          setItems((current) =>
            current.map((item) =>
              item.id === target.id
                ? { ...item, progress: Math.max(10, Math.min(percentage, 95)) }
                : item,
            ),
          );
        };
        const result = target.targetBytes
          ? await compressToTarget(target.file, target.targetBytes, baseName, updateProgress)
          : await convertImageViaBackend(
              target.file,
              {
                target_format: getTargetFormat(target.file.name),
                quality: 80,
                output_file_name: `${baseName}_compressed.${getTargetFormat(target.file.name)}`,
              },
              updateProgress,
            );

        setItems((current) =>
          current.map((item) =>
            item.id === target.id
              ? { ...item, status: "done", progress: 100, result }
              : item,
          ),
        );
        successCount++;
      } catch (error) {
        setItems((current) =>
          current.map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  status: "error",
                  progress: 0,
                  errorMessage:
                    error instanceof Error ? error.message : "Compression failed",
                }
              : item,
          ),
        );
      }
    }

    setIsProcessing(false);
    if (successCount > 0) {
      toast.success(`${successCount} image${successCount > 1 ? "s" : ""} compressed.`);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    const validFiles = files.filter((file) =>
      /\.(jpe?g|png|webp|avif)$/i.test(file.name),
    );
    if (validFiles.length === 0) {
      toast.error("Please select JPG, PNG, WebP, or AVIF images.");
      return;
    }

    const parsedTarget = Number(targetSize);
    if (compressionMode === "custom" && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      toast.error("Enter a valid target file size.");
      return;
    }
    const targetBytes =
      compressionMode === "custom"
        ? Math.round(parsedTarget * (targetUnit === "MB" ? 1024 * 1024 : 1024))
        : undefined;

    const timestamp = Date.now();
    const newItems = validFiles.map<CompressItem>((file, index) => ({
      id: `${file.name}-${file.lastModified}-${timestamp}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: "pending",
      targetBytes,
    }));
    setItems((current) => [...current, ...newItems]);
    void processItems(newItems);
  };

  const removeItem = (id: string) => {
    const target = items.find((item) => item.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const clearItems = () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
  };

  return (
    <div className={cn("mx-auto", "max-w-5xl", "space-y-6", "py-4", "pb-24")}>
      <div className={cn("flex", "items-center", "justify-between", "gap-3")}>
        <Link
          to="/image"
          className={cn(
            "inline-flex",
            "items-center",
            "gap-2",
            "rounded-xl",
            "border-3",
            "border-gray-900",
            "bg-white",
            "px-4",
            "py-2",
            "text-xs",
            "font-black",
            "shadow-[3px_3px_0_0_#111827]",
            "transition-transform",
            "hover:-translate-y-0.5",
          )}
        >
          <ArrowLeft className={cn("h-4", "w-4")} />
          Back
        </Link>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearItems}
            disabled={isProcessing}
            className={cn(
              "inline-flex",
              "items-center",
              "gap-2",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "bg-gray-100",
              "px-3",
              "py-2",
              "text-xs",
              "font-black",
              "hover:bg-gray-200",
              "disabled:opacity-50",
            )}
          >
            <RefreshCw className={cn("h-4", "w-4")} />
            Clear All
          </button>
        )}
      </div>

      <div className={cn("space-y-3", "text-center")}>
        <div
          className={cn(
            "mx-auto",
            "flex",
            "h-16",
            "w-16",
            "items-center",
            "justify-center",
            "rounded-2xl",
            "border-3",
            "border-gray-900",
            "bg-rose-300",
            "shadow-[4px_4px_0_0_#111827]",
          )}
        >
          <Minimize2 className={cn("h-8", "w-8", "text-gray-900")} />
        </div>
        <h1 className={cn("text-4xl", "font-black", "text-gray-900", "dark:text-white", "md:text-5xl")}>
          Compress Image
        </h1>
        <p className={cn("mx-auto", "max-w-2xl", "text-sm", "font-semibold", "text-gray-600", "dark:text-gray-400")}>
          Upload images and automatically reduce their file size with balanced quality.
        </p>
      </div>

      <section className={cn("space-y-4", "rounded-2xl", "border-3", "border-gray-900", "bg-white", "p-5", "shadow-[4px_4px_0_0_#111827]", "dark:border-gray-700", "dark:bg-[#16181d]", "dark:shadow-[4px_4px_0_0_#000]")}>
        <div className={cn("flex", "items-center", "gap-2")}>
          <Target className={cn("h-5", "w-5", "text-rose-500")} />
          <div>
            <h2 className={cn("text-sm", "font-black", "text-gray-900", "dark:text-white")}>Target file size</h2>
            <p className={cn("text-xs", "font-semibold", "text-gray-500", "dark:text-gray-400")}>Choose automatic compression or set a target in KB or MB.</p>
          </div>
        </div>
        <div className={cn("grid", "gap-3", "sm:grid-cols-2")}>
          {(["default", "custom"] as CompressionMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setCompressionMode(mode)}
              disabled={isProcessing}
              className={cn(
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "px-4",
                "py-3",
                "text-left",
                "transition-all",
                mode === compressionMode
                  ? "bg-rose-300 shadow-[3px_3px_0_0_#111827]"
                  : "bg-gray-50 hover:bg-gray-100 dark:bg-[#1e222a]",
                "disabled:opacity-50",
              )}
            >
              <span className={cn("block", "text-sm", "font-black", "text-gray-900", "dark:text-white")}>
                {mode === "default" ? "Default" : "Custom size"}
              </span>
              <span className={cn("mt-0.5", "block", "text-xs", "font-semibold", "text-gray-500", "dark:text-gray-400")}>
                {mode === "default" ? "Balanced quality at 80%" : "Best effort near your target"}
              </span>
            </button>
          ))}
        </div>
        {compressionMode === "custom" && (
          <div className={cn("flex", "items-stretch", "gap-2")}>
            <input
              type="number"
              min="1"
              step="1"
              value={targetSize}
              onChange={(event) => setTargetSize(event.target.value)}
              disabled={isProcessing}
              aria-label="Target file size"
              className={cn("min-w-0", "flex-1", "rounded-xl", "border-2", "border-gray-900", "bg-white", "px-4", "py-3", "text-sm", "font-black", "text-gray-900", "outline-none", "focus:ring-3", "focus:ring-rose-200", "dark:border-gray-700", "dark:bg-[#1e222a]", "dark:text-white")}
            />
            <div className={cn("grid", "grid-cols-2", "overflow-hidden", "rounded-xl", "border-2", "border-gray-900")}>
              {(["KB", "MB"] as SizeUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setTargetUnit(unit)}
                  disabled={isProcessing}
                  className={cn("px-4", "text-xs", "font-black", "transition-colors", unit === targetUnit ? "bg-yellow-300 text-gray-900" : "bg-white text-gray-500 hover:bg-gray-100 dark:bg-[#1e222a]")}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <ImageDropzone
        dropzoneTitle="Click or Drag & Drop images here"
        dropzoneSubtitle="Supports multiple JPG, PNG, WebP, and AVIF files"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={true}
        disabled={isProcessing}
        onFilesSelected={handleFilesSelected}
      />

      {items.length > 0 && (
        <div className={cn("space-y-3")}>
            {items.map((item, index) => {
              const result = item.result;
              const preview = result
                ? `data:${result.mime_type};base64,${result.file_base64}`
                : item.previewUrl;
              return (
                <ImageProcessingCard
                  key={item.id}
                  index={index}
                  thumbnailUrl={preview}
                  fileName={result?.file_name ?? item.file.name}
                  metadata={
                    result
                      ? `${formatFileSize(item.file.size)} → ${formatFileSize(result.converted_size)} • ${Math.max(result.saved_percentage, 0).toFixed(1)}% smaller`
                      : `${formatFileSize(item.file.size)}${item.targetBytes ? ` • Target ≤ ${formatFileSize(item.targetBytes)}` : ""}`
                  }
                  status={item.status}
                  progress={item.progress}
                  processingLabel="Compressing..."
                  progressLabel="Optimizing image size"
                  errorMessage={item.errorMessage}
                  onRemove={() => removeItem(item.id)}
                  removeDisabled={isProcessing}
                  actions={
                    <>
                      {item.status === "error" && (
                        <button
                          type="button"
                          onClick={() => void processItems([item])}
                          disabled={isProcessing}
                          className={cn("inline-flex", "items-center", "gap-2", "rounded-xl", "border-2", "border-gray-900", "bg-yellow-300", "px-3", "py-2", "text-xs", "font-black")}
                        >
                          <RotateCcw className={cn("h-4", "w-4")} />
                          Try Again
                        </button>
                      )}
                      {item.status === "done" && result && (
                        <button
                          type="button"
                          onClick={() => downloadImageResult(result)}
                          className={cn("inline-flex", "items-center", "gap-2", "rounded-xl", "border-2", "border-gray-900", "bg-emerald-400", "px-3", "py-2", "text-xs", "font-black", "shadow-[2px_2px_0_0_#111827]", "transition-transform", "hover:-translate-y-0.5")}
                        >
                          <Download className={cn("h-4", "w-4")} />
                          Download
                        </button>
                      )}
                    </>
                  }
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
