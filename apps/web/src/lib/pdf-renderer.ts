import { api } from "@/lib/api";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
}

export type OutputImageFormat = "jpg" | "jpeg" | "png" | "webp" | "avif";

export interface RenderOptions {
  dpi?: number; // Default 150
  quality?: number; // 0.82
  backgroundColor?: string; // Default #FFFFFF
  renderInteractiveForms?: boolean; // Default true
  format?: OutputImageFormat; // Default "jpg"
  transparentBackground?: boolean; // Auto object selector / clear alpha for PNG
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ConvertedPage {
  pageNumber: number;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  fileName: string;
  // Non-destructive master image & crop metadata
  originalBlob?: Blob;
  originalPreviewUrl?: string;
  originalWidth?: number;
  originalHeight?: number;
  cropRect?: CropRect;
}

export interface ConvertedPdfResult {
  fileId: string;
  fileName: string;
  totalPages: number;
  pages: ConvertedPage[];
}

/**
 * Read basic PDF metadata (e.g. page count, first page thumbnail)
 */
export async function inspectPdfFile(file: File): Promise<{
  numPages: number;
  thumbnailUrl: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  // Render thumbnail of page 1
  const firstPage = await pdfDoc.getPage(1);
  const viewport = firstPage.getViewport({ scale: 0.35 });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await firstPage.render({
    canvas: canvas,
    canvasContext: ctx,
    viewport: viewport,
    annotationMode: pdfjsLib.AnnotationMode.ENABLE_FORMS,
  }).promise;

  const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { numPages, thumbnailUrl };
}

export async function convertPdfToJpg(
  file: File,
  options: RenderOptions = {},
  onPageProgress?: (current: number, total: number) => void,
): Promise<ConvertedPdfResult> {
  const {
    dpi = 150,
    quality = 0.82,
    backgroundColor = "#FFFFFF",
    renderInteractiveForms = true,
    format = "jpg",
    transparentBackground = format === "png",
  } = options;

  let mimeType = "image/jpeg";
  let ext = "jpg";
  if (format === "png") {
    mimeType = "image/png";
    ext = "png";
  } else if (format === "webp") {
    mimeType = "image/webp";
    ext = "webp";
  } else if (format === "avif") {
    mimeType = "image/avif";
    ext = "avif";
  } else if (format === "jpeg") {
    mimeType = "image/jpeg";
    ext = "jpeg";
  }

  const scale = dpi / 72;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const pages: ConvertedPage[] = [];
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext("2d", { alpha: transparentBackground });
    if (!ctx) {
      throw new Error("Canvas 2D context not available");
    }

    if (!transparentBackground) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Render with anti-aliasing and interactive forms
    await page.render({
      canvas: canvas,
      canvasContext: ctx,
      viewport: viewport,
      annotationMode: renderInteractiveForms
        ? pdfjsLib.AnnotationMode.ENABLE_FORMS
        : pdfjsLib.AnnotationMode.DISABLE,
    }).promise;

    // Auto Object Selector / White background keyer for transparent PNG
    if (transparentBackground && format === "png") {
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // If pixel is near-white paper background (r,g,b > 238)
          if (a > 0 && r > 238 && g > 238 && b > 238) {
            const brightness = (r + g + b) / 3;
            if (brightness >= 248) {
              data[i + 3] = 0; // Pure transparent
            } else {
              // Smooth edge falloff to avoid jagged halos around text and graphics
              const factor = (248 - brightness) / 10;
              data[i + 3] = Math.round(a * Math.max(0, Math.min(1, factor)));
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch {
        // Fall back gracefully if canvas context has security restriction
      }
    }

    // Convert canvas to image blob (with WebP fallback if AVIF unsupported by browser)
    let blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        mimeType,
        format === "png" ? undefined : quality,
      );
    });

    if (!blob && format === "avif") {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/webp", quality);
      });
      ext = "webp";
    }

    if (!blob) {
      throw new Error(`Failed to convert page ${pageNum} to ${ext.toUpperCase()}`);
    }

    const previewUrl = URL.createObjectURL(blob);
    const pageFileName = `${baseName}_page_${String(pageNum).padStart(3, "0")}.${ext}`;

    pages.push({
      pageNumber: pageNum,
      blob,
      previewUrl,
      width: canvas.width,
      height: canvas.height,
      fileName: pageFileName,
      originalBlob: blob,
      originalPreviewUrl: previewUrl,
      originalWidth: canvas.width,
      originalHeight: canvas.height,
    });

    onPageProgress?.(pageNum, totalPages);
  }

  return {
    fileId: `${file.name}-${file.lastModified}-${Date.now()}`,
    fileName: file.name,
    totalPages,
    pages,
  };
}

/**
 * Generate a ZIP containing all converted JPG images
 */
export async function createZipFromConvertedPages(
  results: ConvertedPdfResult[],
): Promise<Blob> {
  const zip = new JSZip();

  for (const result of results) {
    const folderName = result.fileName.replace(/\.[^/.]+$/, "");
    const folder = results.length > 1 ? (zip.folder(folderName) ?? zip) : zip;

    for (const page of result.pages) {
      folder.file(page.fileName, page.blob);
    }
  }

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Convert PDF file using the backend Go-PDFium WebAssembly engine
 * Best suited for large files (>= 50MB) or memory-intensive PDFs
 */
export async function convertPdfViaBackend(
  file: File,
  options: RenderOptions = {},
  onProgress?: (percent: number) => void,
): Promise<ConvertedPdfResult> {
  const formData = new FormData();
  formData.append("files", file);
  if (options.dpi) formData.append("dpi", String(options.dpi));
  if (options.quality) {
    formData.append("quality", String(Math.round(options.quality * 100)));
  }
  if (options.format) {
    formData.append("format", options.format);
  }

  const targetFormat = options.format || "jpg";
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: Array<{
      original_name: string;
      total_pages: number;
      pages: Array<{
        page_number: number;
        image_base64: string;
        width: number;
        height: number;
        file_name: string;
      }>;
    }>;
  }>(`/pdf/pdf-to-${targetFormat}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress?.(percent);
      }
    },
  });

  if (!data.success || !data.data || data.data.length === 0) {
    throw new Error(data.message || "Failed to convert PDF via backend");
  }

  let mimeType = "image/jpeg";
  if (targetFormat === "png") mimeType = "image/png";
  else if (targetFormat === "webp") mimeType = "image/webp";
  else if (targetFormat === "avif") mimeType = "image/avif";

  const fileResult = data.data[0];
  const pages: ConvertedPage[] = fileResult.pages.map((p) => {
    // Decode base64 to binary Blob
    const byteCharacters = atob(p.image_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const previewUrl = URL.createObjectURL(blob);

    return {
      pageNumber: p.page_number,
      blob,
      previewUrl,
      width: p.width,
      height: p.height,
      fileName: p.file_name,
      originalBlob: blob,
      originalPreviewUrl: previewUrl,
      originalWidth: p.width,
      originalHeight: p.height,
    };
  });

  return {
    fileId: `${file.name}-${file.lastModified}-${Date.now()}`,
    fileName: file.name,
    totalPages: fileResult.total_pages,
    pages,
  };
}

export const convertPdfToImage = convertPdfToJpg;

