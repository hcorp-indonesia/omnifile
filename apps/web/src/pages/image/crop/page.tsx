import { ArrowLeft, Crop, Download, Pencil, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ImageDropzone } from "@/pages/image/components/image-dropzone";
import { ImageProcessingCard } from "@/pages/image/components/image-processing-card";
import { CropEditor, type CropResult } from "@/pages/image/crop/crop-editor";

interface CropItem {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  resultUrl?: string;
  resultName?: string;
  resultSize?: number;
  resultWidth?: number;
  resultHeight?: number;
  errorMessage?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Number((bytes / 1024 ** unitIndex).toFixed(1))} ${units[unitIndex]}`;
}

export default function CropImagePage() {
  const [items, setItems] = useState<CropItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const itemsRef = useRef<CropItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      });
    };
  }, []);

  const handleFilesSelected = (files: File[]) => {
    const validFiles = files.filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file.name));
    if (validFiles.length === 0) {
      toast.error("Please select JPG, PNG, WebP, or AVIF images.");
      return;
    }
    const timestamp = Date.now();
    setItems((current) => [
      ...current,
      ...validFiles.map<CropItem>((file, index) => ({
        id: `${file.name}-${file.lastModified}-${timestamp}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
        progress: 0,
      })),
    ]);
  };

  const saveCrop = (item: CropItem, result: CropResult) => {
    if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    const resultUrl = URL.createObjectURL(result.blob);
    const baseName = item.file.name.replace(/\.[^.]+$/, "") || "image";
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status: "done",
              progress: 100,
              resultUrl,
              resultName: `${baseName}_cropped.${result.extension}`,
              resultSize: result.blob.size,
              resultWidth: result.width,
              resultHeight: result.height,
              errorMessage: undefined,
            }
          : entry,
      ),
    );
    setEditingId(null);
    toast.success("Crop applied successfully.");
  };

  const removeItem = (id: string) => {
    const target = items.find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
    }
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const clearItems = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    });
    setItems([]);
    setEditingId(null);
  };

  const downloadItem = (item: CropItem) => {
    if (!item.resultUrl || !item.resultName) return;
    const link = document.createElement("a");
    link.href = item.resultUrl;
    link.download = item.resultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editingItem = items.find((item) => item.id === editingId);
  return (
    <div className={cn("mx-auto", "max-w-5xl", "space-y-6", "py-4", "pb-24")}>
      <div className={cn("flex", "items-center", "justify-between", "gap-3")}>
        <Link to="/image" className={cn("inline-flex", "items-center", "gap-2", "rounded-xl", "border-3", "border-gray-900", "bg-white", "px-4", "py-2", "text-xs", "font-black", "shadow-[3px_3px_0_0_#111827]", "transition-transform", "hover:-translate-y-0.5")}>
          <ArrowLeft className={cn("h-4", "w-4")} />
          Back
        </Link>
        {items.length > 0 && (
          <button type="button" onClick={clearItems} className={cn("inline-flex", "items-center", "gap-2", "rounded-xl", "border-2", "border-gray-900", "bg-gray-100", "px-3", "py-2", "text-xs", "font-black", "hover:bg-gray-200")}>
            <RefreshCw className={cn("h-4", "w-4")} />
            Clear All
          </button>
        )}
      </div>

      <div className={cn("space-y-3", "text-center")}>
        <div className={cn("mx-auto", "flex", "h-16", "w-16", "items-center", "justify-center", "rounded-2xl", "border-3", "border-gray-900", "bg-teal-300", "shadow-[4px_4px_0_0_#111827]")}>
          <Crop className={cn("h-8", "w-8", "text-gray-900")} />
        </div>
        <h1 className={cn("text-4xl", "font-black", "text-gray-900", "dark:text-white", "md:text-5xl")}>Crop Image</h1>
        <p className={cn("mx-auto", "max-w-2xl", "text-sm", "font-semibold", "text-gray-600", "dark:text-gray-400")}>
          Upload images, choose the crop boundaries, and download each result.
        </p>
      </div>

      <ImageDropzone
        dropzoneTitle="Click or Drag & Drop images here"
        dropzoneSubtitle="Supports multiple JPG, PNG, WebP, and AVIF files"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={true}
        onFilesSelected={handleFilesSelected}
      />

      {items.length > 0 && (
        <div className={cn("space-y-3")}>
            {items.map((item, index) => (
              <ImageProcessingCard
                key={item.id}
                index={index}
                thumbnailUrl={item.resultUrl ?? item.previewUrl}
                fileName={item.resultName ?? item.file.name}
                metadata={item.resultSize ? `${item.resultWidth} × ${item.resultHeight}px • ${formatFileSize(item.resultSize)}` : `${formatFileSize(item.file.size)} • Ready to crop`}
                status={item.status}
                progress={item.progress}
                processingLabel="Cropping..."
                progressLabel="Applying crop boundaries"
                errorMessage={item.errorMessage}
                onRemove={() => removeItem(item.id)}
                actions={
                  <>
                    <button type="button" onClick={() => setEditingId(item.id)} className={cn("inline-flex", "items-center", "gap-2", "rounded-xl", "border-2", "border-gray-900", "bg-teal-300", "px-3", "py-2", "text-xs", "font-black", "shadow-[2px_2px_0_0_#111827]", "transition-transform", "hover:-translate-y-0.5")}>
                      <Pencil className={cn("h-4", "w-4")} />
                      {item.status === "done" ? "Edit Crop" : "Crop"}
                    </button>
                    {item.status === "done" && (
                      <button type="button" onClick={() => downloadItem(item)} className={cn("inline-flex", "items-center", "gap-2", "rounded-xl", "border-2", "border-gray-900", "bg-emerald-400", "px-3", "py-2", "text-xs", "font-black", "shadow-[2px_2px_0_0_#111827]", "transition-transform", "hover:-translate-y-0.5")}>
                        <Download className={cn("h-4", "w-4")} />
                        Download
                      </button>
                    )}
                  </>
                }
              />
            ))}
        </div>
      )}

      {editingItem && (
        <CropEditor
          imageUrl={editingItem.previewUrl}
          mimeType={editingItem.file.type}
          onClose={() => setEditingId(null)}
          onSave={(result) => saveCrop(editingItem, result)}
        />
      )}
    </div>
  );
}
