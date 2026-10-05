import {
    ArrowRight,
    CheckCircle2,
    Crop,
    Download,
    Image,
    Lock,
    Minimize2,
    RefreshCw,
    Sliders,
    Sparkles,
    X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
    convertImageViaBackend,
    downloadImageResult,
    type ConvertImageResult,
    type SupportedImageFormat,
} from "@/lib/image-convert-api";
import { ImageDropzone } from "@/pages/image/components/image-dropzone";
import { ImageProcessingCard } from "@/pages/image/components/image-processing-card";


type ImageToolId =
  | "image-converter"
  | "upscale"
  | "compress"
  | "crop"
  | "remove-bg";

interface ImageTool {
  id: ImageToolId;
  title: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  accept: string;
}

const imageTools: ImageTool[] = [
  {
    id: "image-converter",
    title: "Image Converter",
    description: "Convert images between JPG, PNG, WebP, AVIF, BMP, TIFF, and ICO.",
    badge: "Active",
    icon: Image,
    bg: "bg-emerald-300",
    accept: "image/*",
  },
  {
    id: "upscale",
    title: "Upscale Image",
    description: "Enhance photo resolution up to HD quality effortlessly.",
    badge: "Enhance",
    icon: Sparkles,
    bg: "bg-amber-300",
    accept: "image/*",
  },
  {
    id: "compress",
    title: "Compress Image",
    description: "Reduce image file size without sacrificing quality.",
    badge: "Optimize",
    icon: Minimize2,
    bg: "bg-rose-300",
    accept: "image/*",
  },
  {
    id: "crop",
    title: "Crop Image",
    description: "Crop images to your required dimensions and framing.",
    badge: "Edit",
    icon: Crop,
    bg: "bg-teal-300",
    accept: "image/*",
  },
  {
    id: "remove-bg",
    title: "Remove Background",
    description: "Remove photo backgrounds and generate transparent images.",
    badge: "AI Powered",
    icon: Image,
    bg: "bg-purple-300",
    accept: "image/*",
  },
];

const availableFormats: {
  id: SupportedImageFormat;
  label: string;
  desc: string;
  badge: string;
}[] = [
  { id: "webp", label: "WebP", desc: "Ultra small size for web", badge: "Recommended" },
  { id: "png", label: "PNG", desc: "Lossless with transparent alpha", badge: "Lossless" },
  { id: "jpg", label: "JPG", desc: "Universal photo compatibility", badge: "Universal" },
  { id: "avif", label: "AVIF", desc: "Next-gen extreme compression", badge: "Next-Gen" },
  { id: "jpeg", label: "JPEG", desc: "Standard JPEG photo", badge: "Standard" },
  { id: "tiff", label: "TIFF", desc: "Highest detail for print", badge: "Print" },
  { id: "ico", label: "ICO", desc: "Multi-size web favicon", badge: "Icon" },
  { id: "gif", label: "GIF", desc: "Indexed color graphic", badge: "Graphics" },
];

export default function ImagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const routeState = location.state as {
    mediaTab?: "convert" | "upscale" | "compress" | "crop" | "remove-bg";
    targetFormat?: string;
  } | null;
  const initialToolId = routeState?.mediaTab && isAuthenticated
    ? routeState.mediaTab === "convert"
      ? "image-converter"
      : routeState.mediaTab
    : null;
  const [activeTool, setActiveTool] = useState<ImageTool | null>(
    initialToolId
      ? imageTools.find((tool) => tool.id === initialToolId) ?? null
      : null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<SupportedImageFormat>(
    (routeState?.targetFormat as SupportedImageFormat) ?? "webp",
  );
  const [quality, setQuality] = useState<number>(85);
  const [customWidth, setCustomWidth] = useState<string>("");
  const [customHeight, setCustomHeight] = useState<string>("");
  const [backgroundColor, setBackgroundColor] = useState<string>("#FFFFFF");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [convertResult, setConvertResult] = useState<ConvertImageResult | null>(null);
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

  useEffect(() => {
    if (routeState?.mediaTab) {
      if (!isAuthenticated) {
        toast.error("Please login to use image tools.");
        navigate("/login", { state: { backgroundLocation: location } });
        return;
      }
      if (routeState.mediaTab === "convert") {
        navigate("/image/image-converter", { replace: true });
        return;
      }
      if (routeState.mediaTab === "remove-bg") {
        navigate("/image/remove-bg", { replace: true });
        return;
      }
      if (routeState.mediaTab === "upscale") {
        navigate("/image/upscale", { replace: true });
        return;
      }
      if (routeState.mediaTab === "compress") {
        navigate("/image/compress", { replace: true });
        return;
      }
      if (routeState.mediaTab === "crop") {
        navigate("/image/crop", { replace: true });
        return;
      }
      const targetId = routeState.mediaTab;
      const found = imageTools.find((tool) => tool.id === targetId);
      if (found) {
        setActiveTool(found);
        setFile(null);
        setConvertResult(null);
        setIsProcessing(false);
      }
    }
  }, [location, routeState?.mediaTab, isAuthenticated, navigate]);

  const handleOpenTool = (tool: ImageTool) => {
    if (!isAuthenticated) {
      toast.error(`${tool.title} is locked. Please login first.`);
      navigate("/login", { state: { backgroundLocation: location } });
      return;
    }
    if (tool.id === "image-converter") {
      navigate("/image/image-converter");
      return;
    }
    if (tool.id === "remove-bg") {
      navigate("/image/remove-bg");
      return;
    }
    if (tool.id === "upscale") {
      navigate("/image/upscale");
      return;
    }
    if (tool.id === "compress") {
      navigate("/image/compress");
      return;
    }
    if (tool.id === "crop") {
      navigate("/image/crop");
      return;
    }
    setActiveTool(tool);
    setFile(null);
    setConvertResult(null);
    setIsProcessing(false);
  };

  const handleCloseModal = () => {
    setActiveTool(null);
    setFile(null);
    setConvertResult(null);
    setIsProcessing(false);
  };

  const handleProcess = async () => {
    if (!file || !activeTool) {
      toast.error("Please select an image first!");
      return;
    }

    if (activeTool.id === "image-converter") {
      try {
        setIsProcessing(true);
        setUploadProgress(10);
        const result = await convertImageViaBackend(
          file,
          {
            target_format: targetFormat,
            quality: quality,
            background: backgroundColor,
            width: customWidth ? parseInt(customWidth, 10) : undefined,
            height: customHeight ? parseInt(customHeight, 10) : undefined,
          },
          (percent) => setUploadProgress(percent),
        );
        setConvertResult(result);
        toast.success(`Converted successfully to ${targetFormat.toUpperCase()}!`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to convert image";
        toast.error(msg);
      } finally {
        setIsProcessing(false);
        setUploadProgress(0);
      }
      return;
    }

    setIsProcessing(true);
    setUploadProgress(15);
    const progressTimer = window.setInterval(() => {
      setUploadProgress((current) => Math.min(current + 12, 90));
    }, 180);
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    window.clearInterval(progressTimer);
    setUploadProgress(100);
    setIsProcessing(false);
    toast.success(`${activeTool.title} processed successfully!`);
  };

  return (
    <div className={cn("mx-auto", "max-w-7xl", "space-y-12", "pb-16", "pt-6")}>
      <div className={cn("space-y-5", "text-center")}>
        <h1
          className={cn(
            "text-4xl",
            "font-bold",
            "leading-tight",
            "tracking-tight",
            "text-gray-900",
            "dark:text-white",
            "md:text-6xl",
          )}
        >
          All Image Features <br />
          <span
            className={cn(
              "bg-linear-to-r",
              "from-emerald-500",
              "via-blue-500",
              "to-purple-500",
              "bg-clip-text",
              "text-transparent",
            )}
          >
            Simple, Sharp & Fast
          </span>
        </h1>
        <p className={cn("mx-auto", "max-w-3xl", "text-lg", "font-bold", "text-gray-600", "dark:text-gray-400", "md:text-xl")}>
          Select the tools you need below to convert, enhance, optimize, and edit your images.
        </p>
      </div>

      <div className={cn("grid", "gap-6", "pt-4", "sm:grid-cols-2", "lg:grid-cols-3", "xl:grid-cols-4")}>
        {imageTools.map((tool) => (
          <Card
            key={tool.id}
            as="button"
            variant="interactive"
            rounded="3xl"
            onClick={() => handleOpenTool(tool)}
            className={cn(
              "group",
              "flex",
              "flex-col",
              "justify-between",
              "p-6",
              "text-left",
            )}
          >
            <div>
              <div className={cn("mb-5", "flex", "items-center", "justify-between")}>
                <div
                  className={cn(
                    "flex",
                    "h-14",
                    "w-14",
                    "items-center",
                    "justify-center",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "shadow-[3px_3px_0_0_#111827]",
                    "transition-transform",
                    "group-hover:scale-110",
                    tool.bg,
                  )}
                >
                  <tool.icon className={cn("h-7", "w-7", "text-gray-900")} />
                </div>
                <div className="flex items-center gap-2">
                  {!isAuthenticated && (
                    <span
                      title="Login required to access this feature"
                      className={cn(
                        "flex",
                        "items-center",
                        "gap-1",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "dark:border-gray-700",
                        "bg-amber-400",
                        "px-2.5",
                        "py-1",
                        "text-xs",
                        "font-black",
                        "text-gray-900",
                        "shadow-[2px_2px_0_0_#111827]",
                        "dark:shadow-[2px_2px_0_0_#000]",
                      )}
                    >
                      <Lock className="h-3.5 w-3.5 stroke-[2.5]" />
                      Lock
                    </span>
                  )}
                  <span className={cn("rounded-xl", "border-2", "border-gray-900", "bg-gray-100", "px-2.5", "py-1", "text-xs", "font-bold", "text-gray-800", "dark:border-gray-700", "dark:bg-[#1e222a]", "dark:text-gray-200")}>
                    {tool.badge}
                  </span>
                </div>
              </div>
              <h3 className={cn("mb-2", "text-xl", "font-bold", "text-gray-900", "dark:text-white")}>{tool.title}</h3>
              <p className={cn("mb-6", "line-clamp-3", "text-xs", "font-semibold", "leading-relaxed", "text-gray-600", "dark:text-gray-400")}>
                {tool.description}
              </p>
            </div>
            <span className={cn("flex", "items-center", "gap-2", "text-sm", "font-bold", "text-gray-900", "transition-all", "group-hover:gap-3", "dark:text-white")}>
              {isAuthenticated ? "Try Now" : "Login to Access"}{" "}
              {isAuthenticated ? (
                <ArrowRight className={cn("h-4", "w-4")} />
              ) : (
                <Lock className={cn("h-4", "w-4", "text-amber-500")} />
              )}
            </span>
          </Card>
        ))}
      </div>

      {activeTool && (
        <div
          className={cn("fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "overflow-y-auto", "bg-black/70", "p-4", "backdrop-blur-sm")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <Card
            variant="elevated"
            rounded="3xl"
            className={cn("relative", "my-8", "w-full", "max-w-3xl", "max-h-[90vh]", "overflow-y-auto", "p-6", "sm:p-8")}
          >
            {/* Close Button */}
            <button
              type="button"
              aria-label="Close image tool"
              onClick={handleCloseModal}
              className={cn("absolute", "right-6", "top-6", "z-10", "flex", "h-10", "w-10", "cursor-pointer", "items-center", "justify-center", "rounded-xl", "border-2", "border-gray-900", "bg-gray-100", "text-gray-900", "transition-all", "hover:scale-105", "dark:border-gray-700", "dark:bg-[#1e222a]", "dark:text-white")}
            >
              <X className={cn("h-5", "w-5")} />
            </button>

            {/* Modal Header */}
            <div className={cn("mb-6", "flex", "items-center", "gap-4", "pr-12")}>
              <div className={cn("flex", "h-14", "w-14", "shrink-0", "items-center", "justify-center", "rounded-2xl", "border-3", "border-gray-900", "shadow-[3px_3px_0_0_#111827]", activeTool.bg)}>
                <activeTool.icon className={cn("h-7", "w-7", "text-gray-900")} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={cn("text-2xl", "font-black", "tracking-tight", "text-gray-900", "dark:text-white")}>{activeTool.title}</h2>
                  <span className={cn("rounded-lg", "border-2", "border-gray-900", "bg-emerald-400", "px-2", "py-0.5", "text-xs", "font-black", "text-gray-900")}>
                    Fast & Secure
                  </span>
                </div>
                <p className={cn("text-sm", "font-semibold", "text-gray-500", "dark:text-gray-400")}>{activeTool.description}</p>
              </div>
            </div>

            {/* CONVERT RESULT VIEW */}
            {convertResult ? (
              <div className="space-y-6">
                <div className={cn("rounded-2xl", "border-3", "border-gray-900", "bg-emerald-50", "p-5", "dark:border-emerald-600", "dark:bg-emerald-950/30")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("flex", "h-12", "w-12", "shrink-0", "items-center", "justify-center", "rounded-xl", "border-2", "border-gray-900", "bg-emerald-400", "shadow-[2px_2px_0_0_#111827]")}>
                      <CheckCircle2 className="h-6 w-6 text-gray-900" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-emerald-100">
                        Image Successfully Converted!
                      </h3>
                      <p className="text-xs font-semibold text-gray-600 dark:text-emerald-300/80">
                        {convertResult.original_format} &rarr; <span className="font-black uppercase">{convertResult.converted_format}</span> ({convertResult.converted_width} &times; {convertResult.converted_height} px)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Previews & Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Converted Preview Card */}
                  <div className={cn("flex", "flex-col", "items-center", "justify-center", "rounded-2xl", "border-3", "border-gray-900", "bg-gray-50", "p-4", "dark:border-gray-700", "dark:bg-[#1a1c22]")}>
                    <span className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Converted Preview</span>
                    <div className="relative flex max-h-56 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-black/40">
                      <img
                        src={`data:${convertResult.mime_type};base64,${convertResult.file_base64}`}
                        alt="Converted Result"
                        className="max-h-48 max-w-full object-contain rounded-lg"
                      />
                    </div>
                    <span className="mt-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                      {convertResult.file_name}
                    </span>
                  </div>

                  {/* Stats Comparison Card */}
                  <div className="flex flex-col justify-between gap-3">
                    <div className={cn("rounded-2xl", "border-3", "border-gray-900", "bg-white", "p-4", "shadow-[3px_3px_0_0_#111827]", "dark:border-gray-700", "dark:bg-[#1e222a]", "dark:shadow-[3px_3px_0_0_#000]")}>
                      <span className="text-xs font-bold text-gray-500">File Size Comparison</span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <p className="text-xs text-gray-400">Original Size</p>
                          <p className="text-base font-bold text-gray-700 dark:text-gray-300">
                            {(convertResult.original_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                        <div className="text-right">
                          <p className="text-xs text-emerald-500 font-bold">New Size</p>
                          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {(convertResult.converted_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      {convertResult.saved_percentage > 0 && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <span>🎉 Saved {(convertResult.saved_bytes / 1024).toFixed(1)} KB ({convertResult.saved_percentage.toFixed(1)}% lighter!)</span>
                        </div>
                      )}
                    </div>

                    <div className={cn("rounded-2xl", "border-3", "border-gray-900", "bg-purple-50", "p-4", "dark:border-gray-700", "dark:bg-purple-950/20")}>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-semibold text-gray-500 dark:text-gray-400">Target Format</span>
                          <p className="font-black text-gray-900 dark:text-white uppercase">{convertResult.converted_format}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-500 dark:text-gray-400">Resolution</span>
                          <p className="font-black text-gray-900 dark:text-white">{convertResult.converted_width} &times; {convertResult.converted_height} px</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => downloadImageResult(convertResult)}
                    className={cn(
                      "flex-1",
                      "flex",
                      "items-center",
                      "justify-center",
                      "gap-2",
                      "rounded-xl",
                      "border-3",
                      "border-gray-900",
                      "bg-emerald-400",
                      "px-6",
                      "py-4",
                      "text-base",
                      "font-black",
                      "text-gray-900",
                      "shadow-[4px_4px_0_0_#111827]",
                      "transition-all",
                      "hover:-translate-y-1",
                      "hover:bg-emerald-300",
                      "cursor-pointer",
                      "dark:shadow-[4px_4px_0_0_#000]",
                    )}
                  >
                    <Download className="h-5 w-5 stroke-[2.5]" />
                    Download Converted Image
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConvertResult(null);
                      setFile(null);
                    }}
                    className={cn(
                      "flex",
                      "items-center",
                      "justify-center",
                      "gap-2",
                      "rounded-xl",
                      "border-3",
                      "border-gray-900",
                      "bg-gray-100",
                      "px-5",
                      "py-4",
                      "text-sm",
                      "font-bold",
                      "text-gray-800",
                      "shadow-[3px_3px_0_0_#111827]",
                      "transition-all",
                      "hover:-translate-y-0.5",
                      "cursor-pointer",
                      "dark:border-gray-700",
                      "dark:bg-[#1a1c22]",
                      "dark:text-white",
                      "dark:shadow-[3px_3px_0_0_#000]",
                    )}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Convert Another
                  </button>
                </div>
              </div>
            ) : (
              /* INPUT AND SETUP VIEW */
              <div className="space-y-6">
                {/* Upload & Dropzone Area */}
                <ImageDropzone
                  ref={fileInputRef}
                  className={file ? "hidden" : undefined}
                  dropzoneTitle="Click to upload or Drag & Drop image"
                  dropzoneSubtitle="PNG, JPG, JPEG, WEBP, AVIF, BMP, TIFF, GIF (Up to 50MB)"
                  accept={activeTool.accept}
                  multiple={false}
                  disabled={isProcessing}
                  onFilesSelected={(files) => {
                    if (files[0]) {
                      setFile(files[0]);
                      setConvertResult(null);
                    }
                  }}
                />

                {file && (
                  <ImageProcessingCard
                    index={0}
                    thumbnailUrl={previewUrl ?? undefined}
                    fileName={file.name}
                    metadata={`${(file.size / 1024 / 1024).toFixed(2)} MB • ${isProcessing ? "Processing" : `Ready to ${activeTool.id === "compress" ? "compress" : activeTool.id === "crop" ? "crop" : "convert"}`}`}
                    status={isProcessing ? "processing" : "pending"}
                    progress={uploadProgress}
                    processingLabel={
                      activeTool.id === "compress"
                        ? "Compressing..."
                        : activeTool.id === "crop"
                          ? "Preparing crop..."
                          : "Converting..."
                    }
                    progressLabel={
                      activeTool.id === "compress"
                        ? "Optimizing image size"
                        : activeTool.id === "crop"
                          ? "Preparing the crop workspace"
                          : "Converting image"
                    }
                    actions={
                      !isProcessing ? (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "shrink-0",
                            "cursor-pointer",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "bg-gray-100",
                            "px-3",
                            "py-1.5",
                            "text-xs",
                            "font-bold",
                            "hover:bg-gray-200",
                            "dark:border-gray-700",
                            "dark:bg-gray-800",
                            "dark:text-white",
                          )}
                        >
                          Change
                        </button>
                      ) : undefined
                    }
                  />
                )}


                {/* TARGET FORMAT SELECTION (Image Converter) */}
                {activeTool.id === "image-converter" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Choose Target Format
                      </label>
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        Selected: <span className="uppercase font-black">{targetFormat}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {availableFormats.map((fmt) => {
                        const isSelected = targetFormat === fmt.id;
                        return (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setTargetFormat(fmt.id)}
                            className={cn(
                              "group",
                              "flex",
                              "flex-col",
                              "justify-between",
                              "p-3",
                              "rounded-xl",
                              "border-2",
                              "border-gray-900",
                              "text-left",
                              "transition-all",
                              "cursor-pointer",
                              isSelected
                                ? "bg-purple-400 text-gray-900 shadow-[3px_3px_0_0_#111827] -translate-y-0.5"
                                : "bg-white text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-[#1a1c22] dark:text-gray-200 dark:hover:bg-[#252830]",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-base font-black uppercase">{fmt.label}</span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-black",
                                isSelected ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              )}>
                                {fmt.badge}
                              </span>
                            </div>
                            <span className={cn("mt-1 text-[11px] font-semibold leading-tight line-clamp-1", isSelected ? "text-gray-900" : "text-gray-500 dark:text-gray-400")}>
                              {fmt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Advanced Options Accordion */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-1.5 text-xs font-black text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors cursor-pointer"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options (Quality, Resize, Background)"}
                      </button>

                      {showAdvanced && (
                        <div className="mt-3 space-y-4 rounded-2xl border-2 border-gray-900 bg-gray-50 p-4 dark:border-gray-700 dark:bg-[#1a1c22]">
                          {/* Quality Slider */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                Output Quality: <span className="text-purple-600 font-black">{quality}%</span>
                              </span>
                              <span className="text-[11px] font-semibold text-gray-500">
                                {quality >= 95 ? "Maximum Fidelity" : quality >= 80 ? "Recommended Balance" : "High Compression"}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="100"
                              step="5"
                              value={quality}
                              onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                              className="w-full accent-purple-600 cursor-pointer"
                            />
                          </div>

                          {/* Dimensions (Resize) */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                                Custom Width (px, optional)
                              </label>
                              <input
                                type="number"
                                placeholder="Auto"
                                value={customWidth}
                                onChange={(e) => setCustomWidth(e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-gray-900 bg-white p-2 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-[#1e222a] dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                                Custom Height (px, optional)
                              </label>
                              <input
                                type="number"
                                placeholder="Auto"
                                value={customHeight}
                                onChange={(e) => setCustomHeight(e.target.value)}
                                className="mt-1 w-full rounded-lg border-2 border-gray-900 bg-white p-2 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-[#1e222a] dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Background color for non-alpha formats */}
                          {(targetFormat === "jpg" || targetFormat === "jpeg") && (
                            <div>
                              <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 block mb-1">
                                Background Color for Transparencies
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={backgroundColor}
                                  onChange={(e) => setBackgroundColor(e.target.value)}
                                  className="h-8 w-12 cursor-pointer rounded border border-gray-900 bg-transparent p-0"
                                />
                                <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                                  {backgroundColor}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Progress Indicator */}
                {activeTool.id === "image-converter" &&
                  isProcessing &&
                  uploadProgress > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                      <span>Converting image...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full border-2 border-gray-900 bg-gray-200 dark:border-gray-700 dark:bg-gray-800">
                      <div
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="button"
                  disabled={!file || isProcessing}
                  onClick={handleProcess}
                  className={cn(
                    "mt-2",
                    "flex",
                    "w-full",
                    "items-center",
                    "justify-center",
                    "gap-2",
                    "rounded-xl",
                    "border-3",
                    "border-gray-900",
                    "bg-purple-400",
                    "px-6",
                    "py-4",
                    "text-lg",
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
                      <RefreshCw className={cn("h-6", "w-6", "animate-spin")} />
                      {activeTool.id === "compress"
                        ? "Compressing Image..."
                        : activeTool.id === "crop"
                          ? "Preparing Crop..."
                          : "Processing Magic Conversion..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      {activeTool.id === "compress"
                        ? "Compress Image"
                        : activeTool.id === "crop"
                          ? "Crop Image"
                          : `Convert to ${targetFormat.toUpperCase()} Now`}
                    </>
                  )}
                </button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
