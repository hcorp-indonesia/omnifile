import {
  convertPdfToExcelViaBackend,
  downloadAllExcelAsZip,
  downloadExcelFile,
  type ExcelConversionResult,
} from "@/lib/pdf-excel-api";
import { cn } from "@/lib/utils";
import { FileDropzone } from "@/pages/pdf/components/file-dropzone";
import {
  PdfBatchActionBar,
  PdfFileItem,
  type FileItemState,
} from "@/pages/pdf/components/pdf-file-item";
import { PdfExcelPreviewModal } from "@/pages/pdf/pdf-to-excel/components/pdf-excel-preview-modal";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function PdfToExcelPage() {
  const [items, setItems] = useState<FileItemState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    currentFileIndex: number;
    totalFiles: number;
    currentFileName: string;
    percent: number;
    phase: "uploading" | "converting";
  }>({
    currentFileIndex: 0,
    totalFiles: 0,
    currentFileName: "",
    percent: 0,
    phase: "uploading",
  });

  const [previewResult, setPreviewResult] =
    useState<ExcelConversionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFiles = async (rawFiles: File[]) => {
    const validPdfs = rawFiles.filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );
    if (validPdfs.length === 0) {
      toast.error("Please upload valid PDF documents");
      return;
    }

    const newItems: FileItemState[] = validPdfs.map((file, idx) => ({
      file,
      id: `${file.name}-${file.lastModified}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      status: "converting",
    }));

    setItems((prev) => [...prev, ...newItems]);
    setIsProcessing(true);

    for (let i = 0; i < newItems.length; i++) {
      const currentItem = newItems[i];

      setProgress({
        currentFileIndex: i + 1,
        totalFiles: newItems.length,
        currentFileName: currentItem.name,
        percent: Math.round((i / newItems.length) * 100),
        phase: "uploading",
      });

      try {
        const res = await convertPdfToExcelViaBackend(
          currentItem.file,
          undefined,
          (uploadPercent) => {
            const uploadRatio = uploadPercent / 100;
            setProgress({
              currentFileIndex: i + 1,
              totalFiles: newItems.length,
              currentFileName: currentItem.name,
              percent: Math.round(((i + uploadRatio) / newItems.length) * 80),
              phase: uploadPercent >= 100 ? "converting" : "uploading",
            });
          },
        );

        setItems((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? {
                  ...item,
                  status: "done",
                  engine: res.engine,
                  excelResult: res,
                }
              : item,
          ),
        );
      } catch (err: any) {
        const errorMsg = err?.message || "Failed to convert PDF to Excel";
        setItems((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? {
                  ...item,
                  status: "error",
                  errorMessage: errorMsg,
                }
              : item,
          ),
        );
        toast.error(`Failed to convert ${currentItem.name}: ${errorMsg}`);
      }
    }

    setIsProcessing(false);
    toast.success("Conversion completed!");
  };

  const handleResetAll = () => {
    setItems([]);
    setPreviewResult(null);
    toast.info("All files reset");
  };

  const handleDeleteFile = (fileId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== fileId));
    toast.info("File removed");
  };

  const handleDownloadFile = (item: FileItemState) => {
    if (item.excelResult) {
      downloadExcelFile(item.excelResult);
    }
  };

  const handleDownloadAllZip = async () => {
    const doneResults = items
      .filter((i) => i.status === "done" && i.excelResult)
      .map((i) => i.excelResult!);

    if (doneResults.length === 0) {
      toast.error("No converted files to download yet");
      return;
    }

    try {
      toast.info("Generating ZIP archive...");
      await downloadAllExcelAsZip(doneResults, "converted_spreadsheets.zip");
      toast.success("ZIP download started!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create ZIP package");
    }
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const totalSheets = items.reduce(
    (acc, curr) => acc + (curr.excelResult?.total_sheets || 0),
    0,
  );

  return (
    <div
      className={cn(
        "mx-auto",
        "max-w-5xl",
        "space-y-6",
        "p-4",
        "sm:p-8",
        "pb-36",
      )}
    >
      {/* Top Bar with Back and Reset All buttons */}
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
            "dark:bg-[#16181d]",
            "px-4",
            "py-2",
            "text-xs",
            "font-black",
            "text-gray-900",
            "dark:text-white",
            "shadow-[3px_3px_0_0_#111827]",
            "dark:shadow-[3px_3px_0_0_#000]",
            "hover:-translate-y-0.5",
            "transition-all",
          )}
        >
          <ArrowLeft className={cn("h-4", "w-4", "stroke-3")} />
          <span>Back</span>
        </Link>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleResetAll}
            className={cn(
              "inline-flex",
              "items-center",
              "gap-1.5",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-white",
              "dark:bg-[#16181d]",
              "px-3.5",
              "py-1.5",
              "text-xs",
              "font-bold",
              "text-red-600",
              "hover:bg-red-50",
              "dark:hover:bg-red-950/30",
              "cursor-pointer",
              "transition-colors",
            )}
          >
            <RotateCcw className={cn("h-3.5", "w-3.5")} />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Hero & Upload Dropzone */}
      <FileDropzone
        ref={fileInputRef}
        title="PDF to Excel Converter"
        description="Extract tables and numerical data from PDF documents into Excel spreadsheets (.xlsx) with AI detection."
        dropzoneSubtitle="Converts automatically to Excel upon selection."
        onFilesSelected={handleProcessFiles}
        disabled={isProcessing}
      />

      {/* Conversion Progress Bar */}
      {isProcessing && (
        <div
          className={cn(
            "rounded-2xl",
            "border-3",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-white",
            "dark:bg-[#16181d]",
            "p-5",
            "shadow-[4px_4px_0_0_#111827]",
            "dark:shadow-[4px_4px_0_0_#000]",
            "space-y-3",
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
                "gap-2",
                "text-gray-900",
                "dark:text-white",
              )}
            >
              <Loader2
                className={cn("h-4", "w-4", "animate-spin", "text-emerald-500")}
              />
              {progress.phase === "uploading" ? "Uploading" : "Converting"} {progress.currentFileIndex}/{progress.totalFiles}:{" "}
              <span className={cn("truncate", "max-w-xs")}>
                {progress.currentFileName}
              </span>
            </span>
            <span
              className={cn(
                "text-emerald-600",
                "dark:text-emerald-400",
                "font-extrabold",
                "text-sm",
              )}
            >
              {progress.phase === "uploading" ? `${progress.percent}%` : "Processing..."}
            </span>
          </div>

          <div
            className={cn(
              "h-3",
              "w-full",
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
                "from-emerald-400",
                "to-teal-500",
                "transition-all",
                "duration-150",
              )}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Uploaded File Items using unified PdfFileItem */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <PdfFileItem
              key={item.id}
              item={item}
              index={index}
              formatName="XLSX"
              onDeleteFile={handleDeleteFile}
              onDownloadFile={handleDownloadFile}
              onPreviewExcel={(res) => setPreviewResult(res)}
            />
          ))}
        </div>
      )}

      {/* Floating Bottom Batch Action Bar using unified PdfBatchActionBar */}
      {items.length > 0 && doneCount > 0 && (
        <PdfBatchActionBar
          totalFiles={items.length}
          totalPages={totalSheets}
          formatName="XLSX"
          onAddFiles={() => fileInputRef.current?.click()}
          onDownloadAllZip={handleDownloadAllZip}
        />
      )}

      {/* Interactive Sheet Preview Modal */}
      {previewResult && (
        <PdfExcelPreviewModal
          result={previewResult}
          onClose={() => setPreviewResult(null)}
        />
      )}
    </div>
  );
}
