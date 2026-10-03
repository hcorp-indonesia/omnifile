import {
  base64ToPdfBlob,
  downloadPdfBlob,
  mergePdfViaBackend,
  type MergePdfResult,
} from "@/lib/pdf-merge-api";
import { cn } from "@/lib/utils";
import { FileDropzone } from "@/pages/pdf/components/file-dropzone";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface MergeFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
}

export default function MergePdfPage() {
  const [items, setItems] = useState<MergeFileItem[]>([]);
  const [outputFileName, setOutputFileName] = useState("merged-document.pdf");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    percent: number;
    phase: "uploading" | "merging";
  }>({
    percent: 0,
    phase: "uploading",
  });
  const [mergeResult, setMergeResult] = useState<MergePdfResult | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFilesSelected = (rawFiles: File[]) => {
    const validPdfs = rawFiles.filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );

    if (validPdfs.length === 0) {
      toast.error("Please select valid PDF documents");
      return;
    }

    const newItems: MergeFileItem[] = validPdfs.map((file, idx) => ({
      id: `${file.name}-${file.lastModified}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
    }));

    setItems((prev) => [...prev, ...newItems]);
    toast.success(
      `Added ${newItems.length} PDF file${newItems.length > 1 ? "s" : ""}`,
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === items.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setItems([]);
    setMergeResult(null);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      toast.error("Please add at least 2 PDF files to merge");
      return;
    }

    setIsProcessing(true);
    setProgress({ percent: 0, phase: "uploading" });

    try {
      const filesToMerge = items.map((item) => item.file);
      const res = await mergePdfViaBackend(
        filesToMerge,
        {
          output_file_name: outputFileName,
        },
        (uploadPercent) => {
          setProgress({
            percent: uploadPercent,
            phase: uploadPercent >= 100 ? "merging" : "uploading",
          });
        },
      );

      setMergeResult(res);

      // Create preview blob URL
      const blob = base64ToPdfBlob(res.file_base64);
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);

      toast.success(
        `Merged ${res.total_files} files into ${res.total_pages} pages!`,
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to merge PDF files");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResult = () => {
    if (!mergeResult) return;
    const blob = base64ToPdfBlob(mergeResult.file_base64);
    downloadPdfBlob(blob, mergeResult.file_name);
    toast.success("Download started!");
  };

  const totalBytes = items.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className={cn("mx-auto", "max-w-5xl", "space-y-6", "py-4")}>
      {/* Header Navigation & Reset */}
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

        {/* Dropzone (Always visible with full size & layout) */}
        <FileDropzone
          title="Upload PDF Files to Merge"
          description="Select 2 or more PDF documents. You can reorder them before merging."
          dropzoneTitle="Drag & Drop PDF files here"
          dropzoneSubtitle="Supports multiple PDF files up to 100MB"
          accept=".pdf,application/pdf"
          multiple={true}
          iconBg="bg-purple-300"
          icon={<Layers className={cn("h-7", "w-7", "text-gray-900")} />}
          onFilesSelected={handleFilesSelected}
          disabled={isProcessing}
        />

        {/* Reorderable Files List & Merge Details */}
        {items.length > 0 && (
          <div className={cn("space-y-6")}>
            {/* Reorderable Files List Card */}
            <div
              className={cn(
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
                  "flex-col",
                  "gap-3",
                  "sm:flex-row",
                  "sm:items-center",
                  "sm:justify-between",
                  "border-b-2",
                  "border-gray-200",
                  "dark:border-gray-800",
                  "pb-4",
                )}
              >
                <div>
                  <h2
                    className={cn(
                      "text-lg",
                      "font-black",
                      "text-gray-900",
                      "dark:text-white",
                    )}
                  >
                    Merge Order ({items.length} files • {formatFileSize(totalBytes)})
                  </h2>
                  <p
                    className={cn(
                      "text-xs",
                      "font-medium",
                      "text-gray-500",
                      "dark:text-gray-400",
                    )}
                  >
                    The final PDF will be created following this exact sequence
                    from top to bottom.
                  </p>
                </div>

                <div className={cn("flex", "items-center", "gap-2")}>
                  <input
                    ref={addMoreInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    className={cn("hidden")}
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesSelected(Array.from(e.target.files));
                        e.target.value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addMoreInputRef.current?.click()}
                    disabled={isProcessing}
                    className={cn(
                      "inline-flex",
                      "items-center",
                      "gap-1.5",
                      "rounded-xl",
                      "border-2",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "bg-yellow-400",
                      "px-3.5",
                      "py-2",
                      "text-xs",
                      "font-black",
                      "text-gray-900",
                      "shadow-[2px_2px_0_0_#111827]",
                      "hover:-translate-y-0.5",
                      "hover:bg-yellow-500",
                      "transition-all",
                      "cursor-pointer",
                    )}
                  >
                    <Plus className={cn("h-3.5", "w-3.5")} />
                    Add
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className={cn("mt-4", "space-y-3")}>
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex",
                      "items-center",
                      "justify-between",
                      "gap-3",
                      "rounded-2xl",
                      "border-2",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "bg-[#fdfbf7]",
                      "dark:bg-[#12141a]",
                      "p-3.5",
                      "sm:p-4",
                      "shadow-[3px_3px_0_0_#111827]",
                      "dark:shadow-[3px_3px_0_0_#000]",
                      "transition-all",
                    )}
                  >
                    <div
                      className={cn("flex", "items-center", "gap-3", "min-w-0")}
                    >
                      {/* Order Pill */}
                      <span
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
                          "bg-purple-300",
                          "text-xs",
                          "font-black",
                          "text-gray-900",
                        )}
                      >
                        #{index + 1}
                      </span>

                      {/* PDF Icon */}
                      <div
                        className={cn(
                          "flex",
                          "h-9",
                          "w-9",
                          "shrink-0",
                          "items-center",
                          "justify-center",
                          "rounded-xl",
                          "border-2",
                          "border-gray-900",
                          "bg-red-400",
                          "text-white",
                        )}
                      >
                        <FileText className={cn("h-4", "w-4")} />
                      </div>

                      {/* File Name & Size */}
                      <div className={cn("min-w-0")}>
                        <p
                          className={cn(
                            "truncate",
                            "text-sm",
                            "font-bold",
                            "text-gray-900",
                            "dark:text-white",
                          )}
                        >
                          {item.name}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            "font-medium",
                            "text-gray-500",
                            "dark:text-gray-400",
                          )}
                        >
                          {formatFileSize(item.size)}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Move Up / Down / Remove */}
                    <div
                      className={cn(
                        "flex",
                        "items-center",
                        "gap-1.5",
                        "shrink-0",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0 || isProcessing}
                        aria-label="Move up"
                        className={cn(
                          "flex",
                          "h-8",
                          "w-8",
                          "items-center",
                          "justify-center",
                          "rounded-lg",
                          "border-2",
                          "border-gray-900",
                          "dark:border-gray-700",
                          "bg-white",
                          "dark:bg-[#1a1c24]",
                          "text-gray-800",
                          "dark:text-gray-200",
                          "disabled:opacity-30",
                          "hover:bg-gray-100",
                          "dark:hover:bg-gray-800",
                          "cursor-pointer",
                        )}
                      >
                        <ArrowUp className={cn("h-3.5", "w-3.5")} />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1 || isProcessing}
                        aria-label="Move down"
                        className={cn(
                          "flex",
                          "h-8",
                          "w-8",
                          "items-center",
                          "justify-center",
                          "rounded-lg",
                          "border-2",
                          "border-gray-900",
                          "dark:border-gray-700",
                          "bg-white",
                          "dark:bg-[#1a1c24]",
                          "text-gray-800",
                          "dark:text-gray-200",
                          "disabled:opacity-30",
                          "hover:bg-gray-100",
                          "dark:hover:bg-gray-800",
                          "cursor-pointer",
                        )}
                      >
                        <ArrowDown className={cn("h-3.5", "w-3.5")} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={isProcessing}
                        aria-label="Remove file"
                        className={cn(
                          "flex",
                          "h-8",
                          "w-8",
                          "items-center",
                          "justify-center",
                          "rounded-lg",
                          "border-2",
                          "border-gray-900",
                          "dark:border-gray-700",
                          "bg-red-100",
                          "dark:bg-red-950/40",
                          "text-red-700",
                          "dark:text-red-400",
                          "hover:bg-red-200",
                          "transition-colors",
                        )}
                      >
                        <Trash2 className={cn("h-3.5", "w-3.5")} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Output File Name Config & Action Button */}
              <div className={cn("mt-6", "space-y-4")}>
                <div className={cn("space-y-1.5")}>
                  <label
                    htmlFor="output-file-name"
                    className={cn(
                      "block",
                      "text-xs",
                      "font-black",
                      "text-gray-700",
                      "dark:text-gray-300",
                    )}
                  >
                    Output File Name
                  </label>
                  <input
                    id="output-file-name"
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    placeholder="merged-document.pdf"
                    disabled={isProcessing}
                    className={cn(
                      "w-full",
                      "rounded-xl",
                      "border-2",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "bg-[#fdfbf7]",
                      "dark:bg-[#12141a]",
                      "px-3.5",
                      "py-2",
                      "text-xs",
                      "sm:text-sm",
                      "font-bold",
                      "text-gray-900",
                      "dark:text-white",
                      "shadow-[2px_2px_0_0_#111827]",
                      "dark:shadow-[2px_2px_0_0_#000]",
                      "focus:outline-none",
                      "focus:ring-2",
                      "focus:ring-purple-400",
                    )}
                  />
                </div>

                {isProcessing ? (
                  <div className={cn("space-y-3")}>
                    <div
                      className={cn(
                        "flex",
                        "items-center",
                        "justify-between",
                        "text-xs",
                        "font-bold",
                      )}
                    >
                      <span className={cn("flex", "items-center", "gap-2")}>
                        <Loader2
                          className={cn(
                            "h-4",
                            "w-4",
                            "animate-spin",
                            "text-purple-600",
                          )}
                        />
                        {progress.phase === "uploading"
                          ? "Uploading PDF files..."
                          : "Merging PDF with Go engine..."}
                      </span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div
                      className={cn(
                        "h-3.5",
                        "w-full",
                        "overflow-hidden",
                        "rounded-full",
                        "border-2",
                        "border-gray-900",
                        "bg-gray-200",
                      )}
                    >
                      <div
                        className={cn(
                          "h-full",
                          "bg-purple-500",
                          "transition-all",
                          "duration-300",
                        )}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleMerge}
                    disabled={items.length < 2}
                    className={cn(
                      "flex",
                      "w-full",
                      "items-center",
                      "justify-center",
                      "gap-2",
                      "rounded-2xl",
                      "border-3",
                      "border-gray-900",
                      "bg-yellow-400",
                      "py-3.5",
                      "text-sm",
                      "sm:text-base",
                      "font-black",
                      "text-gray-900",
                      "shadow-[4px_4px_0_0_#111827]",
                      "transition-all",
                      "hover:-translate-y-1",
                      "hover:bg-yellow-500",
                      "hover:shadow-[6px_6px_0_0_#111827]",
                      "disabled:opacity-50",
                      "disabled:pointer-events-none",
                      "cursor-pointer",
                    )}
                  >
                    Merge Now
                  </button>
                )}

                {items.length < 2 && (
                  <p
                    className={cn(
                      "mt-2",
                      "text-center",
                      "text-xs",
                      "font-bold",
                      "text-amber-600",
                      "dark:text-amber-400",
                    )}
                  >
                    ⚠️ Please add at least 2 PDF documents to proceed with
                    merge.
                  </p>
                )}
              </div>
            </div>

            {/* Success Result Card */}
            {mergeResult && (
              <div
                className={cn(
                  "animate-in",
                  "fade-in",
                  "slide-in-from-bottom-4",
                  "duration-300",
                  "rounded-3xl",
                  "border-3",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "bg-emerald-100",
                  "dark:bg-emerald-950/40",
                  "p-6",
                  "sm:p-8",
                  "shadow-[6px_6px_0_0_#111827]",
                  "dark:shadow-[6px_6px_0_0_#000]",
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
                  )}
                >
                  <div className={cn("flex", "items-center", "gap-3")}>
                    <div
                      className={cn(
                        "flex",
                        "h-12",
                        "w-12",
                        "items-center",
                        "justify-center",
                        "rounded-2xl",
                        "border-2",
                        "border-gray-900",
                        "bg-emerald-400",
                        "text-gray-900",
                        "shadow-[2px_2px_0_0_#111827]",
                      )}
                    >
                      <CheckCircle2 className={cn("h-6", "w-6")} />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-lg",
                          "font-black",
                          "text-gray-900",
                          "dark:text-white",
                        )}
                      >
                        {mergeResult.file_name}
                      </h3>
                      <p
                        className={cn(
                          "text-xs",
                          "font-bold",
                          "text-emerald-900",
                          "dark:text-emerald-300",
                        )}
                      >
                        {mergeResult.total_files} Files Combined •{" "}
                        {mergeResult.total_pages} Total Pages •{" "}
                        {formatFileSize(mergeResult.file_size)}
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex",
                      "items-center",
                      "gap-2.5",
                      "w-full",
                      "sm:w-auto",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className={cn(
                        "inline-flex",
                        "flex-1",
                        "sm:flex-none",
                        "items-center",
                        "justify-center",
                        "gap-1.5",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "dark:border-gray-700",
                        "bg-white",
                        "dark:bg-[#1a1c24]",
                        "px-4",
                        "py-2.5",
                        "text-xs",
                        "font-black",
                        "text-gray-900",
                        "dark:text-white",
                        "shadow-[2px_2px_0_0_#111827]",
                        "hover:-translate-y-0.5",
                        "transition-all",
                        "cursor-pointer",
                      )}
                    >
                      <Eye className={cn("h-4", "w-4")} />
                      Preview PDF
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadResult}
                      className={cn(
                        "inline-flex",
                        "flex-1",
                        "sm:flex-none",
                        "items-center",
                        "justify-center",
                        "gap-1.5",
                        "rounded-xl",
                        "border-2",
                        "border-gray-900",
                        "bg-emerald-400",
                        "px-5",
                        "py-2.5",
                        "text-xs",
                        "font-black",
                        "text-gray-900",
                        "shadow-[2px_2px_0_0_#111827]",
                        "hover:-translate-y-0.5",
                        "hover:bg-emerald-500",
                        "transition-all",
                        "cursor-pointer",
                      )}
                    >
                      <Download className={cn("h-4", "w-4")} />
                      Download PDF
                    </button>
                  </div>
                </div>

                {/* Merged Breakdown Table */}
                <div
                  className={cn(
                    "mt-6",
                    "rounded-2xl",
                    "border-2",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-white",
                    "dark:bg-[#1a1c24]",
                    "overflow-hidden",
                  )}
                >
                  <div
                    className={cn(
                      "bg-gray-100",
                      "dark:bg-gray-800",
                      "px-4",
                      "py-2",
                      "text-xs",
                      "font-black",
                      "border-b",
                      "border-gray-200",
                      "dark:border-gray-700",
                    )}
                  >
                    Included Documents Summary
                  </div>
                  <div
                    className={cn(
                      "divide-y",
                      "divide-gray-200",
                      "dark:divide-gray-800",
                    )}
                  >
                    {mergeResult.files.map((f, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex",
                          "items-center",
                          "justify-between",
                          "px-4",
                          "py-2.5",
                          "text-xs",
                        )}
                      >
                        <div className={cn("flex", "items-center", "gap-2")}>
                          <span
                            className={cn(
                              "font-black",
                              "text-purple-600",
                              "dark:text-purple-400",
                            )}
                          >
                            #{idx + 1}
                          </span>
                          <span
                            className={cn(
                              "font-bold",
                              "text-gray-900",
                              "dark:text-gray-200",
                            )}
                          >
                            {f.name}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "flex",
                            "items-center",
                            "gap-4",
                            "text-gray-500",
                          )}
                        >
                          <span>{f.pages} pages</span>
                          <span>{formatFileSize(f.size)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PDF Preview Modal */}
        {isPreviewOpen && previewBlobUrl && (
          <div
            className={cn(
              "fixed",
              "inset-0",
              "z-50",
              "flex",
              "items-center",
              "justify-center",
              "p-4",
              "bg-black/60",
              "backdrop-blur-sm",
            )}
          >
            <div
              className={cn(
                "relative",
                "flex",
                "flex-col",
                "w-full",
                "max-w-4xl",
                "h-[88vh]",
                "rounded-3xl",
                "border-3",
                "border-gray-900",
                "bg-white",
                "dark:bg-[#1a1c24]",
                "shadow-[8px_8px_0_0_#111827]",
                "overflow-hidden",
              )}
            >
              {/* Modal Header */}
              <div
                className={cn(
                  "flex",
                  "items-center",
                  "justify-between",
                  "border-b-3",
                  "border-gray-900",
                  "bg-purple-300",
                  "dark:bg-purple-900/60",
                  "px-6",
                  "py-3.5",
                )}
              >
                <div className={cn("flex", "items-center", "gap-2")}>
                  <FileText className={cn("h-5", "w-5", "text-gray-900")} />
                  <span
                    className={cn(
                      "text-sm",
                      "font-black",
                      "text-gray-900",
                      "dark:text-white",
                    )}
                  >
                    {mergeResult?.file_name || "Merged Document Preview"}
                  </span>
                </div>

                <div className={cn("flex", "items-center", "gap-2")}>
                  <button
                    type="button"
                    onClick={handleDownloadResult}
                    className={cn(
                      "inline-flex",
                      "items-center",
                      "gap-1",
                      "rounded-lg",
                      "border-2",
                      "border-gray-900",
                      "bg-emerald-400",
                      "px-3",
                      "py-1.5",
                      "text-xs",
                      "font-black",
                      "text-gray-900",
                      "shadow-[2px_2px_0_0_#111827]",
                      "hover:bg-emerald-500",
                      "cursor-pointer",
                    )}
                  >
                    <Download className={cn("h-3.5", "w-3.5")} />
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(false)}
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
                      "dark:bg-[#12141a]",
                      "text-gray-800",
                      "dark:text-gray-200",
                      "shadow-[2px_2px_0_0_#111827]",
                      "hover:bg-gray-100",
                      "cursor-pointer",
                    )}
                  >
                    <X className={cn("h-4", "w-4")} />
                  </button>
                </div>
              </div>

              {/* Modal Iframe Content */}
              <div className={cn("flex-1", "bg-gray-100", "dark:bg-[#12141a]")}>
                <iframe
                  src={previewBlobUrl}
                  title="PDF Preview"
                  className={cn("w-full", "h-full", "border-none")}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
