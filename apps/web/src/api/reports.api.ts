import type { PaginatedResponse, ApiResponse, ReportDto } from '@onboarding-diary/shared';
import { apiClient } from './client';

export interface CreateReportInput {
  recruit_id: string;
  type: string;
  content_type: string;
  title: string;
  summary?: string;
  period_start: string;
  period_end: string;
}

export const reportsApi = {
  async list(params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<ReportDto>> {
    const { data } = await apiClient.get<PaginatedResponse<ReportDto>>('/reports', { params });
    return data;
  },

  async getById(id: string): Promise<ReportDto> {
    const { data } = await apiClient.get<ApiResponse<ReportDto>>(`/reports/${id}`);
    return data.data;
  },

  async generate(input: CreateReportInput): Promise<ReportDto> {
    const { data } = await apiClient.post<ApiResponse<ReportDto>>('/reports', input);
    return data.data;
  },

  async update(id: string, input: { title?: string; summary?: string; status?: string }): Promise<ReportDto> {
    const { data } = await apiClient.patch<ApiResponse<ReportDto>>(`/reports/${id}`, input);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/reports/${id}`);
  },

  async download(id: string, format: 'PDF' | 'CSV'): Promise<Blob> {
    const { data } = await apiClient.get(`/reports/${id}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return data as Blob;
  },
};
