import { api } from '@/lib/api';

export interface OcrPdfOptions {
  language?: string; // "eng+ind", "ind", "eng"
  output_file_name?: string;
}

export interface OcrPdfResult {
  file_name: string;
  original_size: number;
  processed_size: number;
  total_pages: number;
  language: string;
  extracted_text: string;
  words_count: number;
  file_base64: string;
}

export interface OcrPdfResponse {
  success: boolean;
  message?: string;
  data: OcrPdfResult;
}

export function base64ToPdfBlob(base64: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'application/pdf' });
}

export function downloadPdfBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTxtFile(text: string, fileName: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function ocrPdfViaBackend(
  file: File,
  options: OcrPdfOptions = {},
  onProgress?: (percent: number) => void,
): Promise<OcrPdfResult> {
  const formData = new FormData();
  formData.append('file', file);

  if (options.language) {
    formData.append('language', options.language);
  }
  if (options.output_file_name) {
    formData.append('output_file_name', options.output_file_name);
  }

  const response = await api.post<OcrPdfResponse>('/pdf/ocr', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5 minutes for multi-page OCR
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to OCR PDF');
  }

  return response.data.data;
}
