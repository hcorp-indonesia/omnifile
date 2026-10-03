import {
  convertPdfToWordViaBackend,
  downloadAllWordAsZip,
  downloadWordFile,
  type ConvertWordOptions,
  type WordFileResult,
} from "@/lib/pdf-word-api";
import { cn } from "@/lib/utils";
import { FileDropzone } from "@/pages/pdf/components/file-dropzone";
import {
  PdfBatchActionBar,
  PdfFileItem,
  type FileItemState,
} from "@/pages/pdf/components/pdf-file-item";
import { PdfWordPreviewModal } from "@/pages/pdf/pdf-to-word/components/pdf-word-preview-modal";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function PdfToWordPage() {
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

  const [previewResult, setPreviewResult] = useState<WordFileResult | null>(
    null,
  );
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

    const options: ConvertWordOptions = {
      engine: "auto",
      ocr: true,
      ocr_lang: "ind",
    };

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
        const res = await convertPdfToWordViaBackend(
          currentItem.file,
          options,
          (uploadPercent) => {
            const uploadRatio = uploadPercent / 100;
            setProgress({
              currentFileIndex: i + 1,
              totalFiles: newItems.length,
              currentFileName: currentItem.name,
              percent: Math.round(((i + uploadRatio) / newItems.length) * 85),
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
                  wordResult: res,
                }
              : item,
          ),
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Conversion failed";
        setItems((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? {
                  ...item,
                  status: "error",
                  errorMessage: errMsg,
                }
              : item,
          ),
        );
        toast.error(`Failed to convert ${currentItem.name}: ${errMsg}`);
      }
    }

    setIsProcessing(false);
    toast.success("PDF conversion completed!");
  };

  const handleDeleteFile = (fileId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== fileId));
  };

  const handleDownloadFile = (item: FileItemState) => {
    if (item.wordResult) {
      downloadWordFile(item.wordResult);
    }
  };

  const handleDownloadAllZip = async () => {
    const doneResults = items
      .filter((i) => i.status === "done" && i.wordResult)
      .map((i) => i.wordResult!);

    if (doneResults.length === 0) {
      toast.error("No converted files to download yet");
      return;
    }

    try {
      toast.info("Generating ZIP archive...");
      await downloadAllWordAsZip(doneResults, "converted_word_documents.zip");
      toast.success("ZIP download started!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create ZIP package",
      );
    }
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const totalPages = items.reduce(
    (acc, curr) => acc + (curr.wordResult?.total_pages || 0),
    0,
  );

  return (
    <div className={cn("mx-auto", "max-w-5xl", "space-y-6", "p-4", "sm:p-8")}>
      {/* Top Navigation & Title */}
      <div className={cn('flex', 'flex-col', 'sm:flex-row', 'sm:items-center', 'justify-between', 'gap-4')}>
        <Link
          to="/pdf"
          className={cn(
            "inline-flex",
            "items-center",
            "gap-2",
            "rounded-xl",
            "border-2",
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
            "shadow-[2px_2px_0_0_#111827]",
            "dark:shadow-[2px_2px_0_0_#000]",
            "hover:-translate-y-0.5",
            "transition-all",
            "w-fit",
          )}
        >
          <ArrowLeft className={cn('h-4', 'w-4')} /> Back
        </Link>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setItems([])}
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
              "dark:bg-[#20232c]",
              "px-3.5",
              "py-2",
              "text-xs",
              "font-black",
              "text-gray-700",
              "dark:text-gray-300",
              "hover:bg-gray-200",
              "dark:hover:bg-gray-700",
              "transition-all",
              "w-fit",
            )}
          >
            <RotateCcw className={cn('h-3.5', 'w-3.5')} />
            Reset All
          </button>
        )}
      </div>

      {/* Dropzone */}
      <FileDropzone
        ref={fileInputRef}
        title="Upload PDF to Convert to Word"
        description="Drag & drop one or multiple PDF documents here, or click to browse."
        dropzoneSubtitle="Supports scanned documents, reports, manuals, invoices, and eBooks."
        onFilesSelected={handleProcessFiles}
        disabled={isProcessing}
      />

      {/* Processing Progress Status */}
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
          <div className={cn('flex', 'items-center', 'justify-between', 'text-xs', 'sm:text-sm', 'font-black', 'text-gray-900', 'dark:text-white')}>
            <span className={cn('inline-flex', 'items-center', 'gap-2')}>
              <Loader2 className={cn('h-4', 'w-4', 'animate-spin', 'text-blue-500')} />
              <span>
                {progress.phase === "uploading" ? "Uploading" : "Converting"}{" "}
                <span className={cn('text-blue-600', 'dark:text-blue-400')}>
                  {progress.currentFileName}
                </span>{" "}
                ({progress.currentFileIndex}/{progress.totalFiles})...
              </span>
            </span>
            <span>{progress.percent}%</span>
          </div>

          <div className={cn('h-3.5', 'overflow-hidden', 'rounded-full', 'border-2', 'border-gray-900', 'dark:border-gray-700', 'bg-gray-100', 'dark:bg-gray-800')}>
            <div
              className={cn('h-full', 'bg-linear-to-r', 'from-blue-400', 'to-indigo-500', 'transition-all', 'duration-300')}
              style={{ width: `${Math.max(5, progress.percent)}%` }}
            />
          </div>
        </div>
      )}

      {/* File Items List */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className={cn('flex', 'items-center', 'justify-between', 'px-1')}>
            <h2 className={cn('text-sm', 'font-black', 'text-gray-900', 'dark:text-white', 'uppercase', 'tracking-wider')}>
              Document Queue ({doneCount}/{items.length} Ready)
            </h2>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <PdfFileItem
                key={item.id}
                item={item}
                index={index}
                formatName="docx"
                onDeleteFile={handleDeleteFile}
                onDownloadFile={handleDownloadFile}
                onPreviewWord={(wordRes) => setPreviewResult(wordRes)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Batch Action Bar */}
      <PdfBatchActionBar
        totalFiles={items.length}
        totalPages={totalPages}
        formatName="docx"
        onAddFiles={() => fileInputRef.current?.click()}
        onDownloadAllZip={handleDownloadAllZip}
      />

      {/* Interactive Word Document Preview Modal */}
      <PdfWordPreviewModal
        result={previewResult}
        onClose={() => setPreviewResult(null)}
      />
    </div>
  );
}
