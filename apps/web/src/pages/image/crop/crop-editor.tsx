import { Check, X } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { cn } from "@/lib/utils";

export interface CropResult {
  blob: Blob;
  width: number;
  height: number;
  extension: string;
}

interface CropEditorProps {
  imageUrl: string;
  mimeType: string;
  onClose: () => void;
  onSave: (result: CropResult) => void;
}

interface CropBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

type DragMode = "move" | "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r";

interface DragState {
  mode: DragMode;
  pointerId: number;
  startX: number;
  startY: number;
  startCrop: CropBox;
}

const minimumCropSize = 5;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function createCroppedImage(
  imageUrl: string,
  mimeType: string,
  crop: CropBox,
): Promise<CropResult> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const sourceX = Math.round((crop.left / 100) * image.naturalWidth);
      const sourceY = Math.round((crop.top / 100) * image.naturalHeight);
      const sourceWidth = Math.max(1, Math.round((crop.width / 100) * image.naturalWidth));
      const sourceHeight = Math.max(1, Math.round((crop.height / 100) * image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Crop canvas is unavailable."));
        return;
      }
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight,
      );
      const outputMime = ["image/jpeg", "image/png", "image/webp"].includes(mimeType)
        ? mimeType
        : "image/png";
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create the cropped image."));
            return;
          }
          resolve({
            blob,
            width: sourceWidth,
            height: sourceHeight,
            extension: outputMime === "image/jpeg" ? "jpg" : outputMime.split("/")[1],
          });
        },
        outputMime,
        0.92,
      );
    };
    image.onerror = () => reject(new Error("Failed to load the source image."));
    image.src = imageUrl;
  });
}

export function CropEditor({ imageUrl, mimeType, onClose, onSave }: CropEditorProps) {
  const [crop, setCrop] = useState<CropBox>({
    left: 5,
    top: 5,
    width: 90,
    height: 90,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const startDrag = (
    event: ReactPointerEvent<HTMLElement>,
    mode: DragMode,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const surface = surfaceRef.current;
    if (!surface) return;
    surface.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: crop,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const surface = surfaceRef.current;
    if (!drag || !surface || drag.pointerId !== event.pointerId) return;

    const bounds = surface.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.startX) / bounds.width) * 100;
    const deltaY = ((event.clientY - drag.startY) / bounds.height) * 100;
    const start = drag.startCrop;
    if (drag.mode === "move") {
      setCrop({
        ...start,
        left: clamp(start.left + deltaX, 0, 100 - start.width),
        top: clamp(start.top + deltaY, 0, 100 - start.height),
      });
      return;
    }

    let left = start.left;
    let top = start.top;
    let width = start.width;
    let height = start.height;

    if (drag.mode.includes("l")) {
      const proposedLeft = clamp(
        start.left + deltaX,
        0,
        start.left + start.width - minimumCropSize,
      );
      width = start.width + (start.left - proposedLeft);
      left = proposedLeft;
    }
    if (drag.mode.includes("r")) {
      width = clamp(start.width + deltaX, minimumCropSize, 100 - start.left);
    }
    if (drag.mode.includes("t")) {
      const proposedTop = clamp(
        start.top + deltaY,
        0,
        start.top + start.height - minimumCropSize,
      );
      height = start.height + (start.top - proposedTop);
      top = proposedTop;
    }
    if (drag.mode.includes("b")) {
      height = clamp(start.height + deltaY, minimumCropSize, 100 - start.top);
    }

    setCrop({ left, top, width, height });
  };

  const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const handleApply = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const result = await createCroppedImage(imageUrl, mimeType, crop);
      onSave(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to crop image.");
    } finally {
      setIsSaving(false);
    }
  };

  const handles: Array<{
    mode: DragMode;
    position: string;
    size: string;
    cursor: string;
  }> = [
    { mode: "tl", position: "-left-1.5 -top-1.5", size: "h-3.5 w-3.5", cursor: "nwse-resize" },
    { mode: "tr", position: "-right-1.5 -top-1.5", size: "h-3.5 w-3.5", cursor: "nesw-resize" },
    { mode: "bl", position: "-bottom-1.5 -left-1.5", size: "h-3.5 w-3.5", cursor: "nesw-resize" },
    { mode: "br", position: "-bottom-1.5 -right-1.5", size: "h-3.5 w-3.5", cursor: "nwse-resize" },
    { mode: "t", position: "-top-1.5 left-1/2 -translate-x-1/2", size: "h-3 w-5", cursor: "ns-resize" },
    { mode: "b", position: "-bottom-1.5 left-1/2 -translate-x-1/2", size: "h-3 w-5", cursor: "ns-resize" },
    { mode: "l", position: "top-1/2 -left-1.5 -translate-y-1/2", size: "h-5 w-3", cursor: "ew-resize" },
    { mode: "r", position: "top-1/2 -right-1.5 -translate-y-1/2", size: "h-5 w-3", cursor: "ew-resize" },
  ];

  return (
    <div className={cn("fixed", "inset-0", "z-60", "flex", "items-center", "justify-center", "overflow-hidden", "bg-black/75", "p-3", "backdrop-blur-sm")}>
      <section className={cn("w-full", "max-w-xl", "space-y-3", "overflow-hidden", "rounded-2xl", "border-3", "border-gray-900", "bg-[#fdfbf7]", "p-3", "shadow-[4px_4px_0_0_#111827]", "sm:p-4")}>
        <div className={cn("flex", "items-center", "justify-between", "gap-3")}>
          <div>
            <h2 className={cn("text-xl", "font-black", "text-gray-900")}>Crop Image</h2>
            <p className={cn("text-xs", "font-semibold", "text-gray-500")}>Drag the crop area to move it. Drag a yellow corner to resize it.</p>
          </div>
          <button type="button" onClick={onClose} className={cn("flex", "h-10", "w-10", "items-center", "justify-center", "rounded-xl", "border-2", "border-gray-900", "bg-white", "hover:bg-gray-100")}>
            <X className={cn("h-5", "w-5")} />
          </button>
        </div>

        <div className={cn("relative", "flex", "items-center", "justify-center", "overflow-hidden", "rounded-xl", "border-3", "border-gray-900", "bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#fff_0%_50%)]", "bg-[length:18px_18px]", "p-1.5")}>
          <div
            ref={surfaceRef}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            className={cn("relative", "max-w-full", "touch-none", "select-none")}
            style={{ maxHeight: "240px" }}
          >
            <img
              src={imageUrl}
              alt="Crop preview"
              draggable={false}
              className={cn("pointer-events-none", "block", "h-auto", "w-auto", "max-w-full", "select-none", "object-contain")}
              style={{ maxHeight: "240px" }}
            />
            <div
              onPointerDown={(event) => startDrag(event, "move")}
              className={cn("absolute", "cursor-move", "border-2", "border-dashed", "border-yellow-400", "shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]")}
              style={{ left: `${crop.left}%`, top: `${crop.top}%`, width: `${crop.width}%`, height: `${crop.height}%` }}
            >
              <div className={cn("pointer-events-none", "absolute", "inset-0", "grid", "grid-cols-3", "grid-rows-3")}>
                <div className={cn("border-r", "border-b", "border-white/40")} />
                <div className={cn("border-r", "border-b", "border-white/40")} />
                <div className={cn("border-b", "border-white/40")} />
                <div className={cn("border-r", "border-b", "border-white/40")} />
                <div className={cn("border-r", "border-b", "border-white/40")} />
                <div className={cn("border-b", "border-white/40")} />
                <div className={cn("border-r", "border-white/40")} />
                <div className={cn("border-r", "border-white/40")} />
                <div />
              </div>
              {handles.map((handle) => (
                <button
                  key={handle.mode}
                  type="button"
                  aria-label={`Resize crop from ${handle.mode}`}
                  onPointerDown={(event) => startDrag(event, handle.mode)}
                  className={cn("absolute", "rounded-xs", "border-2", "border-gray-900", "bg-yellow-400", "shadow-xs", handle.position, handle.size)}
                  style={{ cursor: handle.cursor }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={cn("flex", "flex-col", "gap-3", "sm:flex-row", "sm:items-center", "sm:justify-between")}>
          <div>
            <p className={cn("text-xs", "font-black", "text-gray-700")}>Crop area: {Math.round(crop.width)}% × {Math.round(crop.height)}%</p>
            {errorMessage && <p className={cn("mt-1", "text-xs", "font-bold", "text-rose-600")}>{errorMessage}</p>}
          </div>
          <div className={cn("flex", "items-center", "gap-2")}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={cn("inline-flex", "items-center", "justify-center", "rounded-xl", "border-2", "border-gray-900", "bg-yellow-400", "px-4", "py-2.5", "text-xs", "font-black", "text-gray-900", "shadow-[2px_2px_0_0_#111827]", "transition-all", "hover:bg-yellow-500", "disabled:opacity-50")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={isSaving}
              className={cn("inline-flex", "items-center", "justify-center", "gap-1.5", "rounded-xl", "border-2", "border-gray-900", "bg-emerald-400", "px-4", "py-2.5", "text-xs", "font-black", "text-gray-900", "shadow-[2px_2px_0_0_#111827]", "transition-all", "hover:bg-emerald-500", "disabled:opacity-50")}
            >
              <Check className={cn("h-3.5", "w-3.5", "stroke-3")} />
              {isSaving ? "Applying..." : "Apply Crop"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
