import type { PaginatedResponse, ApiResponse } from '@onboarding-diary/shared';
import { apiClient } from './client';

export interface FeedbackEntryDto {
  id: string;
  author_id: string;
  subject_id: string;
  title: string;
  body: string;
  type: string;
  rating: number | null;
  author: { id: string; first_name: string; last_name: string; email: string };
  subject: { id: string; first_name: string; last_name: string; email: string };
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackInput {
  subject_id: string;
  title: string;
  body: string;
  type?: string;
  rating?: number;
}

export interface UpdateFeedbackInput {
  title?: string;
  body?: string;
  type?: string;
  rating?: number;
}

export const feedbackApi = {
  async list(params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<FeedbackEntryDto>> {
    const { data } = await apiClient.get<PaginatedResponse<FeedbackEntryDto>>('/feedback', { params });
    return data;
  },

  async getById(id: string): Promise<FeedbackEntryDto> {
    const { data } = await apiClient.get<ApiResponse<FeedbackEntryDto>>(`/feedback/${id}`);
    return data.data;
  },

  async create(input: CreateFeedbackInput): Promise<FeedbackEntryDto> {
    const { data } = await apiClient.post<ApiResponse<FeedbackEntryDto>>('/feedback', input);
    return data.data;
  },

  async update(id: string, input: UpdateFeedbackInput): Promise<FeedbackEntryDto> {
    const { data } = await apiClient.patch<ApiResponse<FeedbackEntryDto>>(`/feedback/${id}`, input);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/feedback/${id}`);
  },
};
