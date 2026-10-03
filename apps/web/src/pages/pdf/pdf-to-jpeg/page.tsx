import {
  convertPdfToJpg,
  convertPdfViaBackend,
  createZipFromConvertedPages,
  type ConvertedPage,
  type ConvertedPdfResult,
} from "@/lib/pdf-renderer";
import { cn } from "@/lib/utils";
import { FileDropzone } from "@/pages/pdf/components/file-dropzone";
import { PdfEditorModal } from "@/pages/pdf/components/pdf-editor-modal";
import { PdfFileItem, PdfBatchActionBar } from "@/pages/pdf/components/pdf-file-item";
import { PdfPreviewModal } from "@/pages/pdf/components/pdf-preview-modal";
import {
  ArrowLeft,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const OPTIMAL_DPI = 150;
const OPTIMAL_QUALITY = 0.82;
const OPTIMAL_ANNOTATIONS = true;
const LARGE_FILE_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50MB (Hybrid threshold)

interface FileItemState {
  file: File;
  id: string;
  name: string;
  size: number;
  status: "pending" | "converting" | "done" | "error";
  engine?: "client" | "server";
  result?: ConvertedPdfResult;
  isExpanded?: boolean;
}

export default function PdfToJpegPage() {
  const [items, setItems] = useState<FileItemState[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{
    currentFileIndex: number;
    totalFiles: number;
    currentPage: number;
    totalPages: number;
    currentFileName: string;
    percent: number;
  }>({
    currentFileIndex: 0,
    totalFiles: 0,
    currentPage: 0,
    totalPages: 0,
    currentFileName: "",
    percent: 0,
  });

  const [previewImage, setPreviewImage] = useState<ConvertedPage | null>(null);
  const [editingPage, setEditingPage] = useState<{
    fileId: string;
    page: ConvertedPage;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveEditedPage = (updatedPage: ConvertedPage) => {
    if (!editingPage) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== editingPage.fileId || !item.result) return item;
        const updatedPages = item.result.pages.map((p) =>
          p.pageNumber === updatedPage.pageNumber ? updatedPage : p,
        );
        return {
          ...item,
          result: {
            ...item.result,
            pages: updatedPages,
          },
        };
      }),
    );
    if (previewImage && previewImage.pageNumber === updatedPage.pageNumber) {
      setPreviewImage(updatedPage);
    }
    toast.success(`Page #${updatedPage.pageNumber} updated with edits!`);
  };

  const handleDeletePage = (pageToDelete: ConvertedPage) => {
    setItems((prev) =>
      prev.map((item) => {
        if (!item.result) return item;
        const remainingPages = item.result.pages.filter(
          (p) => p.fileName !== pageToDelete.fileName,
        );
        if (remainingPages.length === item.result.pages.length) return item;
        return {
          ...item,
          result: {
            ...item.result,
            pages: remainingPages,
            totalPages: remainingPages.length,
          },
        };
      }),
    );
    if (previewImage && previewImage.fileName === pageToDelete.fileName) {
      setPreviewImage(null);
    }
    toast.success(`Halaman #${pageToDelete.pageNumber} berhasil dihapus`);
  };

  const handleDeleteFile = (fileId: string) => {
    setItems((prev) => {
      const itemToDelete = prev.find((item) => item.id === fileId);
      if (itemToDelete?.result) {
        itemToDelete.result.pages.forEach((p) => {
          URL.revokeObjectURL(p.previewUrl);
          if (previewImage && previewImage.fileName === p.fileName) {
            setPreviewImage(null);
          }
        });
      }
      return prev.filter((item) => item.id !== fileId);
    });
    if (editingPage && editingPage.fileId === fileId) {
      setEditingPage(null);
    }
    toast.success("File berhasil dihapus");
  };

  const handleProcessFiles = async (rawFiles: File[]) => {
    setIsProcessing(true);

    const newItems: FileItemState[] = rawFiles.map((file, idx) => ({
      file,
      id: `${file.name}-${file.lastModified}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: file.size,
      status: "converting",
    }));

    setItems((prev) => [...prev, ...newItems]);

    for (let i = 0; i < newItems.length; i++) {
      const currentItem = newItems[i];
      const isLargeFile = currentItem.size >= LARGE_FILE_THRESHOLD_BYTES;

      setProgress({
        currentFileIndex: i + 1,
        totalFiles: newItems.length,
        currentPage: 0,
        totalPages: 1,
        currentFileName: isLargeFile
          ? `${currentItem.name} (Using Server Engine...)`
          : currentItem.name,
        percent: Math.round((i / newItems.length) * 100),
      });

      try {
        let res: ConvertedPdfResult;

        if (isLargeFile) {
          res = await convertPdfViaBackend(
            currentItem.file,
            {
              dpi: OPTIMAL_DPI,
              quality: OPTIMAL_QUALITY,
              format: "jpeg",
            },
            (uploadPercent) => {
              const ratio = (i + uploadPercent / 100) / newItems.length;
              setProgress({
                currentFileIndex: i + 1,
                totalFiles: newItems.length,
                currentPage: 1,
                totalPages: 1,
                currentFileName: `${currentItem.name} (Uploading & processing on server...)`,
                percent: Math.min(99, Math.round(ratio * 100)),
              });
            },
          );
        } else {
          res = await convertPdfToJpg(
            currentItem.file,
            {
              dpi: OPTIMAL_DPI,
              quality: OPTIMAL_QUALITY,
              backgroundColor: "#FFFFFF",
              renderInteractiveForms: OPTIMAL_ANNOTATIONS,
              format: "jpeg",
            },
            (current, total) => {
              const ratio = (i + current / (total || 1)) / newItems.length;
              setProgress({
                currentFileIndex: i + 1,
                totalFiles: newItems.length,
                currentPage: current,
                totalPages: total,
                currentFileName: currentItem.name,
                percent: Math.min(99, Math.round(ratio * 100)),
              });
            },
          );
        }

        setItems((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? {
                  ...item,
                  status: "done",
                  engine: isLargeFile ? "server" : "client",
                  result: res,
                  isExpanded: res.pages.length > 1,
                }
              : item,
          ),
        );
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to convert PDF to JPEG";
        toast.error(`Error on ${currentItem.name}: ${errorMsg}`);
        setItems((prev) =>
          prev.map((item) =>
            item.id === currentItem.id ? { ...item, status: "error" } : item,
          ),
        );
      }
    }

    setProgress((prev) => ({ ...prev, percent: 100 }));
    setIsProcessing(false);
    toast.success("PDF to JPEG conversion finished!");
  };

  const handleAddFiles = (filesList: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        validFiles.push(file);
      } else {
        toast.error(`"${file.name}" is not a valid PDF file`);
      }
    }

    if (validFiles.length > 0) {
      handleProcessFiles(validFiles);
    }
  };

  const handleDownloadSingle = (page: ConvertedPage) => {
    const link = document.createElement("a");
    link.href = page.previewUrl;
    link.download = page.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFile = async (item: FileItemState) => {
    if (!item.result || item.result.pages.length === 0) return;

    if (item.result.pages.length === 1) {
      handleDownloadSingle(item.result.pages[0]);
      return;
    }

    const toastId = toast.loading(`Generating ZIP for ${item.name}...`);
    try {
      const zipBlob = await createZipFromConvertedPages([item.result]);
      const link = document.createElement("a");
      const baseName = item.name.replace(/\.[^/.]+$/, "");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${baseName}_jpeg_images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
      toast.success("ZIP downloaded successfully!");
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to generate ZIP");
    }
  };

  const handleDownloadAllZip = async () => {
    const completedResults = items
      .filter((item) => item.status === "done" && item.result)
      .map((item) => item.result!);

    if (completedResults.length === 0) {
      toast.error("No converted JPEG files ready to download");
      return;
    }

    const toastId = toast.loading("Packaging all JPEG images into ZIP...");
    try {
      const zipBlob = await createZipFromConvertedPages(completedResults);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `pdf_to_jpeg_converted_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
      toast.success("All JPEG files downloaded as ZIP!");
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to generate ZIP archive");
    }
  };

  const handleResetAll = () => {
    items.forEach((item) => {
      item.result?.pages.forEach((p) => {
        URL.revokeObjectURL(p.previewUrl);
      });
    });
    setItems([]);
    setProgress({
      currentFileIndex: 0,
      totalFiles: 0,
      currentPage: 0,
      totalPages: 0,
      currentFileName: "",
      percent: 0,
    });
    toast.info("Cleared all files");
  };

  const toggleExpand = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item,
      ),
    );
  };

  const totalPagesConverted = items.reduce(
    (acc, curr) => acc + (curr.result?.pages.length || 0),
    0,
  );

  return (
    <div className={cn("mx-auto", "max-w-5xl", "space-y-6", "py-4")}>
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
          <ArrowLeft className={cn("h-4", "w-4", "stroke-[3]")} />
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
        title="PDF to JPEG Converter"
        description="Convert PDF pages into crisp high-quality JPEG images instantly."
        dropzoneSubtitle="Converts automatically to JPEG upon selection."
        onFilesSelected={handleAddFiles}
        disabled={isProcessing}
      />

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
              <RefreshCw
                className={cn("h-4", "w-4", "animate-spin", "text-amber-500")}
              />
              Converting {progress.currentFileIndex}/{progress.totalFiles}:{" "}
              <span className={cn("truncate", "max-w-xs")}>
                {progress.currentFileName}
              </span>
            </span>
            <span
              className={cn(
                "text-amber-600",
                "dark:text-amber-400",
                "font-extrabold",
                "text-sm",
              )}
            >
              {progress.percent}%
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
                "from-amber-400",
                "to-emerald-400",
                "transition-all",
                "duration-150",
              )}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <PdfFileItem
              key={item.id}
              item={item}
              index={index}
              formatName="JPEG"
              largeFileThresholdBytes={LARGE_FILE_THRESHOLD_BYTES}
              onToggleExpand={toggleExpand}
              onEditPage={(fileId, page) =>
                setEditingPage({
                  fileId,
                  page,
                })
              }
              onDeleteFile={handleDeleteFile}
              onDeletePage={handleDeletePage}
              onDownloadFile={handleDownloadFile}
              onDownloadSinglePage={handleDownloadSingle}
              onPreviewPage={setPreviewImage}
            />
          ))}
        </div>
      )}

      {/* Bottom Action Bar */}
      <PdfBatchActionBar
        totalFiles={items.length}
        totalPages={totalPagesConverted}
        formatName="JPEG"
        onAddFiles={() => fileInputRef.current?.click()}
        onDownloadAllZip={handleDownloadAllZip}
      />

      {/* Lightbox Preview Modal */}
      <PdfPreviewModal
        isOpen={!!previewImage}
        page={previewImage}
        formatName="JPEG"
        onClose={() => setPreviewImage(null)}
        onDownload={handleDownloadSingle}
      />

      <PdfEditorModal
        isOpen={!!editingPage}
        page={editingPage?.page || null}
        onClose={() => setEditingPage(null)}
        onSave={handleSaveEditedPage}
        formatName="JPEG"
        mimeType="image/jpeg"
      />
    </div>
  );
}
