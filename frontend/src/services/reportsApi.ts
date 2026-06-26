import api from './api';
import { ReportResponse, ReportFilters } from '@/types';

export async function getReportPreview(
  filters: ReportFilters
): Promise<ReportResponse> {
  const params: Record<string, string | number> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
  if (filters.category) params.category = filters.category;
  if (filters.userId) params.userId = filters.userId;

  const response = await api.get<ReportResponse>('/reports', { params });
  return response.data;
}

export async function downloadReport(
  filters: ReportFilters,
  format: 'pdf' | 'csv'
): Promise<Blob> {
  const params: Record<string, string | number> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    format,
  };
  if (filters.category) params.category = filters.category;
  if (filters.userId) params.userId = filters.userId;

  const response = await api.get('/reports/download', {
    params,
    responseType: 'blob',
  });
  return response.data;
}

export async function getRecruits(): Promise<
  { id: number; name: string; email: string }[]
> {
  const response = await api.get<{ id: number; name: string; email: string }[]>(
    '/reports/recruits'
  );
  return response.data;
}
