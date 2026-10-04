import {
  base64ToPdfBlob,
  downloadPdfBlob,
  downloadTxtFile,
  ocrPdfViaBackend,
  type OcrPdfResult,
} from "@/lib/pdf-ocr-api";
import { cn } from "@/lib/utils";
import { FileDropzone } from "@/pages/pdf/components/file-dropzone";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Languages,
  RotateCcw,
  ScanText,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export interface OcrFileItemState {
  file: File;
  id: string;
  name: string;
  size: number;
  status: "pending" | "processing" | "done" | "error";
  result?: OcrPdfResult;
  errorMessage?: string;
}

interface LanguageOption {
  id: string;
  name: string;
  badge: string;
  desc: string;
}

const languageOptions: LanguageOption[] = [
  {
    id: "eng+ind",
    name: "English & Indonesian",
    badge: "Recommended",
    desc: "Best for mixed documents, academic theses, letters, & reports.",
  },
  {
    id: "ind",
    name: "Indonesian Only",
    badge: "Bahasa",
    desc: "Optimized for Indonesian ID cards, government forms, & local contracts.",
  },
  {
    id: "eng",
    name: "English Only",
    badge: "International",
    desc: "Highest accuracy for English journals, invoices, & textbooks.",
  },
];

export default function OcrPdfPage() {
  const [items, setItems] = useState<OcrFileItemState[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<string>("eng+ind");

  // Progress state
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

  // Text Viewer Modal
  const [textModalItem, setTextModalItem] = useState<{
    name: string;
    text: string;
    wordsCount: number;
    totalPages: number;
  } | null>(null);

  const [copied, setCopied] = useState<boolean>(false);
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

    const newItems: OcrFileItemState[] = validPdfs.map((file, idx) => ({
      file,
      id: `${file.name}-${file.lastModified}-${Date.now()}-${idx}`,
      name: file.name,
      size: file.size,
      status: "pending",
    }));

    const updatedItems = [...items, ...newItems];
    setItems(updatedItems);
    toast.info(
      `Added ${validPdfs.length} document${validPdfs.length > 1 ? "s" : ""} to queue.`,
    );

    await ocrItemsList(newItems, updatedItems);
  };

  const ocrItemsList = async (
    itemsToOcr: OcrFileItemState[],
    allItems: OcrFileItemState[],
  ) => {
    setIsProcessing(true);
    let currentPool = [...allItems];

    for (let i = 0; i < itemsToOcr.length; i++) {
      const target = itemsToOcr[i];
      setProgress({
        currentIndex: i + 1,
        total: itemsToOcr.length,
        currentName: target.name,
        percent: Math.round((i / itemsToOcr.length) * 100),
      });

      currentPool = currentPool.map((it) =>
        it.id === target.id ? { ...it, status: "processing" } : it,
      );
      setItems(currentPool);

      try {
        const cleanBase = target.name.replace(/\.pdf$/i, "");
        const res = await ocrPdfViaBackend(
          target.file,
          {
            language: selectedLang,
            output_file_name: `${cleanBase}_searchable.pdf`,
          },
          (uploadPercent) => {
            setProgress((prev) => ({
              ...prev,
              percent: Math.round(
                ((i + uploadPercent / 100) / itemsToOcr.length) * 100,
              ),
            }));
          },
        );

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
                errorMessage: err.message || "OCR failed",
              }
            : it,
        );
        setItems(currentPool);
      }
    }

    setProgress({
      currentIndex: itemsToOcr.length,
      total: itemsToOcr.length,
      currentName: "Completed",
      percent: 100,
    });

    setIsProcessing(false);
    toast.success("OCR recognition completed!");
  };

  const handleReOcrAll = async () => {
    if (items.length === 0) return;
    const itemsToReOcr = items.map((it) => ({
      ...it,
      status: "pending" as const,
      result: undefined,
      errorMessage: undefined,
    }));
    setItems(itemsToReOcr);
    await ocrItemsList(itemsToReOcr, itemsToReOcr);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDownloadPdf = (result: OcrPdfResult) => {
    try {
      const blob = base64ToPdfBlob(result.file_base64);
      downloadPdfBlob(blob, result.file_name);
      toast.success("Searchable PDF downloaded!");
    } catch {
      toast.error("Failed to generate PDF download.");
    }
  };

  const handleDownloadTxt = (result: OcrPdfResult) => {
    try {
      const cleanBase = result.file_name
        .replace(/_searchable\.pdf$/i, "")
        .replace(/\.pdf$/i, "");
      downloadTxtFile(result.extracted_text, `${cleanBase}_ocr_text.txt`);
      toast.success("Extracted text downloaded (.txt)!");
    } catch {
      toast.error("Failed to download text file.");
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setTextModalItem(null);
    setItems([]);
    setProgress({ currentIndex: 0, total: 0, currentName: "", percent: 0 });
  };

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
        title="Upload PDF to OCR"
        description="Drag & drop scanned PDF documents here to recognize and extract text."
        dropzoneSubtitle="Creates searchable PDFs and extracts readable text."
        accept=".pdf,application/pdf"
        multiple={true}
        iconBg="bg-teal-300"
        icon={<ScanText className={cn("h-7", "w-7", "text-gray-900")} />}
        onFilesSelected={handleProcessFiles}
        disabled={isProcessing}
      />

      {/* OCR Settings Card */}
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
            "items-center",
            "gap-2",
            "border-b-2",
            "border-gray-200",
            "dark:border-gray-800",
            "pb-4",
          )}
        >
          <Languages className={cn("h-5", "w-5", "text-teal-600")} />
          <div>
            <h3
              className={cn(
                "text-lg",
                "font-black",
                "text-gray-900",
                "dark:text-white",
              )}
            >
              OCR Language Selection
            </h3>
            <p
              className={cn(
                "text-xs",
                "font-bold",
                "text-gray-500",
                "dark:text-gray-400",
              )}
            >
              Select the primary language of your scanned document for maximum
              recognition accuracy.
            </p>
          </div>
        </div>

        {/* Language Options Grid */}
        <div className={cn("grid", "grid-cols-1", "sm:grid-cols-3", "gap-3.5")}>
          {languageOptions.map((opt) => {
            const isSelected = selectedLang === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedLang(opt.id)}
                className={cn(
                  "group",
                  "flex",
                  "flex-col",
                  "justify-between",
                  "gap-2.5",
                  "rounded-2xl",
                  "border-3",
                  "p-4",
                  "transition-all",
                  "cursor-pointer",
                  "hover:-translate-y-1",
                  isSelected
                    ? "border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-950/40 shadow-[4px_4px_0_0_#111827] dark:shadow-[4px_4px_0_0_#000]"
                    : "border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 hover:border-gray-900",
                )}
              >
                <div className={cn("space-y-1")}>
                  <div
                    className={cn("flex", "items-center", "justify-between")}
                  >
                    <h4
                      className={cn(
                        "text-sm",
                        "font-black",
                        "text-gray-900",
                        "dark:text-white",
                      )}
                    >
                      {opt.name}
                    </h4>
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
                          ? "bg-teal-400 text-gray-900"
                          : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                      )}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-gray-600",
                      "dark:text-gray-400",
                      "leading-relaxed",
                    )}
                  >
                    {opt.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

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
              onClick={handleReOcrAll}
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
              {isProcessing ? "Processing OCR..." : "OCR PDF"}
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
            <span>
              Recognizing text in{" "}
              <span className={cn("text-teal-600", "dark:text-teal-400")}>
                {progress.currentName}
              </span>{" "}
              ({progress.currentIndex}/{progress.total})...
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
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Document Queue List */}
      {items.length > 0 && (
        <div className={cn("space-y-3")}>
          <div className={cn("space-y-3")}>
            {items.map((item, index) => {
              const isDone = item.status === "done";
              const isProcessingItem = item.status === "processing";
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
                  {/* Left info */}
                  <div
                    className={cn("flex", "items-center", "gap-3.5", "min-w-0")}
                  >
                    <div
                      className={cn(
                        "flex",
                        "h-7",
                        "w-7",
                        "shrink-0",
                        "items-center",
                        "justify-center",
                        "rounded-lg",
                        "border-2",
                        "border-gray-900",
                        "bg-teal-300",
                        "text-xs",
                        "font-black",
                        "text-gray-900",
                      )}
                    >
                      #{index + 1}
                    </div>

                    <div
                      className={cn(
                        "flex",
                        "h-11",
                        "w-11",
                        "shrink-0",
                        "items-center",
                        "justify-center",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "bg-red-100",
                        "text-red-600",
                      )}
                    >
                      <FileText className={cn("h-6", "w-6")} />
                    </div>

                    <div className={cn("min-w-0", "space-y-1")}>
                      <h4
                        className={cn(
                          "truncate",
                          "text-sm",
                          "font-black",
                          "text-gray-900",
                          "dark:text-white",
                        )}
                        title={item.name}
                      >
                        {item.name}
                      </h4>

                      <div
                        className={cn(
                          "flex",
                          "flex-wrap",
                          "items-center",
                          "gap-2",
                          "text-xs",
                        )}
                      >
                        <span
                          className={cn(
                            "font-bold",
                            "text-gray-500",
                            "dark:text-gray-400",
                          )}
                        >
                          {formatFileSize(item.size)}
                        </span>

                        {isProcessingItem && (
                          <span
                            className={cn(
                              "font-bold",
                              "text-teal-600",
                              "dark:text-teal-400",
                            )}
                          >
                            • Processing OCR...
                          </span>
                        )}

                        {isDone && item.result && (
                          <>
                            <span
                              className={cn(
                                "rounded-md",
                                "border",
                                "border-emerald-600/30",
                                "bg-emerald-100",
                                "dark:bg-emerald-950/40",
                                "px-2",
                                "py-0.5",
                                "text-[11px]",
                                "font-black",
                                "text-emerald-700",
                                "dark:text-emerald-300",
                              )}
                            >
                              Searchable PDF Ready •{" "}
                              {item.result.words_count.toLocaleString()} words
                            </span>
                            <span
                              className={cn(
                                "text-[11px]",
                                "font-bold",
                                "text-gray-500",
                              )}
                            >
                              ({item.result.total_pages} page
                              {item.result.total_pages > 1 ? "s" : ""})
                            </span>
                          </>
                        )}

                        {isError && (
                          <span className={cn("font-bold", "text-red-500")}>
                            • {item.errorMessage || "OCR Recognition Failed"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
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
                          onClick={() => handleDownloadPdf(item.result!)}
                          title="Download Searchable PDF"
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
                          Download PDF
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setTextModalItem({
                              name: item.name,
                              text: item.result!.extracted_text,
                              wordsCount: item.result!.words_count,
                              totalPages: item.result!.total_pages,
                            })
                          }
                          title="View Extracted Text"
                          className={cn(
                            "flex",
                            "items-center",
                            "gap-1.5",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "dark:border-gray-700",
                            "bg-white",
                            "dark:bg-gray-800",
                            "px-3.5",
                            "py-2",
                            "text-xs",
                            "font-bold",
                            "text-gray-800",
                            "dark:text-gray-200",
                            "shadow-[2px_2px_0_0_#111827]",
                            "dark:shadow-[2px_2px_0_0_#000]",
                            "hover:-translate-y-0.5",
                            "transition-all",
                            "cursor-pointer",
                          )}
                        >
                          <Eye className={cn("h-3.5", "w-3.5")} />
                          View Text
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadTxt(item.result!)}
                          title="Download Text File (.txt)"
                          className={cn(
                            "flex",
                            "items-center",
                            "justify-center",
                            "h-9",
                            "w-9",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "dark:border-gray-700",
                            "bg-gray-100",
                            "dark:bg-gray-800",
                            "text-gray-700",
                            "dark:text-gray-300",
                            "shadow-[2px_2px_0_0_#111827]",
                            "dark:shadow-[2px_2px_0_0_#000]",
                            "hover:-translate-y-0.5",
                            "transition-all",
                            "cursor-pointer",
                          )}
                        >
                          <FileText className={cn("h-4", "w-4")} />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={isProcessing}
                      title="Remove file"
                      className={cn(
                        "flex",
                        "items-center",
                        "justify-center",
                        "h-9",
                        "w-9",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "dark:border-gray-700",
                        "bg-red-100",
                        "dark:bg-red-950/40",
                        "text-red-600",
                        "shadow-[2px_2px_0_0_#111827]",
                        "dark:shadow-[2px_2px_0_0_#000]",
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

      {/* Extracted Text Viewer Modal */}
      {textModalItem && (
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
          onClick={() => setTextModalItem(null)}
        >
          <div
            className={cn(
              "relative",
              "flex",
              "flex-col",
              "max-h-[85vh]",
              "w-full",
              "max-w-3xl",
              "rounded-3xl",
              "border-3",
              "border-gray-900",
              "bg-white",
              "dark:bg-[#1a1c24]",
              "shadow-[8px_8px_0_0_#111827]",
              "dark:shadow-[8px_8px_0_0_#000]",
              "overflow-hidden",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className={cn(
                "flex",
                "items-center",
                "justify-between",
                "border-b-3",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-teal-300",
                "px-6",
                "py-4",
              )}
            >
              <div className={cn("min-w-0")}>
                <h3
                  className={cn(
                    "truncate",
                    "text-base",
                    "font-black",
                    "text-gray-900",
                  )}
                >
                  Extracted OCR Text
                </h3>
                <p className={cn("text-xs", "font-bold", "text-gray-800")}>
                  {textModalItem.name} •{" "}
                  {textModalItem.wordsCount.toLocaleString()} words (
                  {textModalItem.totalPages} pages)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTextModalItem(null)}
                className={cn(
                  "flex",
                  "h-8",
                  "w-8",
                  "items-center",
                  "justify-center",
                  "rounded-lg",
                  "border-2",
                  "border-gray-900",
                  "bg-white",
                  "text-gray-900",
                  "shadow-[2px_2px_0_0_#111827]",
                  "hover:-translate-y-0.5",
                  "transition-all",
                  "cursor-pointer",
                )}
              >
                <X className={cn("h-4", "w-4")} />
              </button>
            </div>

            {/* Modal Body: Text Area */}
            <div
              className={cn("p-6", "overflow-y-auto", "flex-1", "space-y-4")}
            >
              <div
                className={cn(
                  "rounded-2xl",
                  "border-2",
                  "border-gray-300",
                  "dark:border-gray-700",
                  "bg-gray-50",
                  "dark:bg-gray-900/60",
                  "p-4",
                  "font-mono",
                  "text-xs",
                  "sm:text-sm",
                  "leading-relaxed",
                  "text-gray-800",
                  "dark:text-gray-200",
                  "whitespace-pre-wrap",
                  "select-text",
                  "max-h-[50vh]",
                  "overflow-y-auto",
                )}
              >
                {textModalItem.text ? (
                  textModalItem.text
                ) : (
                  <span className={cn("text-gray-400", "italic")}>
                    No readable text detected in this document.
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className={cn(
                "flex",
                "items-center",
                "justify-between",
                "border-t-2",
                "border-gray-200",
                "dark:border-gray-800",
                "bg-gray-50",
                "dark:bg-gray-900/40",
                "px-6",
                "py-3.5",
              )}
            >
              <span className={cn("text-xs", "font-bold", "text-gray-500")}>
                Total words:{" "}
                <strong>{textModalItem.wordsCount.toLocaleString()}</strong>
              </span>

              <div className={cn("flex", "items-center", "gap-2")}>
                <button
                  type="button"
                  onClick={() => handleCopyText(textModalItem.text)}
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-1.5",
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "bg-teal-300",
                    "px-4",
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
                  {copied ? (
                    <>
                      <Check className={cn("h-3.5", "w-3.5")} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className={cn("h-3.5", "w-3.5")} />
                      Copy Text
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadTxtFile(
                      textModalItem.text,
                      `${textModalItem.name.replace(/\.pdf$/i, "")}_ocr.txt`,
                    )
                  }
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-1.5",
                    "rounded-xl",
                    "border-2",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-white",
                    "dark:bg-gray-800",
                    "px-4",
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
                  <Download className={cn("h-3.5", "w-3.5")} />
                  Download TXT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
