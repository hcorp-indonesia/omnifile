import { api } from '@/lib/api';
import JSZip from 'jszip';

export interface CompressPdfOptions {
  level?: 'recommended' | 'extreme' | 'low' | 'custom';
  target_size_kb?: number;
  quality?: number;
  dpi?: number;
  remove_metadata?: boolean;
  output_file_name?: string;
}

export interface CompressPdfResult {
  file_name: string;
  original_size: number;
  compressed_size: number;
  saved_bytes: number;
  saved_percentage: number;
  compression_level: string;
  total_pages: number;
  file_base64: string;
}

export interface CompressPdfResponse {
  success: boolean;
  message?: string;
  data: CompressPdfResult;
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

export async function compressPdfViaBackend(
  file: File,
  options: CompressPdfOptions = {},
  onProgress?: (percent: number) => void,
): Promise<CompressPdfResult> {
  const formData = new FormData();
  formData.append('file', file);

  if (options.level) {
    formData.append('level', options.level);
  }

  if (options.target_size_kb !== undefined && options.target_size_kb > 0) {
    formData.append('target_size_kb', options.target_size_kb.toString());
  }

  if (options.quality !== undefined) {
    formData.append('quality', options.quality.toString());
  }

  if (options.dpi !== undefined) {
    formData.append('dpi', options.dpi.toString());
  }

  if (options.remove_metadata !== undefined) {
    formData.append('remove_metadata', options.remove_metadata ? 'true' : 'false');
  }

  if (options.output_file_name) {
    formData.append('output_file_name', options.output_file_name);
  }

  const response = await api.post<CompressPdfResponse>('/pdf/compress', formData, {
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
    throw new Error(response.data.message || 'Failed to compress PDF');
  }

  return response.data.data;
}

export async function downloadAllCompressedAsZip(
  results: CompressPdfResult[],
  zipFileName: string = 'compressed_pdfs.zip',
): Promise<void> {
  const zip = new JSZip();
  for (const res of results) {
    if (res.file_base64) {
      const blob = base64ToPdfBlob(res.file_base64);
      zip.file(res.file_name, blob);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipContent);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
