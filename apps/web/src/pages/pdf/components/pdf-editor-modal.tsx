import { useState, useRef, useEffect, useCallback } from "react";
import {
  Eraser,
  Wand2,
  Sparkles,
  RotateCw,
  RotateCcw,
  Crop,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ConvertedPage } from "@/lib/pdf-renderer";

export interface PdfEditorModalProps {
  isOpen: boolean;
  page: ConvertedPage | null;
  onClose: () => void;
  onSave: (updatedPage: ConvertedPage) => void;
  formatName?: string;
  mimeType?: string;
  quality?: number;
  enableEraserTools?: boolean;
}

type ActiveTool = "magic" | "brush" | "none";

interface CropBoxPct {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface HistoryState {
  data: ImageData;
  width: number;
  height: number;
  cropRect: CropBoxPct | null;
}

function rotateCanvas(source: HTMLCanvasElement, angleRad: number) {
  const is90or270 = Math.abs(angleRad % Math.PI) > 0.01;
  const targetW = is90or270 ? source.height : source.width;
  const targetH = is90or270 ? source.width : source.height;

  const temp = document.createElement("canvas");
  temp.width = targetW;
  temp.height = targetH;
  const ctx = temp.getContext("2d");
  if (!ctx) return;

  ctx.translate(targetW / 2, targetH / 2);
  ctx.rotate(angleRad);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);

  source.width = targetW;
  source.height = targetH;
  const sCtx = source.getContext("2d", { willReadFrequently: true });
  if (sCtx) {
    sCtx.clearRect(0, 0, targetW, targetH);
    sCtx.drawImage(temp, 0, 0);
  }
}

function flipCanvas(source: HTMLCanvasElement, horizontal: boolean) {
  const temp = document.createElement("canvas");
  temp.width = source.width;
  temp.height = source.height;
  const ctx = temp.getContext("2d");
  if (!ctx) return;

  if (horizontal) {
    ctx.translate(source.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, source.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(source, 0, 0);

  const sCtx = source.getContext("2d", { willReadFrequently: true });
  if (sCtx) {
    sCtx.clearRect(0, 0, source.width, source.height);
    sCtx.drawImage(temp, 0, 0);
  }
}

export function PdfEditorModal({
  isOpen,
  page,
  onClose,
  onSave,
  formatName = "Gambar",
  mimeType = "image/png",
  quality = 0.92,
  enableEraserTools,
}: PdfEditorModalProps) {
  const isEraserEnabled =
    enableEraserTools ?? (mimeType === "image/png" || formatName.toUpperCase() === "PNG");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Master image (full uncropped original)
  const masterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const masterDimRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const currentCropRectRef = useRef<CropBoxPct | null>(null);
  const preCropStateRef = useRef<{ data: ImageData; width: number; height: number } | null>(null);

  const [canvasDim, setCanvasDim] = useState<{ width: number; height: number }>({
    width: page?.width || 800,
    height: page?.height || 1000,
  });

  const [activeTool, setActiveTool] = useState<ActiveTool>("none");
  const [tolerance, setTolerance] = useState<number>(25); // 0 - 100
  const [brushSize, setBrushSize] = useState<number>(28); // 5 - 100 px
  const [isContiguous, setIsContiguous] = useState<boolean>(false); // false = global, true = flood fill
  const [zoom, setZoom] = useState<number>(100);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Percentage crop coordinates (0 to 100)
  const [isCropMode, setIsCropMode] = useState<boolean>(false);
  const [cropBox, setCropBox] = useState<CropBoxPct>({
    x: 5,
    y: 5,
    w: 90,
    h: 90,
  });

  // Dragging crop state
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{
    startX: number;
    startY: number;
    startCrop: CropBoxPct;
    canvasRect: DOMRect;
  } | null>(null);

  // Canvas Pan (Drag to move image)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    initPanX: number;
    initPanY: number;
  } | null>(null);

  // Initialize canvas with master and active page images
  useEffect(() => {
    if (!isOpen || !page) return;

    const masterUrl = page.originalPreviewUrl || page.previewUrl;
    const masterW = page.originalWidth || page.width;
    const masterH = page.originalHeight || page.height;

    const masterImg = new Image();
    masterImg.crossOrigin = "anonymous";
    masterImg.src = masterUrl;

    masterImg.onload = () => {
      const mCanvas = document.createElement("canvas");
      const mw = masterImg.naturalWidth || masterW;
      const mh = masterImg.naturalHeight || masterH;
      mCanvas.width = mw;
      mCanvas.height = mh;
      const mCtx = mCanvas.getContext("2d", { willReadFrequently: true });
      if (mCtx) {
        mCtx.drawImage(masterImg, 0, 0);
      }
      masterCanvasRef.current = mCanvas;
      masterDimRef.current = { width: mw, height: mh };

      if (page.cropRect) {
        currentCropRectRef.current = { ...page.cropRect };
        setCropBox({ ...page.cropRect });
      } else {
        currentCropRectRef.current = null;
        setCropBox({ x: 5, y: 5, w: 90, h: 90 });
      }

      // Load active image to display on the editor canvas initially
      const activeImg = new Image();
      activeImg.crossOrigin = "anonymous";
      activeImg.src = page.previewUrl;

      activeImg.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const cw = activeImg.naturalWidth || page.width;
        const ch = activeImg.naturalHeight || page.height;

        canvas.width = cw;
        canvas.height = ch;
        setCanvasDim({ width: cw, height: ch });

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(activeImg, 0, 0);

        const initialData = ctx.getImageData(0, 0, cw, ch);
        setHistory([
          {
            data: initialData,
            width: cw,
            height: ch,
            cropRect: page.cropRect ? { ...page.cropRect } : null,
          },
        ]);
        setHistoryIndex(0);
        setZoom(100);
        setPan({ x: 0, y: 0 });
        setIsCropMode(false);
        setActiveTool("none");
      };
    };
  }, [isOpen, page]);

  // Zoom on mouse wheel scroll in the viewport container
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomStep = 10;
      if (e.deltaY < 0) {
        setZoom((z) => Math.min(300, z + zoomStep));
      } else if (e.deltaY > 0) {
        setZoom((z) => Math.max(30, z - zoomStep));
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [isOpen]);

  const pushState = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const item: HistoryState = {
      data: imgData,
      width: canvas.width,
      height: canvas.height,
      cropRect: currentCropRectRef.current ? { ...currentCropRectRef.current } : null,
    };

    setHistory((prev) => [...prev.slice(0, historyIndex + 1), item].slice(-15));
    setHistoryIndex((prev) => Math.min(prev + 1, 14));
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const targetIndex = historyIndex - 1;
    const targetState = history[targetIndex];
    if (!targetState) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = targetState.width;
    canvas.height = targetState.height;
    setCanvasDim({ width: targetState.width, height: targetState.height });

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.putImageData(targetState.data, 0, 0);
    setHistoryIndex(targetIndex);

    currentCropRectRef.current = targetState.cropRect ? { ...targetState.cropRect } : null;
    if (targetState.cropRect) {
      setCropBox({ ...targetState.cropRect });
    }
    setIsCropMode(false);
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    const masterCanvas = masterCanvasRef.current;
    if (!canvas || !masterCanvas) return;

    const mw = masterDimRef.current.width;
    const mh = masterDimRef.current.height;
    canvas.width = mw;
    canvas.height = mh;
    setCanvasDim({ width: mw, height: mh });

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, mw, mh);
    ctx.drawImage(masterCanvas, 0, 0);

    const initialData = ctx.getImageData(0, 0, mw, mh);
    currentCropRectRef.current = null;
    setCropBox({ x: 5, y: 5, w: 90, h: 90 });
    setHistory([
      {
        data: initialData,
        width: mw,
        height: mh,
        cropRect: null,
      },
    ]);
    setHistoryIndex(0);
    setPan({ x: 0, y: 0 });
    setIsCropMode(false);
    setActiveTool("none");
    toast.success("Gambar dan ukuran berhasil direset ke awal!");
  };

  // Rotation: 90 deg clockwise
  const handleRotateCw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (masterCanvasRef.current) {
      rotateCanvas(masterCanvasRef.current, Math.PI / 2);
      masterDimRef.current = {
        width: masterCanvasRef.current.width,
        height: masterCanvasRef.current.height,
      };
    }

    if (currentCropRectRef.current) {
      const prev = currentCropRectRef.current;
      const newCrop = {
        x: 100 - (prev.y + prev.h),
        y: prev.x,
        w: prev.h,
        h: prev.w,
      };
      currentCropRectRef.current = newCrop;
      setCropBox(newCrop);
    }

    rotateCanvas(canvas, Math.PI / 2);
    setCanvasDim({ width: canvas.width, height: canvas.height });
    pushState(canvas);
  };

  // Rotation: 90 deg counter-clockwise
  const handleRotateCcw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (masterCanvasRef.current) {
      rotateCanvas(masterCanvasRef.current, -Math.PI / 2);
      masterDimRef.current = {
        width: masterCanvasRef.current.width,
        height: masterCanvasRef.current.height,
      };
    }

    if (currentCropRectRef.current) {
      const prev = currentCropRectRef.current;
      const newCrop = {
        x: prev.y,
        y: 100 - (prev.x + prev.w),
        w: prev.h,
        h: prev.w,
      };
      currentCropRectRef.current = newCrop;
      setCropBox(newCrop);
    }

    rotateCanvas(canvas, -Math.PI / 2);
    setCanvasDim({ width: canvas.width, height: canvas.height });
    pushState(canvas);
  };

  // Flip Horizontal
  const handleFlipHorizontal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (masterCanvasRef.current) {
      flipCanvas(masterCanvasRef.current, true);
    }

    if (currentCropRectRef.current) {
      const prev = currentCropRectRef.current;
      const newCrop = {
        ...prev,
        x: 100 - (prev.x + prev.w),
      };
      currentCropRectRef.current = newCrop;
      setCropBox(newCrop);
    }

    flipCanvas(canvas, true);
    pushState(canvas);
  };

  // Flip Vertical
  const handleFlipVertical = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (masterCanvasRef.current) {
      flipCanvas(masterCanvasRef.current, false);
    }

    if (currentCropRectRef.current) {
      const prev = currentCropRectRef.current;
      const newCrop = {
        ...prev,
        y: 100 - (prev.y + prev.h),
      };
      currentCropRectRef.current = newCrop;
      setCropBox(newCrop);
    }

    flipCanvas(canvas, false);
    pushState(canvas);
  };

  // Toggle Crop: when entering crop mode, reveal the entire master image and show the crop box
  const toggleCropMode = () => {
    if (!isCropMode) {
      const canvas = canvasRef.current;
      const masterCanvas = masterCanvasRef.current;
      if (!canvas || !masterCanvas) return;

      // 1. Save current active canvas view
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        preCropStateRef.current = {
          data: ctx.getImageData(0, 0, canvas.width, canvas.height),
          width: canvas.width,
          height: canvas.height,
        };
      }

      // 2. Switch canvas to full master image so user sees the entire image!
      const mw = masterDimRef.current.width;
      const mh = masterDimRef.current.height;
      canvas.width = mw;
      canvas.height = mh;
      setCanvasDim({ width: mw, height: mh });

      const newCtx = canvas.getContext("2d", { willReadFrequently: true });
      if (newCtx) {
        newCtx.clearRect(0, 0, mw, mh);
        newCtx.drawImage(masterCanvas, 0, 0);
      }

      // 3. Set crop box: if we previously had a cropRect, use it so user can adjust from it!
      if (currentCropRectRef.current) {
        setCropBox({ ...currentCropRectRef.current });
      } else {
        setCropBox({ x: 5, y: 5, w: 90, h: 90 });
      }

      setIsCropMode(true);
      setActiveTool("none");
    } else {
      // User clicked "Batal": revert canvas to pre-crop state
      const canvas = canvasRef.current;
      if (canvas && preCropStateRef.current) {
        const { data, width, height } = preCropStateRef.current;
        canvas.width = width;
        canvas.height = height;
        setCanvasDim({ width, height });
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.putImageData(data, 0, 0);
        }
      }
      setIsCropMode(false);
    }
  };

  // Apply Crop: cuts out the selected region from the master image
  const handleApplyCrop = () => {
    const canvas = canvasRef.current;
    const masterCanvas = masterCanvasRef.current;
    if (!canvas || !masterCanvas) return;

    const masterW = masterCanvas.width;
    const masterH = masterCanvas.height;

    const actualX = Math.max(0, Math.min(masterW - 1, Math.round((cropBox.x / 100) * masterW)));
    const actualY = Math.max(0, Math.min(masterH - 1, Math.round((cropBox.y / 100) * masterH)));
    const actualW = Math.max(1, Math.min(masterW - actualX, Math.round((cropBox.w / 100) * masterW)));
    const actualH = Math.max(1, Math.min(masterH - actualY, Math.round((cropBox.h / 100) * masterH)));

    if (actualW <= 5 || actualH <= 5) return;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = actualW;
    cropCanvas.height = actualH;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return;

    cropCtx.drawImage(
      masterCanvas,
      actualX,
      actualY,
      actualW,
      actualH,
      0,
      0,
      actualW,
      actualH,
    );

    canvas.width = actualW;
    canvas.height = actualH;
    setCanvasDim({ width: actualW, height: actualH });

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, actualW, actualH);
    ctx.drawImage(cropCanvas, 0, 0);

    currentCropRectRef.current = { ...cropBox };
    pushState(canvas);

    setIsCropMode(false);
    toast.success(`Berhasil memotong gambar (${actualW} × ${actualH} px)`);
  };

  // Dragging crop handles
  const handleOverlayMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDraggingCrop(true);
    setDragHandle(handle);
    setDragStart({
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropBox },
      canvasRect: canvas.getBoundingClientRect(),
    });
  };

  const handleOverlayMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCrop || !dragStart) return;

    const deltaXPct = ((e.clientX - dragStart.startX) / dragStart.canvasRect.width) * 100;
    const deltaYPct = ((e.clientY - dragStart.startY) / dragStart.canvasRect.height) * 100;

    const prev = dragStart.startCrop;
    let newX = prev.x;
    let newY = prev.y;
    let newW = prev.w;
    let newH = prev.h;

    if (dragHandle === "move") {
      newX = Math.max(0, Math.min(100 - prev.w, prev.x + deltaXPct));
      newY = Math.max(0, Math.min(100 - prev.h, prev.y + deltaYPct));
    } else {
      if (dragHandle?.includes("l")) {
        const proposedX = Math.max(0, Math.min(prev.x + prev.w - 5, prev.x + deltaXPct));
        newW = prev.w + (prev.x - proposedX);
        newX = proposedX;
      }
      if (dragHandle?.includes("r")) {
        newW = Math.max(5, Math.min(100 - prev.x, prev.w + deltaXPct));
      }
      if (dragHandle?.includes("t")) {
        const proposedY = Math.max(0, Math.min(prev.y + prev.h - 5, prev.y + deltaYPct));
        newH = prev.h + (prev.y - proposedY);
        newY = proposedY;
      }
      if (dragHandle?.includes("b")) {
        newH = Math.max(5, Math.min(100 - prev.y, prev.h + deltaYPct));
      }
    }

    setCropBox({ x: newX, y: newY, w: newW, h: newH });
  };

  const handleOverlayMouseUp = () => {
    setIsDraggingCrop(false);
    setDragHandle(null);
    setDragStart(null);
  };

  // Viewport Pan Handlers (Drag to move view)
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    // Panning is enabled for:
    // 1. Right click (button === 2) anywhere
    // 2. Middle click (button === 1) anywhere
    // 3. Left click (button === 0) when tool is none and not in crop mode, or clicking on background
    const isRightClick = e.button === 2;
    const isMiddleClick = e.button === 1;
    const isLeftClickPan =
      e.button === 0 && (activeTool === "none" && !isCropMode);

    if (isRightClick || isMiddleClick || isLeftClickPan) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initPanX: pan.x,
        initPanY: pan.y,
      };
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.startX;
      const dy = e.clientY - panStartRef.current.startY;
      setPan({
        x: panStartRef.current.initPanX + dx,
        y: panStartRef.current.initPanY + dy,
      });
      return;
    }

    if (isDraggingCrop) {
      handleOverlayMouseMove(e);
    }
  };

  const handleContainerMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
    if (isDraggingCrop) {
      handleOverlayMouseUp();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Prevent context menu popup so holding right-click to drag is uninterrupted
    e.preventDefault();
  };

  // Quick Action: Erase White Background
  const handleQuickRemoveWhite = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    setIsProcessing(true);

    setTimeout(() => {
      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0;
        } else if (brightness > 230) {
          const alphaFactor = (255 - brightness) / 25;
          data[i + 3] = Math.min(data[i + 3], Math.round(255 * alphaFactor));
        }
      }

      ctx.putImageData(imgData, 0, 0);
      pushState(canvas);
      setIsProcessing(false);
      toast.success("Background putih berhasil dihapus!");
    }, 10);
  };

  // Magic Wand Click Handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || activeTool !== "magic" || isCropMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = Math.floor((e.clientX - rect.left) * scaleX);
    const clickY = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const targetOffset = (clickY * width + clickX) * 4;
    const targetR = data[targetOffset];
    const targetG = data[targetOffset + 1];
    const targetB = data[targetOffset + 2];
    const targetA = data[targetOffset + 3];

    if (targetA === 0) return;

    setIsProcessing(true);

    setTimeout(() => {
      const maxDistance = (tolerance / 100) * 441.67;

      const isMatch = (offset: number) => {
        const a = data[offset + 3];
        if (a === 0) return false;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const dist = Math.sqrt(
          (r - targetR) ** 2 + (g - targetG) ** 2 + (b - targetB) ** 2,
        );
        return dist <= maxDistance;
      };

      if (!isContiguous) {
        for (let i = 0; i < data.length; i += 4) {
          if (isMatch(i)) {
            data[i + 3] = 0;
          }
        }
      } else {
        const visited = new Uint8Array(width * height);
        const queue: number[] = [clickX + clickY * width];
        visited[clickX + clickY * width] = 1;

        while (queue.length > 0) {
          const idx = queue.pop()!;
          const x = idx % width;
          const y = Math.floor(idx / width);
          const offset = idx * 4;

          data[offset + 3] = 0;

          const neighbors = [
            x > 0 ? idx - 1 : -1,
            x < width - 1 ? idx + 1 : -1,
            y > 0 ? idx - width : -1,
            y < height - 1 ? idx + width : -1,
          ];

          for (const n of neighbors) {
            if (n !== -1 && !visited[n]) {
              visited[n] = 1;
              if (isMatch(n * 4)) {
                queue.push(n);
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      pushState(canvas);
      setIsProcessing(false);
    }, 10);
  };

  // Manual Brush Handlers
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || activeTool !== "brush" || isCropMode) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "brush" || !isDrawing || isCropMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handleMouseUp = () => {
    if (activeTool === "brush" && isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (!canvas) return;
      pushState(canvas);
    }
  };

  // Commit and Save
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;

    // Auto-apply crop if currently active
    if (isCropMode) {
      handleApplyCrop();
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const newPreviewUrl = URL.createObjectURL(blob);
        onSave({
          ...page,
          blob,
          previewUrl: newPreviewUrl,
          width: canvas.width,
          height: canvas.height,
          originalBlob: page.originalBlob || page.blob,
          originalPreviewUrl: page.originalPreviewUrl || page.previewUrl,
          originalWidth: masterDimRef.current.width || page.originalWidth || page.width,
          originalHeight: masterDimRef.current.height || page.originalHeight || page.height,
          cropRect: currentCropRectRef.current ?? undefined,
        });
        onClose();
      },
      mimeType,
      quality,
    );
  };

  if (!isOpen || !page) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-3 border-gray-900 bg-white shadow-[8px_8px_0_0_#111827] dark:border-gray-700 dark:bg-[#16181d]"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
      >
        {/* Header */}
        <div className="flex items-center justify-end border-b-3 border-gray-900 bg-yellow-400 px-4 py-2 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-gray-900 bg-white p-1.5 text-gray-900 shadow-[2px_2px_0_0_#111827] hover:bg-gray-100 cursor-pointer transition-transform hover:scale-105"
            title="Tutup"
          >
            <X className="h-4 w-4 stroke-3" />
          </button>
        </div>

        {/* Toolbar - Simple, Minimalist & Focused */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-[#121316]">
          {/* Main Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Rotate */}
            <button
              type="button"
              onClick={handleRotateCcw}
              title="Putar 90° Kiri (-90°)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-gray-900 bg-white text-gray-900 shadow-[2px_2px_0_0_#111827] hover:bg-yellow-100 cursor-pointer dark:border-gray-700 dark:bg-[#16181d] dark:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleRotateCw}
              title="Putar 90° Kanan (+90°)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-gray-900 bg-white text-gray-900 shadow-[2px_2px_0_0_#111827] hover:bg-yellow-100 cursor-pointer dark:border-gray-700 dark:bg-[#16181d] dark:text-white"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Flip */}
            <button
              type="button"
              onClick={handleFlipHorizontal}
              title="Balik Horizontal (Flip H)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-gray-900 bg-white text-gray-900 shadow-[2px_2px_0_0_#111827] hover:bg-yellow-100 cursor-pointer dark:border-gray-700 dark:bg-[#16181d] dark:text-white"
            >
              <FlipHorizontal className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleFlipVertical}
              title="Balik Vertikal (Flip V)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-gray-900 bg-white text-gray-900 shadow-[2px_2px_0_0_#111827] hover:bg-yellow-100 cursor-pointer dark:border-gray-700 dark:bg-[#16181d] dark:text-white"
            >
              <FlipVertical className="h-4 w-4" />
            </button>

            <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

            {/* Crop Toggle */}
            <button
              type="button"
              onClick={toggleCropMode}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border-2 border-gray-900 px-3 py-1.5 text-xs font-black cursor-pointer transition-all",
                isCropMode
                  ? "bg-yellow-400 text-gray-900 shadow-[2px_2px_0_0_#111827]"
                  : "bg-white text-gray-700 hover:bg-gray-100 shadow-[2px_2px_0_0_#111827] dark:bg-[#16181d] dark:text-gray-300 dark:border-gray-700",
              )}
            >
              <Crop className="h-3.5 w-3.5" />
              <span>{isCropMode ? "Batal" : "Crop"}</span>
            </button>

            {/* Crop Apply */}
            {isCropMode && (
              <button
                type="button"
                onClick={handleApplyCrop}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-900 bg-emerald-400 px-3 py-1.5 text-xs font-black text-gray-900 shadow-[2px_2px_0_0_#111827] hover:bg-emerald-500 cursor-pointer transition-all"
              >
                <Check className="h-3.5 w-3.5 stroke-3" />
                <span>Potong</span>
              </button>
            )}

            {/* Eraser Tools (Optional, e.g. for PNG) */}
            {isEraserEnabled && (
              <>
                <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

                {/* Magic Wand Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool(activeTool === "magic" ? "none" : "magic");
                    setIsCropMode(false);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xl border-2 border-gray-900 px-3 py-1.5 text-xs font-black cursor-pointer transition-all",
                    activeTool === "magic"
                      ? "bg-yellow-400 text-gray-900 shadow-[2px_2px_0_0_#111827]"
                      : "bg-white text-gray-700 hover:bg-gray-100 shadow-[2px_2px_0_0_#111827] dark:bg-[#16181d] dark:text-gray-300 dark:border-gray-700",
                  )}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>Wand</span>
                </button>

                {/* Brush Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool(activeTool === "brush" ? "none" : "brush");
                    setIsCropMode(false);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xl border-2 border-gray-900 px-3 py-1.5 text-xs font-black cursor-pointer transition-all",
                    activeTool === "brush"
                      ? "bg-yellow-400 text-gray-900 shadow-[2px_2px_0_0_#111827]"
                      : "bg-white text-gray-700 hover:bg-gray-100 shadow-[2px_2px_0_0_#111827] dark:bg-[#16181d] dark:text-gray-300 dark:border-gray-700",
                  )}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span>Brush</span>
                </button>

                {/* Clear White BG */}
                <button
                  type="button"
                  onClick={handleQuickRemoveWhite}
                  className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-900 bg-emerald-400 px-2.5 py-1.5 text-xs font-black text-gray-900 shadow-[2px_2px_0_0_#111827] hover:bg-emerald-500 cursor-pointer transition-all"
                  title="Erase White Background"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Clear White</span>
                </button>
              </>
            )}
          </div>

          {/* Context Controls (Sliders) & History */}
          <div className="flex items-center gap-2">
            {/* Magic Wand Tol */}
            {isEraserEnabled && activeTool === "magic" && !isCropMode && (
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Sliders className="h-3 w-3 text-gray-500" />
                <span>Tol:</span>
                <input
                  type="range"
                  min="1"
                  max="80"
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  className="h-1.5 w-16 accent-yellow-500 cursor-pointer"
                />
                <span className="w-5 font-black text-gray-900 dark:text-white text-[11px]">
                  {tolerance}%
                </span>
                <button
                  type="button"
                  onClick={() => setIsContiguous((c) => !c)}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-black border cursor-pointer",
                    isContiguous
                      ? "bg-gray-900 text-white border-gray-900 dark:bg-yellow-400 dark:text-gray-900"
                      : "bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  {isContiguous ? "Connected" : "All"}
                </button>
              </div>
            )}

            {/* Brush Size */}
            {isEraserEnabled && activeTool === "brush" && !isCropMode && (
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span>Brush:</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="h-1.5 w-16 accent-yellow-500 cursor-pointer"
                />
                <span className="w-6 font-black text-gray-900 dark:text-white text-[11px]">
                  {brushSize}px
                </span>
              </div>
            )}

            <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

            {/* Undo */}
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              className={cn(
                "inline-flex items-center gap-1 rounded-xl border-2 border-gray-900 px-2.5 py-1.5 text-xs font-bold transition-all",
                historyIndex > 0
                  ? "bg-white hover:bg-gray-100 text-gray-900 dark:bg-[#16181d] dark:text-white dark:border-gray-700 cursor-pointer shadow-[2px_2px_0_0_#111827]"
                  : "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:border-gray-700",
              )}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Undo</span>
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-900 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-900 shadow-[2px_2px_0_0_#111827] hover:bg-gray-100 cursor-pointer dark:border-gray-700 dark:bg-[#16181d] dark:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Canvas Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleViewportMouseDown}
          onContextMenu={handleContextMenu}
          className={cn(
            "relative flex-1 overflow-hidden p-4 flex items-center justify-center bg-gray-200/80 dark:bg-[#0d0e12] select-none",
            isPanning
              ? "cursor-grabbing"
              : activeTool === "none" && !isCropMode
                ? "cursor-grab"
                : "cursor-default",
          )}
        >
          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 rounded-2xl border-3 border-gray-900 bg-white px-5 py-3 font-black text-gray-900 shadow-[4px_4px_0_0_#111827]">
                <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
                <span>Memproses Gambar...</span>
              </div>
            </div>
          )}

          <div
            className={cn(
              "relative inline-block w-fit h-fit border border-gray-300 dark:border-gray-700 shadow-md select-none transition-transform duration-75",
              isEraserEnabled
                ? "bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%),linear-gradient(-45deg,#e5e7eb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e7eb_75%),linear-gradient(-45deg,transparent_75%,#e5e7eb_75%)] bg-size-[16px_16px] bg-white"
                : "bg-white",
            )}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
              transformOrigin: "center center",
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={(e) => {
                if (activeTool === "brush" && e.button === 0 && !isCropMode) {
                  handleMouseDown(e);
                } else {
                  handleViewportMouseDown(e);
                }
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={cn(
                "block max-h-[60vh] max-w-[80vw] w-auto h-auto object-contain",
                isPanning
                  ? "cursor-grabbing"
                  : isCropMode
                    ? "cursor-default"
                    : activeTool === "magic"
                      ? "cursor-crosshair"
                      : activeTool === "brush"
                        ? "cursor-cell"
                        : "cursor-grab",
              )}
            />

            {/* Interactive Crop Box Overlay */}
            {isCropMode && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ width: "100%", height: "100%" }}
              >
                <div
                  className="absolute pointer-events-auto border-2 border-yellow-400 border-dashed cursor-move"
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.w}%`,
                    height: `${cropBox.h}%`,
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
                  }}
                  onMouseDown={(e) => handleOverlayMouseDown(e, "move")}
                >
                  {/* Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div />
                  </div>

                  {/* Corner Handles */}
                  <div
                    onMouseDown={(e) => handleOverlayMouseDown(e, "tl")}
                    className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 border-2 border-gray-900 bg-yellow-400 cursor-nwse-resize rounded-xs shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => handleOverlayMouseDown(e, "tr")}
                    className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 border-2 border-gray-900 bg-yellow-400 cursor-nesw-resize rounded-xs shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => handleOverlayMouseDown(e, "bl")}
                    className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 border-2 border-gray-900 bg-yellow-400 cursor-nesw-resize rounded-xs shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => handleOverlayMouseDown(e, "br")}
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 border-2 border-gray-900 bg-yellow-400 cursor-nwse-resize rounded-xs shadow-xs"
                  />

                  {/* Edge Handles */}
                  <div
                    onMouseDown={(e) => handleOverlayMouseDown(e, "t")}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-5 border-2 border-gray-900 bg-yellow-400 cursor-ns-resize rounded-xs"
                  />
                  <div
                    onMouseDown={(e) => handleOverlayMouseDown(e, "b")}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-5 border-2 border-gray-900 bg-yellow-400 cursor-ns-resize rounded-xs"
                  />
                  <div
                    onMouseDown={(e) => handleOverlayMouseDown(e, "l")}
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 h-5 w-3 border-2 border-gray-900 bg-yellow-400 cursor-ew-resize rounded-xs"
                  />
                  <div
                    onMouseDown={(e) => handleOverlayMouseDown(e, "r")}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-5 w-3 border-2 border-gray-900 bg-yellow-400 cursor-ew-resize rounded-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-3 border-gray-900 bg-white px-5 py-3 dark:border-gray-700 dark:bg-[#16181d]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-gray-500 dark:text-gray-400">
              Ukuran: {canvasDim.width} × {canvasDim.height} px
            </span>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(30, z - 10))}
                className="rounded-lg border-2 border-gray-900 bg-white p-1 text-gray-900 shadow-[1px_1px_0_0_#111827] hover:bg-gray-100 cursor-pointer dark:border-gray-700 dark:bg-[#1a1c22] dark:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-12 text-center text-xs font-black text-gray-900 dark:text-white">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(250, z + 10))}
                className="rounded-lg border-2 border-gray-900 bg-white p-1 text-gray-900 shadow-[1px_1px_0_0_#111827] hover:bg-gray-100 cursor-pointer dark:border-gray-700 dark:bg-[#1a1c22] dark:text-white"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(100);
                  setPan({ x: 0, y: 0 });
                }}
                className="rounded-lg border border-gray-400 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 hover:bg-gray-100 cursor-pointer dark:text-gray-300 dark:border-gray-700"
              >
                Fit
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border-2 border-gray-900 bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200 cursor-pointer dark:border-gray-700 dark:bg-[#1e222a] dark:text-gray-200"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl border-3 border-gray-900 bg-yellow-400 px-5 py-2 text-xs font-black text-gray-900 shadow-[3px_3px_0_0_#111827] hover:bg-yellow-500 cursor-pointer hover:-translate-y-0.5 transition-all"
            >
              <Check className="h-4 w-4 stroke-3" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
