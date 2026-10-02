import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileArchive,
  FileMinus,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Layers,
  RefreshCw,
  ScanText,
  Scissors,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PDFTool {
  id: string;
  title: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  acceptMultiple?: boolean;
}

const pdfTools: PDFTool[] = [
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    description:
      "Konversi dokumen PDF ke format Microsoft Word (.docx) dengan teks yang dapat diedit.",
    badge: "Convert",
    icon: FileText,
    bg: "bg-blue-300",
  },
  {
    id: "pdf-to-excel",
    title: "PDF to Excel",
    description:
      "Ekstrak tabel dan data angka dari dokumen PDF ke spreadsheet Excel (.xlsx).",
    badge: "Convert",
    icon: FileSpreadsheet,
    bg: "bg-emerald-300",
  },
  {
    id: "pdf-to-jpg",
    title: "PDF to JPG",
    description:
      "Ubah setiap lembar halaman PDF menjadi file gambar format JPG berkualitas jernih.",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-amber-300",
  },
  {
    id: "pdf-to-jpeg",
    title: "PDF to JPEG",
    description:
      "Simpan seluruh halaman dokumen PDF menjadi gambar JPEG standar untuk kemudahan berbagi.",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-yellow-300",
  },
  {
    id: "pdf-to-png",
    title: "PDF to PNG",
    description:
      "Konversi halaman dokumen PDF menjadi gambar PNG transparan berkualitas tinggi (HD).",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-sky-300",
  },
  {
    id: "pdf-to-webp",
    title: "PDF to WebP",
    description:
      "Ubah halaman PDF ke format WebP modern yang ringan untuk kecepatan website.",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-indigo-300",
  },
  {
    id: "pdf-to-avif",
    title: "PDF to AVIF",
    description:
      "Konversi halaman PDF ke format AVIF generasi terbaru dengan rasio kompresi maksimal.",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-rose-300",
  },
  {
    id: "merge-pdf",
    title: "Merge PDF",
    description:
      "Gabungkan beberapa file PDF terpisah menjadi satu dokumen PDF utuh secara berurutan.",
    badge: "Organize",
    icon: Layers,
    bg: "bg-purple-300",
    acceptMultiple: true,
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    description:
      "Pisahkan rentang halaman tertentu atau pecah file PDF menjadi dokumen terpisah.",
    badge: "Organize",
    icon: Scissors,
    bg: "bg-pink-300",
  },
  {
    id: "ocr-pdf",
    title: "OCR PDF",
    description:
      "Ekstrak dan kenali teks dari pindaian scan PDF menjadi teks yang bisa disalin.",
    badge: "AI Powered",
    icon: ScanText,
    bg: "bg-teal-300",
  },
  {
    id: "remove-pdf",
    title: "Remove PDF",
    description:
      "Hapus satu atau beberapa nomor halaman yang tidak diinginkan dari file dokumen PDF.",
    badge: "Edit",
    icon: FileMinus,
    bg: "bg-red-300",
  },
  {
    id: "compress-pdf",
    title: "Compress PDF",
    description:
      "Kecilkan ukuran file PDF secara drastis tanpa mengurangi keterbacaan teks dan gambar.",
    badge: "Optimize",
    icon: FileArchive,
    bg: "bg-orange-300",
  },
];

export default function PDFPage() {
  const [activeTool, setActiveTool] = useState<PDFTool | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [imageQuality, setImageQuality] = useState<"standard" | "hd">("hd");
  const [compressLevel, setCompressLevel] = useState<
    "recommended" | "extreme" | "low"
  >("recommended");

  const handleOpenTool = (tool: PDFTool) => {
    setActiveTool(tool);
    setFiles([]);
    setIsProcessing(false);
    setIsCompleted(false);
    setPageInput("");
  };

  const handleCloseModal = () => {
    setActiveTool(null);
    setFiles([]);
    setIsProcessing(false);
    setIsCompleted(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (activeTool?.acceptMultiple) {
        setFiles(Array.from(e.target.files));
      } else {
        setFiles([e.target.files[0]]);
      }
      setIsCompleted(false);
    }
  };

  const handleProcess = () => {
    if (files.length === 0) {
      toast.error("Pilih setidaknya satu file PDF terlebih dahulu!");
      return;
    }

    if (
      (activeTool?.id === "split-pdf" || activeTool?.id === "remove-pdf") &&
      !pageInput.trim()
    ) {
      toast.error("Masukkan nomor halaman yang ingin diproses!");
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      toast.success(`${activeTool?.title} berhasil diproses!`);
    }, 2000);
  };

  const handleDownload = () => {
    toast.success("Mengunduh hasil file PDF...");
  };

  const isImageConversion = activeTool?.badge === "Image";

  return (
    <div className={cn("max-w-7xl", "mx-auto", "space-y-12", "pb-16", "pt-6")}>
      {/* Header Section */}
      <div className={cn("text-center", "space-y-5")}>
        <h1
          className={cn(
            "text-4xl",
            "md:text-6xl",
            "font-bold",
            "text-gray-900",
            "dark:text-white",
            "tracking-tight",
            "leading-tight",
          )}
        >
          All PDF Features <br />
          <span
            className={cn(
              "text-transparent",
              "bg-clip-text",
              "bg-linear-to-r",
              "from-red-500",
              "via-purple-600",
              "to-amber-500",
              "selection:text-gray-900",
              "selection:bg-yellow-200",
            )}
          >
            Fast, Complete & Free
          </span>
        </h1>
        <p
          className={cn(
            "text-lg",
            "md:text-xl",
            "font-bold",
            "text-gray-600",
            "dark:text-gray-400",
            "max-w-3xl",
            "mx-auto",
          )}
        >
          Select the tools you need below to convert documents to Word, Excel,
          Images, as well as merge, split, and compress PDFs.
        </p>
      </div>

      {/* Feature Cards Grid (4 Kolom Neobrutalisme) */}
      <div
        className={cn(
          "grid",
          "gap-6",
          "sm:grid-cols-2",
          "lg:grid-cols-3",
          "xl:grid-cols-4",
          "pt-4",
        )}
      >
        {pdfTools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => handleOpenTool(tool)}
            className={cn(
              "group",
              "cursor-pointer",
              "flex",
              "flex-col",
              "justify-between",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-white",
              "dark:bg-[#16181d]",
              "p-6",
              "transition-all",
              "duration-200",
              "hover:-translate-y-2",
              "hover:shadow-[8px_8px_0_0_#111827]",
              "dark:hover:shadow-[8px_8px_0_0_#000]",
              "shadow-[4px_4px_0_0_#111827]",
              "dark:shadow-[4px_4px_0_0_#000]",
            )}
          >
            <div>
              {/* Badge & Icon */}
              <div
                className={cn(
                  "flex",
                  "items-center",
                  "justify-between",
                  "mb-5",
                )}
              >
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
                    "dark:border-gray-700",
                    "shadow-[3px_3px_0_0_#111827]",
                    "dark:shadow-[3px_3px_0_0_#000]",
                    tool.bg,
                    "group-hover:scale-110",
                    "transition-transform",
                  )}
                >
                  <tool.icon className={cn("h-7", "w-7", "text-gray-900")} />
                </div>

                <span
                  className={cn(
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-gray-100",
                    "dark:bg-[#1e222a]",
                    "px-2.5",
                    "py-1",
                    "text-xs",
                    "font-bold",
                    "text-gray-800",
                    "dark:text-gray-200",
                  )}
                >
                  {tool.badge}
                </span>
              </div>

              {/* Title & Description */}
              <h3
                className={cn(
                  "text-xl",
                  "font-bold",
                  "text-gray-900",
                  "dark:text-white",
                  "mb-2",
                )}
              >
                {tool.title}
              </h3>
              <p
                className={cn(
                  "text-gray-600",
                  "dark:text-gray-400",
                  "font-semibold",
                  "text-xs",
                  "leading-relaxed",
                  "mb-6",
                  "line-clamp-3",
                )}
              >
                {tool.description}
              </p>
            </div>

            {/* Action CTA */}
            <div
              className={cn(
                "flex",
                "items-center",
                "text-gray-900",
                "dark:text-white",
                "font-bold",
                "text-sm",
                "gap-2",
                "group-hover:gap-3",
                "transition-all",
              )}
            >
              Coba Sekarang <ArrowRight className={cn("w-4", "h-4")} />
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Tool Modal */}
      {activeTool && (
        <div
          className={cn(
            "fixed",
            "inset-0",
            "z-50",
            "flex",
            "items-center",
            "justify-center",
            "bg-black/60",
            "p-4",
            "backdrop-blur-xs",
          )}
        >
          <div
            className={cn(
              "relative",
              "w-full",
              "max-w-2xl",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-white",
              "dark:bg-[#16181d]",
              "p-6",
              "sm:p-8",
              "shadow-[8px_8px_0_0_#111827]",
              "dark:shadow-[8px_8px_0_0_#000]",
              "animate-in",
              "fade-in",
              "zoom-in-95",
              "duration-150",
            )}
          >
            {/* Modal Close Button */}
            <button
              onClick={handleCloseModal}
              className={cn(
                "absolute",
                "right-6",
                "top-6",
                "flex",
                "h-10",
                "w-10",
                "items-center",
                "justify-center",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-gray-100",
                "dark:bg-[#1e222a]",
                "text-gray-900",
                "dark:text-white",
                "transition-all",
                "hover:bg-red-400",
                "hover:text-gray-900",
              )}
            >
              <X className={cn("h-5", "w-5")} />
            </button>

            {/* Modal Header */}
            <div className={cn("flex", "items-center", "gap-4", "mb-6")}>
              <div
                className={cn(
                  "flex",
                  "h-14",
                  "w-14",
                  "shrink-0",
                  "items-center",
                  "justify-center",
                  "rounded-2xl",
                  "border-3",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "shadow-[3px_3px_0_0_#111827]",
                  "dark:shadow-[3px_3px_0_0_#000]",
                  activeTool.bg,
                )}
              >
                <activeTool.icon
                  className={cn("h-7", "w-7", "text-gray-900")}
                />
              </div>
              <div>
                <h2
                  className={cn(
                    "text-2xl",
                    "font-bold",
                    "text-gray-900",
                    "dark:text-white",
                  )}
                >
                  {activeTool.title}
                </h2>
                <p
                  className={cn(
                    "text-sm",
                    "font-semibold",
                    "text-gray-500",
                    "dark:text-gray-400",
                  )}
                >
                  {activeTool.description}
                </p>
              </div>
            </div>

            {/* Upload Zone */}
            <div
              className={cn(
                "relative",
                "flex",
                "flex-col",
                "items-center",
                "justify-center",
                "rounded-2xl",
                "border-3",
                "border-dashed",
                "border-gray-300",
                "dark:border-gray-700",
                "bg-gray-50",
                "dark:bg-[#1e222a]",
                "p-8",
                "text-center",
                "transition-colors",
                "hover:bg-[#fdfbf7]",
                "dark:hover:bg-[#252932]",
                "overflow-hidden",
              )}
            >
              <input
                type="file"
                multiple={activeTool.acceptMultiple}
                accept=".pdf"
                onChange={handleFileChange}
                className={cn(
                  "absolute",
                  "inset-0",
                  "h-full",
                  "w-full",
                  "cursor-pointer",
                  "opacity-0",
                )}
              />

              {files.length === 0 ? (
                <div className={cn("space-y-3")}>
                  <div
                    className={cn(
                      "mx-auto",
                      "flex",
                      "h-14",
                      "w-14",
                      "items-center",
                      "justify-center",
                      "rounded-2xl",
                      "border-3",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "bg-yellow-400",
                      "shadow-[3px_3px_0_0_#111827]",
                      "dark:shadow-[3px_3px_0_0_#000]",
                    )}
                  >
                    <Upload className={cn("h-7", "w-7", "text-gray-900")} />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-base",
                        "font-bold",
                        "text-gray-900",
                        "dark:text-white",
                      )}
                    >
                      Pilih atau Drag & Drop file PDF
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        "font-semibold",
                        "text-gray-500",
                        "dark:text-gray-400",
                        "mt-1",
                      )}
                    >
                      {activeTool.acceptMultiple
                        ? "Dapat memilih beberapa file PDF"
                        : "Format didukung: .pdf"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={cn("space-y-2")}>
                  <div
                    className={cn(
                      "mx-auto",
                      "flex",
                      "h-12",
                      "w-12",
                      "items-center",
                      "justify-center",
                      "rounded-2xl",
                      "border-3",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "bg-emerald-400",
                      "shadow-[3px_3px_0_0_#111827]",
                    )}
                  >
                    <CheckCircle2
                      className={cn("h-6", "w-6", "text-gray-900")}
                    />
                  </div>
                  <p
                    className={cn(
                      "text-sm",
                      "font-bold",
                      "text-gray-900",
                      "dark:text-white",
                    )}
                  >
                    {files.length === 1
                      ? files[0].name
                      : `${files.length} file PDF dipilih`}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-gray-500",
                      "dark:text-gray-400",
                    )}
                  >
                    Klik untuk mengganti file
                  </p>
                </div>
              )}
            </div>

            {/* Tool-specific Options */}
            {isImageConversion && (
              <div className={cn("mt-4", "space-y-2")}>
                <label
                  className={cn(
                    "block",
                    "text-xs",
                    "font-bold",
                    "text-gray-900",
                    "dark:text-gray-100",
                  )}
                >
                  Kualitas Output Gambar
                </label>
                <div className={cn("grid", "grid-cols-2", "gap-2")}>
                  <button
                    type="button"
                    onClick={() => setImageQuality("standard")}
                    className={cn(
                      "rounded-xl",
                      "border-2",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "p-2.5",
                      "text-xs",
                      "font-bold",
                      "transition-all",
                      imageQuality === "standard"
                        ? "bg-yellow-400 text-gray-900 shadow-[2px_2px_0_0_#111827]"
                        : "bg-white text-gray-700 dark:bg-[#1a1c22] dark:text-gray-300",
                    )}
                  >
                    Standar (150 DPI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageQuality("hd")}
                    className={cn(
                      "rounded-xl",
                      "border-2",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "p-2.5",
                      "text-xs",
                      "font-bold",
                      "transition-all",
                      imageQuality === "hd"
                        ? "bg-yellow-400 text-gray-900 shadow-[2px_2px_0_0_#111827]"
                        : "bg-white text-gray-700 dark:bg-[#1a1c22] dark:text-gray-300",
                    )}
                  >
                    High Definition (300 DPI)
                  </button>
                </div>
              </div>
            )}

            {(activeTool.id === "split-pdf" ||
              activeTool.id === "remove-pdf") && (
              <div className={cn("mt-4", "space-y-2")}>
                <label
                  className={cn(
                    "block",
                    "text-xs",
                    "font-bold",
                    "text-gray-900",
                    "dark:text-gray-100",
                  )}
                >
                  {activeTool.id === "split-pdf"
                    ? "Rentang Halaman (Contoh: 1-3, 5)"
                    : "Nomor Halaman yang Dihapus (Contoh: 2, 4)"}
                </label>
                <input
                  type="text"
                  placeholder={
                    activeTool.id === "split-pdf"
                      ? "Contoh: 1-5"
                      : "Contoh: 2, 3"
                  }
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  className={cn(
                    "w-full",
                    "rounded-xl",
                    "border-3",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-white",
                    "dark:bg-[#1a1c22]",
                    "p-3",
                    "text-sm",
                    "font-bold",
                    "text-gray-900",
                    "dark:text-white",
                    "focus:outline-none",
                  )}
                />
              </div>
            )}

            {activeTool.id === "compress-pdf" && (
              <div className={cn("mt-4", "space-y-2")}>
                <label
                  className={cn(
                    "block",
                    "text-xs",
                    "font-bold",
                    "text-gray-900",
                    "dark:text-gray-100",
                  )}
                >
                  Tingkat Kompresi
                </label>
                <div className={cn("grid", "grid-cols-3", "gap-2")}>
                  {(
                    [
                      { id: "extreme", label: "Ekstrem (Terkecil)" },
                      { id: "recommended", label: "Rekomendasi" },
                      { id: "low", label: "Rendah (Kualitas Max)" },
                    ] as const
                  ).map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setCompressLevel(lvl.id)}
                      className={cn(
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "dark:border-gray-700",
                        "p-2.5",
                        "text-xs",
                        "font-bold",
                        "transition-all",
                        compressLevel === lvl.id
                          ? "bg-yellow-400 text-gray-900 shadow-[2px_2px_0_0_#111827]"
                          : "bg-white text-gray-700 dark:bg-[#1a1c22] dark:text-gray-300",
                      )}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={cn("mt-6", "flex", "gap-3")}>
              {!isCompleted ? (
                <button
                  onClick={handleProcess}
                  disabled={files.length === 0 || isProcessing}
                  className={cn(
                    "flex-1",
                    "flex",
                    "items-center",
                    "justify-center",
                    "gap-2",
                    "rounded-xl",
                    "border-3",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-yellow-400",
                    "hover:bg-yellow-500",
                    "p-3.5",
                    "font-bold",
                    "text-gray-900",
                    "shadow-[4px_4px_0_0_#111827]",
                    "dark:shadow-[4px_4px_0_0_#000]",
                    "transition-all",
                    "disabled:opacity-50",
                    "disabled:cursor-not-allowed",
                    "hover:-translate-y-0.5",
                  )}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className={cn("h-5", "w-5", "animate-spin")} />
                      Memproses File...
                    </>
                  ) : (
                    <>Mulai Proses {activeTool.title}</>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleDownload}
                  className={cn(
                    "flex-1",
                    "flex",
                    "items-center",
                    "justify-center",
                    "gap-2",
                    "rounded-xl",
                    "border-3",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-emerald-400",
                    "hover:bg-emerald-500",
                    "p-3.5",
                    "font-bold",
                    "text-gray-900",
                    "shadow-[4px_4px_0_0_#111827]",
                    "dark:shadow-[4px_4px_0_0_#000]",
                    "transition-all",
                    "hover:-translate-y-0.5",
                  )}
                >
                  <Download className={cn("h-5", "w-5")} />
                  Unduh Dokumen Hasil
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
