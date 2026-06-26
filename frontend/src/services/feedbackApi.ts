import api from './api';
import {
  FeedbackEntry,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  PaginatedResponse,
  FeedbackType,
} from '@/types';

export interface FeedbackQueryParams {
  dateFrom?: string;
  dateTo?: string;
  type?: FeedbackType;
  userId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const feedbackApi = {
  getAll: async (params: FeedbackQueryParams = {}): Promise<PaginatedResponse<FeedbackEntry>> => {
    const response = await api.get<PaginatedResponse<FeedbackEntry>>('/feedback', { params });
    return response.data;
  },

  getById: async (id: number): Promise<FeedbackEntry> => {
    const response = await api.get<FeedbackEntry>(`/feedback/${id}`);
    return response.data;
  },

  create: async (data: CreateFeedbackRequest): Promise<FeedbackEntry> => {
    const response = await api.post<FeedbackEntry>('/feedback', data);
    return response.data;
  },

  update: async (id: number, data: UpdateFeedbackRequest): Promise<FeedbackEntry> => {
    const response = await api.put<FeedbackEntry>(`/feedback/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/feedback/${id}`);
  },
};
