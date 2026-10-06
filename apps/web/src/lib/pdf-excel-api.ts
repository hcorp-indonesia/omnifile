import { api } from '@/lib/api';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

export interface SheetPreview {
  sheet_name: string;
  page_number: number;
  row_count: number;
  column_count: number;
  rows: string[][];
}

export interface ExcelConversionResult {
  original_name: string;
  file_name: string;
  total_pages: number;
  total_sheets: number;
  total_rows: number;
  file_size: number;
  download_url?: string;
  engine: 'pdf.co' | 'local';
  file_base64: string;
  sheets: SheetPreview[];
}

export interface ConvertPdfToExcelResponse {
  success: boolean;
  message: string;
  data: ExcelConversionResult[];
}

export interface PdfTemplateColumn {
  header: string;
  aliases: string[];
}

export interface PdfTemplate {
  name: string;
  columns: PdfTemplateColumn[];
}

export async function convertPdfToExcelViaBackend(
  file: File,
  template?: PdfTemplate,
  onProgress?: (percent: number) => void,
): Promise<ExcelConversionResult> {
  const formData = new FormData();
  formData.append('files', file);
  if (template && template.columns.length > 0) {
    formData.append('template', JSON.stringify(template));
  }

  const { data } = await api.post<ConvertPdfToExcelResponse>('/pdf/pdf-to-excel', formData, {
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
    throw new Error(data.message || 'Failed to convert PDF to Excel');
  }

  return data.data[0];
}

export function base64ToBlob(
  base64: string,
  contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

export function downloadExcelFile(result: ExcelConversionResult) {
  if (result.file_base64) {
    const blob = base64ToBlob(result.file_base64);
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

export async function downloadEditedExcelFile(
  sheets: SheetPreview[],
  fileName: string,
) {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.sheet_name.slice(0, 31));
    for (const row of sheet.rows) {
      worksheet.addRow(row);
    }
  }

  const bytes = await workbook.xlsx.writeBuffer();
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function downloadAllExcelAsZip(
  results: ExcelConversionResult[],
  zipFileName = 'converted_excel_spreadsheets.zip',
) {
  const zip = new JSZip();

  for (const res of results) {
    if (res.file_base64) {
      const blob = base64ToBlob(res.file_base64);
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
