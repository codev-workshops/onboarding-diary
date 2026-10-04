import axios from 'axios';
import { apiClient } from './client';

export const REPORT_TYPES = ['TASKS', 'ISSUES', 'FEEDBACK', 'COMBINED'] as const;
export const REPORT_FORMATS = ['PDF', 'CSV'] as const;
export const REPORT_SCOPES = ['SELF', 'TEAM', 'ALL'] as const;

export type ReportType = (typeof REPORT_TYPES)[number];
export type ReportFormat = (typeof REPORT_FORMATS)[number];
export type ReportScope = (typeof REPORT_SCOPES)[number];

export interface ReportParams {
  type: ReportType;
  from: string;
  to: string;
  scope: ReportScope;
  userId?: number;
}

export interface ReportPreview {
  type: ReportType;
  scope: ReportScope;
  from: string;
  to: string;
  subjects: { id: number; fullName: string; email: string }[];
  counts: Record<string, number>;
  totalRows: number;
  columns: { key: string; label: string }[];
  rows: (string | null)[][];
}

export async function previewReport(params: ReportParams): Promise<ReportPreview> {
  const { data } = await apiClient.get<ReportPreview>('/reports/preview', { params });
  return data;
}

/** Turns a JSON problem returned for a blob request back into a readable error body. */
async function unwrapBlobError(error: unknown): Promise<never> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      error.response.data = JSON.parse(await error.response.data.text());
    } catch {
      // keep the original error
    }
  }
  throw error;
}

function fileNameFrom(disposition: string | undefined, fallback: string): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback;
}

export async function downloadReport(
  params: ReportParams & { format: ReportFormat },
  onProgress?: (loadedBytes: number) => void,
): Promise<{ blob: Blob; fileName: string }> {
  try {
    const response = await apiClient.get<Blob>('/reports/download', {
      params,
      responseType: 'blob',
      onDownloadProgress: (event) => onProgress?.(event.loaded),
    });
    const fallback = `onboarding-report.${params.format.toLowerCase()}`;
    return {
      blob: response.data,
      fileName: fileNameFrom(response.headers['content-disposition'] as string, fallback),
    };
  } catch (error) {
    return unwrapBlobError(error);
  }
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
