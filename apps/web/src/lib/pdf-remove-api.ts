import { api } from '@/lib/api';

export interface RemovePdfOptions {
  pages: string;
  output_file_name?: string;
}

export interface RemovePdfResult {
  file_name: string;
  file_size: number;
  original_pages: number;
  remaining_pages: number;
  removed_pages_count: number;
  file_base64: string;
}

export interface RemovePdfResponse {
  success: boolean;
  message?: string;
  data: RemovePdfResult;
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

export async function removePdfPagesViaBackend(
  file: File,
  options: RemovePdfOptions,
  onProgress?: (percent: number) => void,
): Promise<RemovePdfResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pages', options.pages);

  if (options.output_file_name) {
    formData.append('output_file_name', options.output_file_name);
  }

  const response = await api.post<RemovePdfResponse>('/pdf/remove', formData, {
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
    throw new Error(response.data.message || 'Failed to remove pages from PDF');
  }

  return response.data.data;
}
