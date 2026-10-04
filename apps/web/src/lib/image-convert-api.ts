import { api } from '@/lib/api';
import JSZip from 'jszip';

export type SupportedImageFormat =
  | 'png'
  | 'jpg'
  | 'webp'
  | 'avif'
  | 'bmp'
  | 'tiff'
  | 'ico'
  | 'gif';

export interface ConvertImageOptions {
  target_format: SupportedImageFormat | string;
  quality?: number;
  background?: string;
  width?: number;
  height?: number;
  output_file_name?: string;
  remove_bg?: boolean;
}

export interface ConvertImageResult {
  file_name: string;
  original_format: string;
  converted_format: string;
  original_size: number;
  converted_size: number;
  saved_bytes: number;
  saved_percentage: number;
  original_width: number;
  original_height: number;
  converted_width: number;
  converted_height: number;
  mime_type: string;
  file_base64: string;
}

export interface ConvertImageResponse {
  success: boolean;
  message?: string;
  data: ConvertImageResult;
}

export interface RemoveBgOptions {
  model?: 'u2netp' | 'u2net';
  output_format?: 'png' | 'webp';
  output_file_name?: string;
}

export interface RemoveBgResult {
  file_name: string;
  original_format: string;
  converted_format: string;
  original_size: number;
  result_size: number;
  original_width: number;
  original_height: number;
  result_width: number;
  result_height: number;
  mime_type: string;
  file_base64: string;
}

export interface RemoveBgResponse {
  success: boolean;
  message?: string;
  data: RemoveBgResult;
}

export interface UpscaleOptions {
  scale?: 2 | 4;
  output_format?: 'png' | 'jpg' | 'webp';
  output_file_name?: string;
  file_base64?: string;
}

export interface UpscaleResult {
  file_name: string;
  original_format: string;
  converted_format: string;
  original_size: number;
  upscaled_size: number;
  original_width: number;
  original_height: number;
  upscaled_width: number;
  upscaled_height: number;
  scale_factor: number;
  mime_type: string;
  file_base64: string;
}

export interface UpscaleResponse {
  success: boolean;
  message?: string;
  data: UpscaleResult;
}

export function base64ToImageBlob(base64: string, mimeType: string = 'image/png'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export function downloadImageResult(result: ConvertImageResult): void {
  const blob = base64ToImageBlob(result.file_base64, result.mime_type);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.file_name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function convertImageViaBackend(
  file: File,
  options: ConvertImageOptions,
  onProgress?: (percent: number) => void,
): Promise<ConvertImageResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_format', options.target_format);

  if (options.quality !== undefined) {
    formData.append('quality', options.quality.toString());
  }

  if (options.background) {
    formData.append('background', options.background);
  }

  if (options.width !== undefined && options.width > 0) {
    formData.append('width', options.width.toString());
  }

  if (options.height !== undefined && options.height > 0) {
    formData.append('height', options.height.toString());
  }

  if (options.output_file_name) {
    formData.append('output_file_name', options.output_file_name);
  }

  if (options.remove_bg) {
    formData.append('remove_bg', 'true');
  }

  const response = await api.post<ConvertImageResponse>('/image/convert', formData, {
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
    throw new Error(response.data.message || 'Failed to convert image');
  }

  return response.data.data;
}

export async function removeBackgroundViaBackend(
  file: File,
  options: RemoveBgOptions = {},
  onProgress?: (percent: number) => void,
): Promise<RemoveBgResult> {
  const formData = new FormData();
  formData.append('file', file);

  if (options.model) {
    formData.append('model', options.model);
  }
  if (options.output_format) {
    formData.append('output_format', options.output_format);
  }
  if (options.output_file_name) {
    formData.append('output_file_name', options.output_file_name);
  }

  const response = await api.post<RemoveBgResponse>('/image/remove-bg', formData, {
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
    throw new Error(response.data.message || 'Failed to remove background');
  }

  return response.data.data;
}

export async function upscaleImageViaBackend(params: {
  file?: File;
  file_base64?: string;
  scale?: 2 | 4;
  output_format?: 'png' | 'jpg' | 'webp';
  output_file_name?: string;
  onProgress?: (percent: number) => void;
}): Promise<UpscaleResult> {
  if (params.file) {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.scale) formData.append('scale', params.scale.toString());
    if (params.output_format) formData.append('output_format', params.output_format);
    if (params.output_file_name) formData.append('output_file_name', params.output_file_name);

    const response = await api.post<UpscaleResponse>('/image/upscale', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && params.onProgress) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          params.onProgress(percent);
        }
      },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to upscale image');
    }

    return response.data.data;
  }

  // Base64 direct post (e.g. for already converted images in queue)
  const response = await api.post<UpscaleResponse>('/image/upscale', {
    file_base64: params.file_base64,
    scale: params.scale || 2,
    output_format: params.output_format || 'png',
    output_file_name: params.output_file_name,
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to upscale image');
  }

  return response.data.data;
}

export async function downloadAllImagesAsZip(
  results: ConvertImageResult[],
  zipFileName: string = 'converted_images.zip',
): Promise<void> {
  const zip = new JSZip();
  for (const res of results) {
    if (res.file_base64) {
      const blob = base64ToImageBlob(res.file_base64, res.mime_type);
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
