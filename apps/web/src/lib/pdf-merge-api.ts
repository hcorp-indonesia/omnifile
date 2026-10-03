import { api } from '@/lib/api';

export interface MergedFileSummary {
  name: string;
  size: number;
  pages: number;
}

export interface MergePdfResult {
  file_name: string;
  file_size: number;
  total_pages: number;
  total_files: number;
  file_base64: string;
  files: MergedFileSummary[];
}

export interface MergePdfOptions {
  output_file_name?: string;
}

export interface MergePdfResponse {
  success: boolean;
  message: string;
  data: MergePdfResult;
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

export async function mergePdfViaBackend(
  files: File[],
  options?: MergePdfOptions,
  onProgress?: (percent: number) => void,
): Promise<MergePdfResult> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  if (options?.output_file_name) {
    formData.append('output_file_name', options.output_file_name);
  }

  const response = await api.post<MergePdfResponse>('/pdf/merge', formData, {
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
    throw new Error(response.data.message || 'Failed to merge PDF files');
  }

  return response.data.data;
}
