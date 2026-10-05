import { Eraser, Paintbrush, RotateCcw, Save, X } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

type BrushMode = "remove" | "restore";

interface BackgroundEditorProps {
  fileName: string;
  originalUrl: string;
  resultUrl: string;
  onClose: () => void;
  onSave: (blob: Blob) => void;
}

interface Point {
  x: number;
  y: number;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load the image editor"));
    image.src = source;
  });
}

export function BackgroundEditor({
  fileName,
  originalUrl,
  resultUrl,
  onClose,
  onSave,
}: BackgroundEditorProps) {
  const [mode, setMode] = useState<BrushMode>("restore");
  const [brushSize, setBrushSize] = useState<number>(80);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const resultImageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<Point | null>(null);

  const drawInitialResult = () => {
    const canvas = canvasRef.current;
    const resultImage = resultImageRef.current;
    if (!canvas || !resultImage) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(resultImage, 0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    let cancelled = false;

    void Promise.all([loadImage(originalUrl), loadImage(resultUrl)])
      .then(([originalImage, resultImage]) => {
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = resultImage.naturalWidth;
        canvas.height = resultImage.naturalHeight;

        const originalCanvas = document.createElement("canvas");
        originalCanvas.width = canvas.width;
        originalCanvas.height = canvas.height;
        originalCanvas
          .getContext("2d")
          ?.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

        originalCanvasRef.current = originalCanvas;
        resultImageRef.current = resultImage;
        drawInitialResult();
        setIsReady(true);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to open the editor",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [originalUrl, resultUrl]);

  const getCanvasPoint = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): Point => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  };

  const paint = (from: Point, to: Point) => {
    const canvas = canvasRef.current;
    const originalCanvas = originalCanvasRef.current;
    if (!canvas || !originalCanvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushSize;

    if (mode === "remove") {
      context.globalCompositeOperation = "destination-out";
      context.strokeStyle = "#000000";
      context.fillStyle = "#000000";
    } else {
      const pattern = context.createPattern(originalCanvas, "no-repeat");
      if (!pattern) {
        context.restore();
        return;
      }
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = pattern;
      context.fillStyle = pattern;
    }

    if (from.x === to.x && from.y === to.y) {
      context.beginPath();
      context.arc(to.x, to.y, brushSize / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
    context.restore();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isReady) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    isDrawingRef.current = true;
    lastPointRef.current = point;
    paint(point, point);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const point = getCanvasPoint(event);
    paint(lastPointRef.current, point);
    lastPointRef.current = point;
  };

  const stopDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    setIsSaving(false);
    if (!blob) {
      toast.error("Failed to save the edited image");
      return;
    }
    onSave(blob);
  };

  return (
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
        "backdrop-blur-sm",
      )}
    >
      <div
        className={cn(
          "flex",
          "max-h-[94vh]",
          "w-full",
          "max-w-6xl",
          "flex-col",
          "overflow-hidden",
          "rounded-3xl",
          "border-3",
          "border-gray-900",
          "bg-[#fdfbf7]",
          "shadow-[8px_8px_0_0_#111827]",
          "dark:bg-[#16181d]",
        )}
      >
        <div
          className={cn(
            "flex",
            "items-center",
            "justify-between",
            "gap-4",
            "border-b-3",
            "border-gray-900",
            "bg-purple-300",
            "p-4",
          )}
        >
          <div className={cn("min-w-0")}>
            <h2 className={cn("text-lg", "font-black", "text-gray-900")}>
              Refine Background Areas
            </h2>
            <p
              className={cn(
                "truncate",
                "text-xs",
                "font-bold",
                "text-gray-700",
              )}
            >
              {fileName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex",
              "h-10",
              "w-10",
              "items-center",
              "justify-center",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "bg-white",
              "shadow-[2px_2px_0_0_#111827]",
              "transition-transform",
              "hover:-translate-y-0.5",
              "cursor-pointer",
            )}
            aria-label="Close editor"
          >
            <X className={cn("h-5", "w-5")} />
          </button>
        </div>

        <div
          className={cn(
            "flex",
            "flex-wrap",
            "items-center",
            "gap-3",
            "border-b-2",
            "border-gray-900",
            "bg-white",
            "p-4",
            "dark:bg-[#1e222a]",
          )}
        >
          <button
            type="button"
            onClick={() => setMode("restore")}
            className={cn(
              "inline-flex",
              "items-center",
              "gap-2",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "px-4",
              "py-2",
              "text-xs",
              "font-black",
              "transition-all",
              "cursor-pointer",
              mode === "restore"
                ? "-translate-y-0.5 bg-emerald-400 shadow-[3px_3px_0_0_#111827]"
                : "bg-white hover:bg-emerald-50 dark:bg-gray-800",
            )}
          >
            <Paintbrush className={cn("h-4", "w-4")} />
            Restore
          </button>
          <button
            type="button"
            onClick={() => setMode("remove")}
            className={cn(
              "inline-flex",
              "items-center",
              "gap-2",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "px-4",
              "py-2",
              "text-xs",
              "font-black",
              "transition-all",
              "cursor-pointer",
              mode === "remove"
                ? "-translate-y-0.5 bg-rose-400 shadow-[3px_3px_0_0_#111827]"
                : "bg-white hover:bg-rose-50 dark:bg-gray-800",
            )}
          >
            <Eraser className={cn("h-4", "w-4")} />
            Remove
          </button>
          <label
            className={cn(
              "flex",
              "min-w-52",
              "flex-1",
              "items-center",
              "gap-3",
              "text-xs",
              "font-black",
              "text-gray-700",
              "dark:text-gray-200",
            )}
          >
            Brush {brushSize}px
            <input
              type="range"
              min="10"
              max="240"
              step="5"
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
              className={cn("min-w-28", "flex-1", "accent-purple-600")}
            />
          </label>
          <button
            type="button"
            onClick={drawInitialResult}
            disabled={!isReady}
            className={cn(
              "inline-flex",
              "items-center",
              "gap-2",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "bg-yellow-300",
              "px-4",
              "py-2",
              "text-xs",
              "font-black",
              "hover:-translate-y-0.5",
              "disabled:opacity-50",
              "cursor-pointer",
            )}
          >
            <RotateCcw className={cn("h-4", "w-4")} />
            Reset
          </button>
        </div>

        <div
          className={cn(
            "flex",
            "min-h-0",
            "flex-1",
            "items-center",
            "justify-center",
            "overflow-auto",
            "bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#fff_0%_50%)]",
            "bg-[length:20px_20px]",
            "p-4",
          )}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            className={cn(
              "max-h-[62vh]",
              "max-w-full",
              "touch-none",
              "cursor-crosshair",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "object-contain",
              "shadow-[4px_4px_0_0_#111827]",
            )}
          />
        </div>

        <div
          className={cn(
            "flex",
            "items-center",
            "justify-between",
            "gap-4",
            "border-t-2",
            "border-gray-900",
            "bg-white",
            "p-4",
            "dark:bg-[#1e222a]",
          )}
        >
          <p
            className={cn(
              "text-xs",
              "font-bold",
              "text-gray-500",
              "dark:text-gray-400",
            )}
          >
            Brush over areas you want to remove or restore.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isReady || isSaving}
            className={cn(
              "inline-flex",
              "shrink-0",
              "items-center",
              "gap-2",
              "rounded-xl",
              "border-3",
              "border-gray-900",
              "bg-purple-400",
              "px-5",
              "py-2.5",
              "text-sm",
              "font-black",
              "shadow-[4px_4px_0_0_#111827]",
              "transition-transform",
              "hover:-translate-y-1",
              "disabled:cursor-not-allowed",
              "disabled:opacity-50",
            )}
          >
            <Save className={cn("h-4", "w-4")} />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
