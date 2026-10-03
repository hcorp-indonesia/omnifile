import { api } from '@/lib/api';
import JSZip from 'jszip';

export interface WordParagraphPreview {
  page: number;
  type: 'heading' | 'paragraph' | 'table';
  text: string;
  table_data?: string[][];
}

export interface WordFileResult {
  original_name: string;
  file_name: string;
  total_pages: number;
  word_count: number;
  paragraph_count: number;
  file_size: number;
  download_url?: string;
  engine: 'pdf.co' | 'local';
  file_base64: string;
  previews: WordParagraphPreview[];
}

export interface ConvertWordOptions {
  engine?: 'auto' | 'pdf.co' | 'local';
  ocr?: boolean;
  ocr_lang?: string;
}

export interface ConvertPdfToWordResponse {
  success: boolean;
  message: string;
  data: WordFileResult[];
}

export function base64ToDocxBlob(base64: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export async function convertPdfToWordViaBackend(
  file: File,
  options?: ConvertWordOptions,
  onProgress?: (percent: number) => void,
): Promise<WordFileResult> {
  const formData = new FormData();
  formData.append('files', file);

  if (options?.engine) {
    formData.append('engine', options.engine);
  }
  if (options?.ocr) {
    formData.append('ocr', 'true');
  }
  if (options?.ocr_lang) {
    formData.append('ocr_lang', options.ocr_lang);
  }

  const { data } = await api.post<ConvertPdfToWordResponse>('/pdf/pdf-to-word', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress?.(percent);
      }
    },
  });

  if (!data.success || !data.data || data.data.length === 0) {
    throw new Error(data.message || 'Failed to convert PDF to Word');
  }

  return data.data[0];
}

// Backward compatibility alias
export const convertPdfToWord = convertPdfToWordViaBackend;

export function downloadWordFile(result: WordFileResult) {
  if (result.file_base64) {
    const blob = base64ToDocxBlob(result.file_base64);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  if (result.download_url) {
    const a = document.createElement('a');
    a.href = result.download_url;
    a.download = result.file_name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export async function downloadAllWordAsZip(
  results: WordFileResult[],
  zipFileName = 'converted_word_documents.zip',
) {
  const zip = new JSZip();

  for (const res of results) {
    if (res.file_base64) {
      const blob = base64ToDocxBlob(res.file_base64);
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
  URL.revokeObjectURL(url);
}

export function extractAllTextFromPreviews(previews: WordParagraphPreview[]): string {
  if (!previews || previews.length === 0) return '';
  return previews
    .map((p) => {
      if (p.type === 'table' && p.table_data) {
        return p.table_data.map((row) => row.join('\t')).join('\n');
      }
      return p.text;
    })
    .join('\n\n');
}