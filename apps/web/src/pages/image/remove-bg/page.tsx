import {
  ArrowLeft,
  Download,
  Paintbrush,
  RefreshCw,
  RotateCcw,
  Scissors,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  removeBackgroundViaBackend,
  type RemoveBgResult,
} from "@/lib/image-convert-api";
import { cn } from "@/lib/utils";
import { ImageDropzone } from "@/pages/image/components/image-dropzone";
import { ImageProcessingCard } from "@/pages/image/components/image-processing-card";
import { BackgroundEditor } from "@/pages/image/remove-bg/background-editor";

type RemoveBgStatus = "pending" | "processing" | "done" | "error";

interface RemoveBgItem {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  progress: number;
  status: RemoveBgStatus;
  result?: RemoveBgResult;
  errorMessage?: string;
}

export default function RemoveBgPage() {
  const [items, setItems] = useState<RemoveBgItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const itemsRef = useRef<RemoveBgItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
        if (item.result?.file_url) URL.revokeObjectURL(item.result.file_url);
      });
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const base = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
    return `${parseFloat((bytes / Math.pow(base, unitIndex)).toFixed(1))} ${sizes[unitIndex]}`;
  };

  const processItems = async (targetItems: RemoveBgItem[]) => {
    if (targetItems.length === 0) return;
    setIsProcessing(true);
    let successCount = 0;

    for (const target of targetItems) {
      setItems((current) =>
        current.map((item) =>
          item.id === target.id
            ? {
                ...item,
                status: "processing",
                progress: 12,
                errorMessage: undefined,
              }
            : item,
        ),
      );

      try {
        const result = await removeBackgroundViaBackend(
          target.file,
          {
            output_format: "png",
          },
          (percentage) => {
            const progress = Math.min(
              Math.max(Math.round(percentage * 0.45), 12),
              45,
            );
            setItems((current) =>
              current.map((item) =>
                item.id === target.id
                  ? { ...item, progress: Math.max(item.progress, progress) }
                  : item,
              ),
            );
          },
        );

        setItems((current) =>
          current.map((item) =>
            item.id === target.id
              ? { ...item, status: "done", progress: 100, result }
              : item,
          ),
        );
        successCount++;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to remove the background";
        setItems((current) =>
          current.map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  status: "error",
                  progress: 0,
                  errorMessage: message,
                }
              : item,
          ),
        );
      }
    }

    setIsProcessing(false);
    if (successCount > 0) {
      toast.success(
        `${successCount} image${successCount > 1 ? "s are" : " is"} transparent and ready to edit.`,
      );
    }
  };

  const handleFilesSelected = (files: File[]) => {
    const validFiles = files.filter((file) =>
      /\.(jpe?g|png|webp)$/i.test(file.name),
    );
    if (validFiles.length === 0) {
      toast.error("Please select valid JPG, PNG, or WebP images.");
      return;
    }

    const timestamp = Date.now();
    const newItems: RemoveBgItem[] = validFiles.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${timestamp}-${index}`,
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: "pending",
    }));

    setItems((current) => [...current, ...newItems]);
    toast.info(
      `Processing ${newItems.length} image${newItems.length > 1 ? "s" : ""} with BiRefNet...`,
    );
    void processItems(newItems);
  };

  const handleDelete = (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
      if (item.result?.file_url) URL.revokeObjectURL(item.result.file_url);
    }
    setItems((current) => current.filter((entry) => entry.id !== id));
  };

  const handleReset = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.result?.file_url) URL.revokeObjectURL(item.result.file_url);
    });
    setItems([]);
    setEditingId(null);
  };

  const handleDownload = (item: RemoveBgItem) => {
    if (!item.result) return;
    const link = document.createElement("a");
    link.href = item.result.file_url;
    link.download = item.result.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveEdit = (item: RemoveBgItem, blob: Blob) => {
    if (!item.result) return;
    const editedUrl = URL.createObjectURL(blob);
    const previousUrl = item.result.file_url;
    const editedName = item.result.file_name.replace(/\.png$/i, "_edited.png");

    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id && entry.result
          ? {
              ...entry,
              result: {
                ...entry.result,
                file_name: editedName,
                file_url: editedUrl,
                result_size: blob.size,
              },
            }
          : entry,
      ),
    );
    URL.revokeObjectURL(previousUrl);
    setEditingId(null);
    toast.success("Remove/Restore edits saved successfully.");
  };

  const editingItem = items.find(
    (item) => item.id === editingId && item.result,
  );

  return (
    <div className={cn("mx-auto", "max-w-5xl", "space-y-6", "py-4", "pb-24")}>
      <div className={cn("flex", "items-center", "justify-between", "gap-3")}>
        <Link
          to="/image"
          className={cn(
            "inline-flex",
            "items-center",
            "gap-2",
            "rounded-xl",
            "border-3",
            "border-gray-900",
            "bg-white",
            "px-4",
            "py-2",
            "text-xs",
            "font-black",
            "shadow-[3px_3px_0_0_#111827]",
            "transition-all",
            "hover:-translate-y-0.5",
            "dark:border-gray-700",
            "dark:bg-[#16181d]",
            "dark:shadow-[3px_3px_0_0_#000]",
          )}
        >
          <ArrowLeft className={cn("h-4", "w-4")} />
          Back
        </Link>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isProcessing}
            className={cn(
              "inline-flex",
              "items-center",
              "gap-2",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "bg-gray-100",
              "px-3",
              "py-2",
              "text-xs",
              "font-black",
              "transition-colors",
              "hover:bg-gray-200",
              "disabled:cursor-not-allowed",
              "disabled:opacity-50",
              "dark:border-gray-700",
              "dark:bg-gray-800",
            )}
          >
            <RefreshCw className={cn("h-4", "w-4")} />
            Clear All
          </button>
        )}
      </div>

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
            "bg-purple-400",
            "shadow-[4px_4px_0_0_#111827]",
          )}
        >
          <Scissors className={cn("h-8", "w-8", "text-gray-900")} />
        </div>
        <h1
          className={cn(
            "text-4xl",
            "font-black",
            "tracking-tight",
            "text-gray-900",
            "dark:text-white",
            "md:text-5xl",
          )}
        >
          Remove Background AI
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
          Upload images, remove backgrounds automatically, then refine each
          result with Remove and Restore brushes.
        </p>
      </div>

      <ImageDropzone
        dropzoneTitle="Click or Drag & Drop images here"
        dropzoneSubtitle="Supports multiple JPG, PNG, and WebP files (Max 50MB each)"
        multiple={true}
        disabled={isProcessing}
        onFilesSelected={handleFilesSelected}
      />

      {items.length > 0 && (
        <div className={cn("space-y-3")}>
            {items.map((item, index) => (
              <ImageProcessingCard
                key={item.id}
                index={index}
                thumbnailUrl={item.result?.file_url ?? item.previewUrl}
                fileName={item.result?.file_name ?? item.name}
                metadata={
                  item.result
                    ? `${item.result.result_width} × ${item.result.result_height}px • ${formatFileSize(item.result.result_size)}`
                    : formatFileSize(item.file.size)
                }
                status={item.status}
                progress={item.progress}
                processingLabel="Removing BG..."
                progressLabel="AI is separating the foreground"
                errorMessage={item.errorMessage}
                onRemove={() => handleDelete(item.id)}
                removeDisabled={isProcessing}
                actions={
                  <>
                    {item.status === "error" && (
                      <button
                        type="button"
                        onClick={() => void processItems([item])}
                        disabled={isProcessing}
                        className={cn(
                          "inline-flex",
                          "items-center",
                          "gap-2",
                          "rounded-xl",
                          "border-2",
                          "border-gray-900",
                          "bg-yellow-300",
                          "px-3",
                          "py-2",
                          "text-xs",
                          "font-black",
                          "hover:-translate-y-0.5",
                          "disabled:opacity-50",
                        )}
                      >
                        <RotateCcw className={cn("h-4", "w-4")} />
                        Try Again
                      </button>
                    )}

                    {item.status === "done" && item.result && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(item.id)}
                          className={cn(
                            "inline-flex",
                            "items-center",
                            "gap-2",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "bg-purple-300",
                            "px-3",
                            "py-2",
                            "text-xs",
                            "font-black",
                            "shadow-[2px_2px_0_0_#111827]",
                            "transition-transform",
                            "hover:-translate-y-0.5",
                            "cursor-pointer",
                          )}
                        >
                          <Paintbrush className={cn("h-4", "w-4")} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          className={cn(
                            "inline-flex",
                            "items-center",
                            "gap-2",
                            "rounded-xl",
                            "border-2",
                            "border-gray-900",
                            "bg-emerald-400",
                            "px-3",
                            "py-2",
                            "text-xs",
                            "font-black",
                            "shadow-[2px_2px_0_0_#111827]",
                            "transition-transform",
                            "hover:-translate-y-0.5",
                            "cursor-pointer",
                          )}
                        >
                          <Download className={cn("h-4", "w-4")} />
                          Download
                        </button>
                      </>
                    )}
                  </>
                }
              />
            ))}
        </div>
      )}

      {editingItem?.result && (
        <BackgroundEditor
          fileName={editingItem.result.file_name}
          originalUrl={editingItem.previewUrl}
          resultUrl={editingItem.result.file_url}
          onClose={() => setEditingId(null)}
          onSave={(blob) => handleSaveEdit(editingItem, blob)}
        />
      )}
    </div>
  );
}
