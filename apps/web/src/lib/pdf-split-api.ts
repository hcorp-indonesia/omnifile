import { api } from '@/lib/api';

export interface SplitPdfOptions {
  mode: 'extract' | 'split_every' | 'split_all';
  pages?: string;
  every_n?: number;
  merge_extracted?: boolean;
  output_file_name?: string;
}

export interface SplitPdfItemInfo {
  file_name: string;
  pages: string;
  file_size: number;
}

export interface SplitPdfResult {
  file_name: string;
  file_size: number;
  total_pages: number;
  file_count: number;
  is_zip: boolean;
  file_base64: string;
  items?: SplitPdfItemInfo[];
}

export interface PdfInfoResult {
  file_name: string;
  file_size: number;
  total_pages: number;
}

export interface SplitPdfResponse {
  success: boolean;
  message?: string;
  data: SplitPdfResult;
}

export interface PdfInfoResponse {
  success: boolean;
  message?: string;
  data: PdfInfoResult;
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getPdfInfoViaBackend(file: File): Promise<PdfInfoResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<PdfInfoResponse>('/pdf/info', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to inspect PDF');
  }

  return response.data.data;
}

export async function splitPdfViaBackend(
  file: File,
  options: SplitPdfOptions,
  onProgress?: (percent: number) => void,
): Promise<SplitPdfResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', options.mode);

  if (options.pages) {
    formData.append('pages', options.pages);
  }
  if (options.every_n) {
    formData.append('every_n', options.every_n.toString());
  }
  if (options.merge_extracted !== undefined) {
    formData.append('merge_extracted', options.merge_extracted ? 'true' : 'false');
  }
  if (options.output_file_name) {
    formData.append('output_file_name', options.output_file_name);
  }

  const response = await api.post<SplitPdfResponse>('/pdf/split', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(percent);
      }
    },
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to split PDF document');
  }

  return response.data.data;
}
