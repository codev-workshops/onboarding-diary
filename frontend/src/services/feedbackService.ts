import api from './api';
import { FeedbackEntry, CreateFeedbackRequest, UpdateFeedbackRequest } from '@/types/feedback';
import { PageResponse } from '@/types/common';

export const feedbackService = {
  create: (data: CreateFeedbackRequest) =>
    api.post<FeedbackEntry>('/feedback', data).then((res) => res.data),

  list: (params?: { type?: string; source?: string; page?: number; size?: number }) =>
    api.get<PageResponse<FeedbackEntry>>('/feedback', { params }).then((res) => res.data),

  getById: (id: string) =>
    api.get<FeedbackEntry>(`/feedback/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateFeedbackRequest) =>
    api.put<FeedbackEntry>(`/feedback/${id}`, data).then((res) => res.data),

  delete: (id: string) =>
    api.delete<void>(`/feedback/${id}`).then((res) => res.data),

  listForUser: (userId: string, params?: { page?: number; size?: number }) =>
    api.get<PageResponse<FeedbackEntry>>(`/feedback/user/${userId}`, { params }).then((res) => res.data),
};
