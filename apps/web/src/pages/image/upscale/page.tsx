import { ArrowLeft, Download, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import {
  upscaleImageViaBackend,
  type UpscaleResult,
} from "@/lib/image-convert-api";
import { cn } from "@/lib/utils";
import { ImageDropzone } from "@/pages/image/components/image-dropzone";

export default function UpscalePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<UpscaleResult | null>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSliderPosition(Math.round(percentage * 10) / 10);
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingSlider) return;
      handleSliderMove(e.clientX);
    };

    const handleWindowMouseUp = () => {
      if (isDraggingSlider) {
        setIsDraggingSlider(false);
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!isDraggingSlider || !e.touches[0]) return;
      handleSliderMove(e.touches[0].clientX);
    };

    const handleWindowTouchEnd = () => {
      if (isDraggingSlider) {
        setIsDraggingSlider(false);
      }
    };

    if (isDraggingSlider) {
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
      window.addEventListener("touchmove", handleWindowTouchMove);
      window.addEventListener("touchend", handleWindowTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowTouchEnd);
    };
  }, [isDraggingSlider]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  useEffect(() => {
    return () => {
      if (result?.file_url) URL.revokeObjectURL(result.file_url);
    };
  }, [result]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const processUpscale = async (selectedFile: File) => {
    setIsProcessing(true);
    setProgress(15);

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(prev + Math.floor(Math.random() * 6) + 3, 92);
      });
    }, 220);

    try {
      const res = await upscaleImageViaBackend({
        file: selectedFile,
        scale: 4,
        output_format: "webp",
        onProgress: (pct) => {
          const mapped = Math.min(Math.round(pct * 0.4), 45);
          setProgress((prev) => Math.max(prev, mapped));
        },
      });

      clearInterval(progressTimerRef.current!);
      setProgress(100);
      setResult(res);
      toast.success(
        res.scale_factor === 1
          ? "Image sharpened at its original resolution!"
          : `Image successfully enhanced to ${res.scale_factor}x HD!`,
      );
    } catch (err) {
      clearInterval(progressTimerRef.current!);
      const msg =
        err instanceof Error ? err.message : "Failed to upscale image";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
      progressTimerRef.current = null;
    }
  };

  const handleFileSelected = (selectedFile: File | null | undefined) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPG, PNG, WebP).");
      return;
    }
    setFile(selectedFile);
    setResult(null);
    setProgress(0);
    void processUpscale(selectedFile);
  };

  const handleReset = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setFile(null);
    setResult(null);
    setIsProcessing(false);
    setProgress(0);
    setSliderPosition(50);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result.file_url;
    link.download = result.file_name;
    link.click();
  };

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

        {file && (
          <button
            type="button"
            onClick={handleReset}
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
            Reset
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
          Image Upscaler
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
          Upload an image and automatically upscale it to{" "}
          <span className={cn("text-amber-500", "font-black")}>4x HD</span> with AI.
        </p>
      </div>

      {/* Upload & Process Card */}
      <div className={cn("space-y-6")}>
        {/* Dropzone */}
        <ImageDropzone
          ref={fileInputRef}
          dropzoneTitle="Click to upload or Drag & Drop image here"
          dropzoneSubtitle="Supports JPG, PNG, WebP (Max 50MB)"
          multiple={false}
          iconBg="bg-amber-400"
          disabled={isProcessing}
          onFilesSelected={(files) => handleFileSelected(files[0])}
        />

        {/* Selected Image Row */}
        {file && (
          <div
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
              "space-y-3",
            )}
          >
            {/* File Info Row */}
            <div
              className={cn("flex", "items-center", "justify-between", "gap-4")}
            >
              {/* Thumbnail + name */}
              <div className={cn("flex", "items-center", "gap-3.5", "min-w-0")}>
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
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className={cn(
                        "h-full",
                        "w-full",
                        "object-cover",
                        "rounded-lg",
                      )}
                    />
                  )}
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
                    {result ? result.file_name : file.name}
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
                    <span>{formatFileSize(file.size)}</span>
                    {result && (
                      <>
                        <span>&rarr;</span>
                        <span className={cn("text-emerald-500", "font-bold")}>
                          {formatFileSize(result.upscaled_size)}
                        </span>
                        <span
                          className={cn(
                            "text-[10px]",
                            "font-semibold",
                            "text-gray-400",
                          )}
                        >
                          ({result.upscaled_width}x{result.upscaled_height}px)
                        </span>
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
                          {result.scale_factor}x HD
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className={cn("flex", "items-center", "gap-2", "shrink-0")}>
                {result && (
                  <button
                    type="button"
                    onClick={handleDownload}
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
                )}
                {isProcessing && (
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
                    <Loader2 className={cn("h-3.5", "w-3.5", "animate-spin")} />
                    Upscaling...
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div
                className={cn(
                  "w-full",
                  "space-y-1.5",
                  "border-t-2",
                  "border-dashed",
                  "border-gray-200",
                  "dark:border-gray-800",
                  "pt-3",
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
                        "text-amber-500",
                      )}
                    />
                    Upscaling to 4x HD...
                  </span>
                  <span
                    className={cn(
                      "text-amber-600",
                      "dark:text-amber-400",
                      "font-black",
                    )}
                  >
                    {progress}%
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
                      "h-full",
                      "rounded-full",
                      "bg-amber-400",
                      "transition-all",
                      "duration-300",
                      "ease-out",
                    )}
                    style={{
                      width: `${Math.min(Math.max(progress, 5), 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Before / After Interactive Comparison Card */}
      {result && previewUrl && (
        <Card
          variant="elevated"
          rounded="3xl"
          className={cn("p-6", "sm:p-8", "space-y-6")}
        >
          {/* Header */}
          <div
            className={cn(
              "flex",
              "flex-col",
              "sm:flex-row",
              "items-start",
              "sm:items-center",
              "justify-between",
              "gap-4",
              "border-b",
              "border-gray-200",
              "dark:border-gray-800",
              "pb-4",
            )}
          >
            <div>
              <div className={cn("flex", "items-center", "gap-2")}>
                <h2
                  className={cn(
                    "text-xl",
                    "font-black",
                    "text-gray-900",
                    "dark:text-white",
                  )}
                >
                  Comparison
                </h2>
              </div>
            </div>
          </div>

          {/* Interactive Split Comparison Box */}
          <div
            ref={sliderContainerRef}
            onMouseDown={(e) => {
              setIsDraggingSlider(true);
              handleSliderMove(e.clientX);
            }}
            onTouchStart={(e) => {
              setIsDraggingSlider(true);
              if (e.touches[0]) handleSliderMove(e.touches[0].clientX);
            }}
            className={cn(
              "group/slider",
              "relative",
              "w-full",
              "h-[400px]",
              "sm:h-[520px]",
              "overflow-hidden",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-[#111317]",
              "shadow-[6px_6px_0_0_#111827]",
              "dark:shadow-[6px_6px_0_0_#000]",
              "select-none",
              "cursor-ew-resize",
            )}
          >
            {/* Background Grid Pattern */}
            <div
              className={cn(
                "absolute",
                "inset-0",
                "opacity-20",
                "pointer-events-none",
              )}
              style={{
                backgroundImage:
                  "radial-gradient(#ffffff 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />

            {/* Right Side: Adaptive HD Result (Bottom Layer) */}
            <img
              src={result.file_url}
                alt="HD result"
              draggable={false}
              className={cn(
                "absolute",
                "inset-0",
                "h-full",
                "w-full",
                "object-contain",
                "pointer-events-none",
                "select-none",
              )}
            />

            {/* Left Side: Original Image (Top Layer clipped) */}
            <div
              className={cn(
                "absolute",
                "inset-0",
                "h-full",
                "w-full",
                "pointer-events-none",
                "select-none",
                "overflow-hidden",
              )}
              style={{
                clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
              }}
            >
              <img
                src={previewUrl}
                alt="Original"
                draggable={false}
                className={cn(
                  "absolute",
                  "inset-0",
                  "h-full",
                  "w-full",
                  "object-contain",
                  "pointer-events-none",
                  "select-none",
                )}
              />
            </div>

            {/* Draggable Divider Line */}
            <div
              className={cn(
                "absolute",
                "top-0",
                "bottom-0",
                "w-1",
                "bg-white",
                "shadow-[0_0_12px_rgba(0,0,0,0.6)]",
                "pointer-events-none",
              )}
              style={{ left: `${sliderPosition}%` }}
            >
              {/* Handle Center Knob */}
              <div
                className={cn(
                  "absolute",
                  "top-1/2",
                  "-translate-y-1/2",
                  "-translate-x-1/2",
                  "flex",
                  "h-10",
                  "w-10",
                  "items-center",
                  "justify-center",
                  "rounded-full",
                  "border-3",
                  "border-gray-900",
                  "bg-amber-400",
                  "text-gray-900",
                  "shadow-[3px_3px_0_0_#111827]",
                  "transition-transform",
                  isDraggingSlider
                    ? "scale-110"
                    : "group-hover/slider:scale-105",
                )}
              >
                <svg
                  className={cn("h-5", "w-5", "stroke-[3]")}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18-6-6 6-6" />
                  <path d="m15 6 6 6-6 6" />
                </svg>
              </div>
            </div>

            {/* Left Tag: Original */}
            <div
              className={cn(
                "absolute",
                "top-4",
                "left-4",
                "flex",
                "items-center",
                "gap-2",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "bg-black/75",
                "backdrop-blur-md",
                "px-3",
                "py-1.5",
                "shadow-[2px_2px_0_0_#111827]",
                "pointer-events-none",
                "transition-opacity",
                sliderPosition < 15 ? "opacity-20" : "opacity-100",
              )}
            >
              <span className={cn("text-xs", "font-black", "text-white")}>
                Original
              </span>
              <span className={cn("text-[10px]", "font-bold", "text-gray-300")}>
                {result.original_width}x{result.original_height}
              </span>
            </div>

            {/* Right Tag: Adaptive HD */}
            <div
              className={cn(
                "absolute",
                "top-4",
                "right-4",
                "flex",
                "items-center",
                "gap-2",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "bg-amber-400",
                "px-3",
                "py-1.5",
                "shadow-[2px_2px_0_0_#111827]",
                "pointer-events-none",
                "transition-opacity",
                sliderPosition > 85 ? "opacity-20" : "opacity-100",
              )}
            >
              <span className={cn("text-xs", "font-black", "text-amber-950")}>
                HD
              </span>
              <span
                className={cn("text-[10px]", "font-bold", "text-amber-900")}
              >
                {result.upscaled_width}x{result.upscaled_height}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
