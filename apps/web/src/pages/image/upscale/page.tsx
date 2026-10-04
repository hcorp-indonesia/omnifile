import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import {
  downloadImageResult,
  upscaleImageViaBackend,
  type ConvertImageResult,
  type UpscaleResult,
} from "@/lib/image-convert-api";
import { cn } from "@/lib/utils";

export default function UpscalePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scale, setScale] = useState<2 | 4>(2);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [result, setResult] = useState<UpscaleResult | null>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith("image/")) {
        toast.error("Please upload a valid image file (JPG, PNG, WebP).");
        return;
      }
      setFile(selected);
      setResult(null);
    }
  };

  const handleProcessUpscale = async () => {
    if (!file) {
      toast.error("Silakan pilih gambar terlebih dahulu.");
      return;
    }

    try {
      setIsProcessing(true);
      setUploadProgress(15);
      const res = await upscaleImageViaBackend({
        file: file,
        scale: scale,
        output_format: "png",
        onProgress: (pct) => setUploadProgress(pct),
      });

      setResult(res);
      toast.success(`Gambar berhasil ditingkatkan ke ${scale}x HD!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal melakukan upscale gambar";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = () => {
    if (!result) return;
    const convResult: ConvertImageResult = {
      file_name: result.file_name,
      original_format: result.original_format,
      converted_format: result.converted_format,
      original_size: result.original_size,
      converted_size: result.upscaled_size,
      saved_bytes: result.original_size - result.upscaled_size,
      saved_percentage: 0,
      original_width: result.original_width,
      original_height: result.original_height,
      converted_width: result.upscaled_width,
      converted_height: result.upscaled_height,
      mime_type: result.mime_type,
      file_base64: result.file_base64,
    };
    downloadImageResult(convResult);
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
          <span>Kembali ke Image Tools</span>
        </Link>

        {file && (
          <button
            type="button"
            onClick={handleReset}
            className={cn(
              "inline-flex",
              "items-center",
              "gap-1.5",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "bg-gray-100",
              "px-3",
              "py-1.5",
              "text-xs",
              "font-bold",
              "text-gray-800",
              "hover:bg-gray-200",
              "cursor-pointer",
              "dark:border-gray-700",
              "dark:bg-gray-800",
              "dark:text-gray-200",
            )}
          >
            <RefreshCw className={cn("h-3.5", "w-3.5")} />
            Reset
          </button>
        )}
      </div>

      {/* Header Section */}
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
            "bg-amber-400",
            "shadow-[4px_4px_0_0_#111827]",
          )}
        >
          <Sparkles className={cn("h-8", "w-8", "text-gray-900")} />
        </div>
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
          Image Upscaler HD
        </h1>
        <p
          className={cn(
            "mx-auto",
            "max-w-2xl",
            "text-sm",
            "font-semibold",
            "text-gray-600",
            "dark:text-gray-400",
            "md:text-base",
          )}
        >
          Tingkatkan resolusi dan ketajaman foto ke resolusi{" "}
          <span className={cn("text-amber-500", "font-black")}>
            HD 2x atau Ultra HD 4x
          </span>{" "}
          secara instan tanpa kehilangan detail.
        </p>
      </div>

      {/* Main Grid */}
      <div className={cn("grid", "grid-cols-1", "lg:grid-cols-12", "gap-6")}>
        {/* Left Column: Upload / Settings */}
        <div className={cn("lg:col-span-5", "space-y-6")}>
          <Card
            variant="elevated"
            rounded="3xl"
            className={cn("p-6", "space-y-6")}
          >
            {/* Upload Area */}
            <div>
              <label
                className={cn(
                  "block",
                  "text-sm",
                  "font-black",
                  "text-gray-900",
                  "dark:text-white",
                  "mb-2",
                )}
              >
                Pilih Foto
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={cn("hidden")}
              />

              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex",
                    "flex-col",
                    "items-center",
                    "justify-center",
                    "min-h-52",
                    "rounded-2xl",
                    "border-3",
                    "border-dashed",
                    "border-gray-900",
                    "bg-amber-50",
                    "p-6",
                    "text-center",
                    "cursor-pointer",
                    "transition-all",
                    "hover:bg-amber-100",
                    "dark:border-gray-700",
                    "dark:bg-[#1f222a]",
                  )}
                >
                  <div
                    className={cn(
                      "flex",
                      "h-14",
                      "w-14",
                      "items-center",
                      "justify-center",
                      "rounded-xl",
                      "border-2",
                      "border-gray-900",
                      "bg-amber-400",
                      "shadow-[2px_2px_0_0_#111827]",
                      "mb-3",
                    )}
                  >
                    <Upload className={cn("h-7", "w-7", "text-gray-900")} />
                  </div>
                  <p className={cn("text-base", "font-black", "text-gray-900", "dark:text-white")}>
                    Klik atau Drop Foto di sini
                  </p>
                  <p className={cn("text-xs", "font-semibold", "text-gray-500", "dark:text-gray-400", "mt-1")}>
                    Mendukung JPG, PNG, WebP (Max 50MB)
                  </p>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-3.5",
                    "p-4",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "bg-white",
                    "dark:border-gray-700",
                    "dark:bg-[#1a1c22]",
                    "shadow-[3px_3px_0_0_#111827]",
                  )}
                >
                  <div
                    className={cn(
                      "h-14",
                      "w-14",
                      "shrink-0",
                      "overflow-hidden",
                      "rounded-xl",
                      "border-2",
                      "border-gray-900",
                      "bg-gray-100",
                    )}
                  >
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Upload preview"
                        className={cn("h-full", "w-full", "object-cover")}
                      />
                    )}
                  </div>
                  <div className={cn("min-w-0", "flex-1")}>
                    <p
                      className={cn(
                        "truncate",
                        "text-sm",
                        "font-black",
                        "text-gray-900",
                        "dark:text-white",
                      )}
                    >
                      {file.name}
                    </p>
                    <p className={cn("text-xs", "font-semibold", "text-gray-500", "dark:text-gray-400")}>
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "rounded-xl",
                      "border-2",
                      "border-gray-900",
                      "bg-gray-100",
                      "px-3",
                      "py-1.5",
                      "text-xs",
                      "font-bold",
                      "hover:bg-gray-200",
                      "cursor-pointer",
                      "dark:bg-gray-800",
                      "dark:text-white",
                    )}
                  >
                    Ganti
                  </button>
                </div>
              )}
            </div>

            {/* Scale Multiplier Selection */}
            <div className={cn("space-y-2")}>
              <label
                className={cn(
                  "block",
                  "text-xs",
                  "font-black",
                  "text-gray-800",
                  "dark:text-gray-200",
                )}
              >
                Pilih Resolusi Upscale:
              </label>
              <div className={cn("grid", "grid-cols-2", "gap-3")}>
                <button
                  type="button"
                  onClick={() => setScale(2)}
                  className={cn(
                    "flex",
                    "flex-col",
                    "p-3.5",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "text-left",
                    "cursor-pointer",
                    "transition-all",
                    scale === 2
                      ? "bg-amber-300 text-gray-900 shadow-[3px_3px_0_0_#111827] -translate-y-0.5"
                      : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#1a1c22] dark:text-gray-300",
                  )}
                >
                  <div className={cn("flex", "items-center", "justify-between")}>
                    <span className={cn("text-base", "font-black")}>2x HD</span>
                    {scale === 2 && <Check className={cn("h-4", "w-4")} />}
                  </div>
                  <span className={cn("text-[11px]", "font-semibold", "text-gray-600", "dark:text-gray-400", "mt-0.5")}>
                    Resolusi Ganda (Cepat)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setScale(4)}
                  className={cn(
                    "flex",
                    "flex-col",
                    "p-3.5",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "text-left",
                    "cursor-pointer",
                    "transition-all",
                    scale === 4
                      ? "bg-amber-300 text-gray-900 shadow-[3px_3px_0_0_#111827] -translate-y-0.5"
                      : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-[#1a1c22] dark:text-gray-300",
                  )}
                >
                  <div className={cn("flex", "items-center", "justify-between")}>
                    <span className={cn("text-base", "font-black")}>4x Ultra HD</span>
                    {scale === 4 && <Check className={cn("h-4", "w-4")} />}
                  </div>
                  <span className={cn("text-[11px]", "font-semibold", "text-gray-600", "dark:text-gray-400", "mt-0.5")}>
                    4x Piksel (Super Detail)
                  </span>
                </button>
              </div>
            </div>

            {/* Process Button */}
            <button
              type="button"
              disabled={!file || isProcessing}
              onClick={handleProcessUpscale}
              className={cn(
                "w-full",
                "flex",
                "items-center",
                "justify-center",
                "gap-2",
                "rounded-2xl",
                "border-3",
                "border-gray-900",
                "bg-amber-400",
                "py-3.5",
                "text-sm",
                "font-black",
                "text-gray-900",
                "shadow-[4px_4px_0_0_#111827]",
                "transition-all",
                "cursor-pointer",
                "hover:-translate-y-1",
                "hover:bg-amber-300",
                (!file || isProcessing) && "opacity-60 cursor-not-allowed",
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className={cn("h-5", "w-5", "animate-spin")} />
                  <span>
                    {uploadProgress > 0 && uploadProgress < 100
                      ? `Uploading ${uploadProgress}%...`
                      : "Memproses Super Resolution HD..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className={cn("h-5", "w-5")} />
                  <span>Tingkatkan ke {scale}x HD Sekarang ✨</span>
                </>
              )}
            </button>
          </Card>
        </div>

        {/* Right Column: Preview & Comparison */}
        <div className={cn("lg:col-span-7")}>
          <Card
            variant="elevated"
            rounded="3xl"
            className={cn("p-6", "sm:p-8", "space-y-6")}
          >
            <div className={cn("flex", "items-center", "justify-between", "border-b", "border-gray-200", "pb-4", "dark:border-gray-800")}>
              <h2 className={cn("text-lg", "font-black", "text-gray-900", "dark:text-white")}>
                Hasil & Preview HD
              </h2>
            </div>

            {/* Display Area */}
            {!result ? (
              <div
                className={cn(
                  "flex",
                  "flex-col",
                  "items-center",
                  "justify-center",
                  "min-h-96",
                  "rounded-2xl",
                  "border-3",
                  "border-gray-900",
                  "bg-gray-100/70",
                  "p-8",
                  "text-center",
                  "dark:border-gray-700",
                  "dark:bg-[#16181d]",
                )}
              >
                <div
                  className={cn(
                    "flex",
                    "h-16",
                    "w-16",
                    "items-center",
                    "justify-center",
                    "rounded-2xl",
                    "border-2",
                    "border-gray-900",
                    "bg-amber-300",
                    "shadow-[3px_3px_0_0_#111827]",
                    "mb-4",
                  )}
                >
                  <Eye className={cn("h-8", "w-8", "text-gray-900")} />
                </div>
                <h3 className={cn("text-base", "font-black", "text-gray-900", "dark:text-white")}>
                  Preview Perbandingan HD
                </h3>
                <p className={cn("text-xs", "font-semibold", "text-gray-500", "dark:text-gray-400", "max-w-sm", "mt-1")}>
                  Upload gambar dan klik tombol &quot;Tingkatkan ke {scale}x HD Sekarang&quot; untuk
                  melihat perbandingan slider ketajaman gambar.
                </p>
              </div>
            ) : (
              <div className={cn("space-y-6")}>
                {/* Comparison Box */}
                <div
                  className={cn(
                    "relative",
                    "h-96",
                    "w-full",
                    "overflow-hidden",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "shadow-[4px_4px_0_0_#111827]",
                    "select-none",
                    "bg-gray-900",
                  )}
                >
                  {/* Upscaled Result Image */}
                  <img
                    src={`data:${result.mime_type};base64,${result.file_base64}`}
                    alt="HD Result"
                    className={cn(
                      "absolute",
                      "inset-0",
                      "h-full",
                      "w-full",
                      "object-contain",
                      "pointer-events-none",
                    )}
                  />

                  {/* Original Image Layer (Clipped by slider) */}
                  {previewUrl && (
                    <div
                      className={cn("absolute", "inset-0", "overflow-hidden")}
                      style={{ width: `${sliderPosition}%` }}
                    >
                      <img
                        src={previewUrl}
                        alt="Original"
                        className={cn(
                          "absolute",
                          "inset-0",
                          "h-full",
                          "max-w-none",
                          "object-contain",
                        )}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                  )}

                  {/* Slider Divider Line */}
                  <div
                    className={cn(
                      "absolute",
                      "top-0",
                      "bottom-0",
                      "w-1",
                      "bg-gray-900",
                      "cursor-ew-resize",
                    )}
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div
                      className={cn(
                        "absolute",
                        "top-1/2",
                        "-translate-y-1/2",
                        "-translate-x-1/2",
                        "flex",
                        "h-8",
                        "w-8",
                        "items-center",
                        "justify-center",
                        "rounded-full",
                        "border-2",
                        "border-gray-900",
                        "bg-yellow-400",
                        "shadow-[2px_2px_0_0_#111827]",
                      )}
                    >
                      <span className={cn("text-[10px]", "font-black")}>&harr;</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div
                    className={cn(
                      "absolute",
                      "bottom-3",
                      "left-3",
                      "rounded-lg",
                      "border",
                      "border-gray-900",
                      "bg-black/70",
                      "px-2",
                      "py-1",
                      "text-[10px]",
                      "font-black",
                      "text-white",
                    )}
                  >
                    Asli ({result.original_width}x{result.original_height})
                  </div>
                  <div
                    className={cn(
                      "absolute",
                      "bottom-3",
                      "right-3",
                      "rounded-lg",
                      "border",
                      "border-gray-900",
                      "bg-amber-400",
                      "px-2",
                      "py-1",
                      "text-[10px]",
                      "font-black",
                      "text-gray-900",
                    )}
                  >
                    HD {result.scale_factor}x ({result.upscaled_width}x{result.upscaled_height})
                  </div>
                </div>

                {/* Slider Input Control */}
                <div className={cn("space-y-1")}>
                  <div className={cn("flex", "justify-between", "text-xs", "font-bold", "text-gray-500")}>
                    <span>Sebelum ({result.original_width}x{result.original_height})</span>
                    <span>Slider Before/After ({sliderPosition}%)</span>
                    <span>Sesudah ({result.upscaled_width}x{result.upscaled_height})</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className={cn("w-full", "accent-amber-500", "cursor-pointer")}
                  />
                </div>

                {/* Result Meta & Download */}
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
                    "border-2",
                    "border-gray-900",
                    "bg-amber-50",
                    "p-4",
                    "dark:bg-amber-950/20",
                  )}
                >
                  <div className={cn("space-y-1")}>
                    <p className={cn("text-xs", "font-black", "text-gray-900", "dark:text-white")}>
                      {result.file_name}
                    </p>
                    <p className={cn("text-xs", "font-semibold", "text-gray-500", "dark:text-gray-400")}>
                      {result.upscaled_width} x {result.upscaled_height} px &bull; {formatFileSize(result.upscaled_size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className={cn(
                      "flex",
                      "items-center",
                      "gap-2",
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
                      "hover:bg-emerald-300",
                      "transition-all",
                      "cursor-pointer",
                    )}
                  >
                    <Download className={cn("h-4", "w-4")} />
                    Download Gambar HD
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
