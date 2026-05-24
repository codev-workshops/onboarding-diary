import type { PaginatedResponse, ApiResponse } from '@onboarding-diary/shared';
import { apiClient } from './client';

export interface IssueEntryDto {
  id: string;
  user_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  visibility: string;
  resolution_note: string | null;
  resolved_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateIssueInput {
  title: string;
  description: string;
  severity?: string;
  status?: string;
  visibility?: string;
  tags?: string[];
}

export interface UpdateIssueInput extends Partial<CreateIssueInput> {
  resolution_note?: string;
}

export const issuesApi = {
  async list(params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<IssueEntryDto>> {
    const { data } = await apiClient.get<PaginatedResponse<IssueEntryDto>>('/issues', { params });
    return data;
  },

  async getById(id: string): Promise<IssueEntryDto> {
    const { data } = await apiClient.get<ApiResponse<IssueEntryDto>>(`/issues/${id}`);
    return data.data;
  },

  async create(input: CreateIssueInput): Promise<IssueEntryDto> {
    const { data } = await apiClient.post<ApiResponse<IssueEntryDto>>('/issues', input);
    return data.data;
  },

  async update(id: string, input: UpdateIssueInput): Promise<IssueEntryDto> {
    const { data } = await apiClient.patch<ApiResponse<IssueEntryDto>>(`/issues/${id}`, input);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/issues/${id}`);
  },
};
