import api from './api';

export interface ReportRequest {
  dateFrom: string;
  dateTo: string;
  categories: string[];
  format: 'PDF' | 'CSV' | 'EXCEL';
}

export interface ReportMeta {
  id: string;
  fileName: string;
  format: string;
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
}

export const reportService = {
  generate: (data: ReportRequest) =>
    api.post<ReportMeta>('/reports/generate', data).then((res) => res.data),

  download: (reportId: string) =>
    api.get(`/reports/${reportId}/download`, { responseType: 'blob' }).then((res) => res.data),

  listReports: (params?: { page?: number; size?: number }) =>
    api.get<ReportMeta[]>('/reports', { params }).then((res) => res.data),
};
