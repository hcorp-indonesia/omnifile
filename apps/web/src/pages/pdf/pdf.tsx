import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useNavigate } from "react-router-dom";
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
      "Convert PDF documents to Microsoft Word (.docx) format with editable text.",
    badge: "Convert",
    icon: FileText,
    bg: "bg-blue-300",
  },
  {
    id: "pdf-to-excel",
    title: "PDF to Excel",
    description:
      "Extract tables and numerical data from PDF documents into Excel spreadsheets (.xlsx).",
    badge: "Convert",
    icon: FileSpreadsheet,
    bg: "bg-emerald-300",
  },
  {
    id: "pdf-to-jpg",
    title: "PDF to JPG",
    description:
      "Convert each PDF page into crisp, high-quality JPG image files.",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-amber-300",
  },
  {
    id: "pdf-to-jpeg",
    title: "PDF to JPEG",
    description:
      "Save all PDF pages as standard JPEG images for easy sharing.",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-yellow-300",
  },
  {
    id: "pdf-to-png",
    title: "PDF to PNG",
    description:
      "Convert PDF pages into high-definition transparent PNG images.",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-sky-300",
  },
  {
    id: "pdf-to-webp",
    title: "PDF to WebP",
    description:
      "Convert PDF pages into lightweight, modern WebP images for web speed.",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-indigo-300",
  },
  {
    id: "pdf-to-avif",
    title: "PDF to AVIF",
    description:
      "Convert PDF pages to next-generation AVIF images with maximum compression efficiency.",
    badge: "Image",
    icon: ImageIcon,
    bg: "bg-rose-300",
  },
  {
    id: "merge-pdf",
    title: "Merge PDF",
    description:
      "Merge multiple separate PDF files into a single ordered document.",
    badge: "Organize",
    icon: Layers,
    bg: "bg-purple-300",
    acceptMultiple: true,
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    description:
      "Extract specific page ranges or split a PDF file into separate documents.",
    badge: "Organize",
    icon: Scissors,
    bg: "bg-pink-300",
  },
  {
    id: "ocr-pdf",
    title: "OCR PDF",
    description:
      "Extract and recognize text from scanned PDFs into selectable, copyable text.",
    badge: "AI Powered",
    icon: ScanText,
    bg: "bg-teal-300",
  },
  {
    id: "remove-pdf",
    title: "Remove PDF",
    description:
      "Delete one or more unwanted page numbers from your PDF document.",
    badge: "Edit",
    icon: FileMinus,
    bg: "bg-red-300",
  },
  {
    id: "compress-pdf",
    title: "Compress PDF",
    description:
      "Drastically reduce PDF file size without sacrificing readability.",
    badge: "Optimize",
    icon: FileArchive,
    bg: "bg-orange-300",
  },
];

export default function PDFPage() {
  const navigate = useNavigate();
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
    if (
      tool.id === "pdf-to-jpg" ||
      tool.id === "pdf-to-jpeg" ||
      tool.id === "pdf-to-png" ||
      tool.id === "pdf-to-webp" ||
      tool.id === "pdf-to-avif"
    ) {
      navigate(`/pdf/${tool.id}`);
      return;
    }
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
      toast.error("Please select at least one PDF file first!");
      return;
    }

    if (
      (activeTool?.id === "split-pdf" || activeTool?.id === "remove-pdf") &&
      !pageInput.trim()
    ) {
      toast.error("Please enter the page numbers to process!");
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      toast.success(`${activeTool?.title} processed successfully!`);
    }, 2000);
  };

  const handleDownload = () => {
    toast.success("Downloading processed PDF document...");
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
          "auto-rows-fr",
          "pt-4",
        )}
      >
        {pdfTools.map((tool) => (
          <Card
            key={tool.id}
            variant="interactive"
            rounded="3xl"
            onClick={() => handleOpenTool(tool)}
            className={cn(
              "group",
              "flex",
              "h-full",
              "flex-col",
              "justify-between",
              "p-6",
            )}
          >
            <div className="flex flex-col flex-1">
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
                  "line-clamp-2",
                  "h-10",
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
              Try Now <ArrowRight className={cn("w-4", "h-4")} />
            </div>
          </Card>
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
          <Card
            variant="elevated"
            rounded="3xl"
            className={cn(
              "relative",
              "w-full",
              "max-w-2xl",
              "p-6",
              "sm:p-8",
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
                      Select or Drag & Drop PDF files
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
                        ? "Multiple PDF files supported"
                        : "Supported format: .pdf"}
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
                      : `${files.length} PDF files selected`}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-gray-500",
                      "dark:text-gray-400",
                    )}
                  >
                    Click to replace file
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
                  Image Output Quality
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
                    Standard (150 DPI)
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
              <div className={cn("mt-4")}>
                <Input
                  label={
                    activeTool.id === "split-pdf"
                      ? "Page Range (e.g. 1-3, 5)"
                      : "Page Numbers to Remove (e.g. 2, 4)"
                  }
                  placeholder={
                    activeTool.id === "split-pdf"
                      ? "e.g. 1-5"
                      : "e.g. 2, 3"
                  }
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
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
                  Compression Level
                </label>
                <div className={cn("grid", "grid-cols-3", "gap-2")}>
                  {(
                    [
                      { id: "extreme", label: "Extreme (Smallest)" },
                      { id: "recommended", label: "Recommended" },
                      { id: "low", label: "Low (Max Quality)" },
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
                      Processing File...
                    </>
                  ) : (
                    <>Start Processing {activeTool.title}</>
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
                  Download Result Document
                </button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
