import {
    ArrowRight,
    CheckCircle2,
    Crop,
    Image,
    Minimize2,
    RefreshCw,
    Sparkles,
    Upload,
    X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

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
    description: "Konversi gambar ke JPG, PNG, WebP, AVIF, dan format lainnya.",
    badge: "Convert",
    icon: Image,
    bg: "bg-emerald-300",
    accept: "image/*",
  },
  {
    id: "upscale",
    title: "Upscale Image",
    description: "Tingkatkan resolusi foto hingga kualitas HD dengan mudah.",
    badge: "Enhance",
    icon: Sparkles,
    bg: "bg-amber-300",
    accept: "image/*",
  },
  {
    id: "compress",
    title: "Compress Image",
    description: "Kecilkan ukuran file gambar tanpa mengorbankan kualitas.",
    badge: "Optimize",
    icon: Minimize2,
    bg: "bg-rose-300",
    accept: "image/*",
  },
  {
    id: "crop",
    title: "Crop Image",
    description: "Potong gambar sesuai ukuran dan framing yang kamu butuhkan.",
    badge: "Edit",
    icon: Crop,
    bg: "bg-teal-300",
    accept: "image/*",
  },
  {
    id: "remove-bg",
    title: "Remove Background",
    description: "Hapus background foto dan siapkan gambar transparan.",
    badge: "AI Powered",
    icon: Image,
    bg: "bg-purple-300",
    accept: "image/*",
  },
];

export default function ImagePage() {
  const location = useLocation();
  const routeState = location.state as {
    mediaTab?: "convert" | "upscale" | "compress" | "crop" | "remove-bg";
    targetFormat?: string;
  } | null;
  const initialToolId = routeState?.mediaTab
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
  const [targetFormat, setTargetFormat] = useState(routeState?.targetFormat ?? "png");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleOpenTool = (tool: ImageTool) => {
    setActiveTool(tool);
    setFile(null);
    setIsProcessing(false);
    setIsCompleted(false);
  };

  const handleCloseModal = () => {
    setActiveTool(null);
    setFile(null);
    setIsProcessing(false);
    setIsCompleted(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsCompleted(false);
    }
  };

  const handleProcess = () => {
    if (!file || !activeTool) {
      toast.error("Pilih satu gambar terlebih dahulu!");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      toast.success(`${activeTool.title} berhasil diproses!`);
    }, 1500);
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
          <button
            key={tool.id}
            type="button"
            onClick={() => handleOpenTool(tool)}
            className={cn(
              "group",
              "flex",
              "cursor-pointer",
              "flex-col",
              "justify-between",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "bg-white",
              "p-6",
              "text-left",
              "shadow-[4px_4px_0_0_#111827]",
              "transition-all",
              "duration-200",
              "hover:-translate-y-2",
              "hover:shadow-[8px_8px_0_0_#111827]",
              "dark:border-gray-700",
              "dark:bg-[#16181d]",
              "dark:shadow-[4px_4px_0_0_#000]",
              "dark:hover:shadow-[8px_8px_0_0_#000]",
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
                <span className={cn("rounded-xl", "border-2", "border-gray-900", "bg-gray-100", "px-2.5", "py-1", "text-xs", "font-bold", "text-gray-800", "dark:border-gray-700", "dark:bg-[#1e222a]", "dark:text-gray-200")}>
                  {tool.badge}
                </span>
              </div>
              <h3 className={cn("mb-2", "text-xl", "font-bold", "text-gray-900", "dark:text-white")}>{tool.title}</h3>
              <p className={cn("mb-6", "line-clamp-3", "text-xs", "font-semibold", "leading-relaxed", "text-gray-600", "dark:text-gray-400")}>
                {tool.description}
              </p>
            </div>
            <span className={cn("flex", "items-center", "gap-2", "text-sm", "font-bold", "text-gray-900", "transition-all", "group-hover:gap-3", "dark:text-white")}>
              Coba Sekarang <ArrowRight className={cn("h-4", "w-4")} />
            </span>
          </button>
        ))}
      </div>

      {activeTool && (
        <div
          className={cn("fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "bg-black/60", "p-4", "backdrop-blur-xs")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className={cn("relative", "w-full", "max-w-2xl", "rounded-3xl", "border-3", "border-gray-900", "bg-white", "p-6", "shadow-[8px_8px_0_0_#111827]", "dark:border-gray-700", "dark:bg-[#16181d]", "dark:shadow-[8px_8px_0_0_#000]", "sm:p-8")}>
            <button
              type="button"
              aria-label="Close image tool"
              onClick={handleCloseModal}
              className={cn("absolute", "right-6", "top-6", "flex", "h-10", "w-10", "cursor-pointer", "items-center", "justify-center", "rounded-xl", "border-2", "border-gray-900", "bg-gray-100", "text-gray-900", "dark:border-gray-700", "dark:bg-[#1e222a]", "dark:text-white")}
            >
              <X className={cn("h-5", "w-5")} />
            </button>

            <div className={cn("mb-6", "flex", "items-center", "gap-4", "pr-12")}>
              <div className={cn("flex", "h-14", "w-14", "shrink-0", "items-center", "justify-center", "rounded-2xl", "border-3", "border-gray-900", "shadow-[3px_3px_0_0_#111827]", activeTool.bg)}>
                <activeTool.icon className={cn("h-7", "w-7", "text-gray-900")} />
              </div>
              <div>
                <h2 className={cn("text-2xl", "font-bold", "text-gray-900", "dark:text-white")}>{activeTool.title}</h2>
                <p className={cn("text-sm", "font-semibold", "text-gray-500", "dark:text-gray-400")}>{activeTool.description}</p>
              </div>
            </div>

            <div className={cn("relative", "flex", "min-h-52", "flex-col", "items-center", "justify-center", "overflow-hidden", "rounded-2xl", "border-3", "border-dashed", "border-gray-300", "bg-gray-50", "p-8", "text-center", "dark:border-gray-700", "dark:bg-[#1e222a]")}>
              <input type="file" accept={activeTool.accept} onChange={handleFileChange} className={cn("absolute", "inset-0", "h-full", "w-full", "cursor-pointer", "opacity-0")} />
              {file ? (
                <div className={cn("space-y-2")}>
                  <div className={cn("mx-auto", "flex", "h-12", "w-12", "items-center", "justify-center", "rounded-2xl", "border-3", "border-gray-900", "bg-emerald-400", "shadow-[3px_3px_0_0_#111827]")}>
                    {isCompleted ? <CheckCircle2 className={cn("h-6", "w-6", "text-gray-900")} /> : <Image className={cn("h-6", "w-6", "text-gray-900")} />}
                  </div>
                  <p className={cn("max-w-md", "break-all", "text-base", "font-bold", "text-gray-900", "dark:text-white")}>{file.name}</p>
                  <p className={cn("text-xs", "font-semibold", "text-gray-500", "dark:text-gray-400")}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className={cn("space-y-3")}>
                  <div className={cn("mx-auto", "flex", "h-14", "w-14", "items-center", "justify-center", "rounded-2xl", "border-3", "border-gray-900", "bg-yellow-400", "shadow-[3px_3px_0_0_#111827]")}>
                    <Upload className={cn("h-7", "w-7", "text-gray-900")} />
                  </div>
                  <p className={cn("text-base", "font-bold", "text-gray-900", "dark:text-white")}>Pilih atau Drag & Drop gambar</p>
                  <p className={cn("text-xs", "font-semibold", "text-gray-500", "dark:text-gray-400")}>Format gambar sesuai tool yang dipilih</p>
                </div>
              )}
            </div>

            {activeTool.id === "image-converter" && (
              <div className={cn("mt-6")}>
                <label className={cn("mb-2", "block", "text-sm", "font-bold", "text-gray-900", "dark:text-gray-100")}>
                  Target Format
                </label>
                <select
                  value={targetFormat}
                  onChange={(event) => setTargetFormat(event.target.value)}
                  className={cn("w-full", "rounded-xl", "border-3", "border-gray-900", "bg-white", "p-4", "font-bold", "text-gray-900", "dark:border-gray-700", "dark:bg-[#1a1c22]", "dark:text-white")}
                >
                  <option value="png">PNG Image</option>
                  <option value="jpg">JPG Image</option>
                  <option value="webp">WebP Image</option>
                  <option value="avif">AVIF Image</option>
                </select>
              </div>
            )}

            <button
              type="button"
              disabled={!file || isProcessing}
              onClick={handleProcess}
              className={cn("mt-6", "flex", "w-full", "items-center", "justify-center", "gap-2", "rounded-xl", "border-3", "border-gray-900", "bg-purple-400", "px-6", "py-4", "text-lg", "font-bold", "text-gray-900", "shadow-[4px_4px_0_0_#111827]", "transition-all", "hover:-translate-y-1", "hover:bg-purple-500", "disabled:cursor-not-allowed", "disabled:bg-gray-200", "disabled:shadow-none", "dark:border-gray-700", "dark:shadow-[4px_4px_0_0_#000]")}
            >
              {isProcessing ? <><RefreshCw className={cn("h-6", "w-6", "animate-spin")} /> Processing Magic...</> : `Mulai Proses ${activeTool.title}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
