import api from './api';
import { IssueEntry, CreateIssueRequest, UpdateIssueRequest } from '@/types/issue';
import { PageResponse } from '@/types/common';

export const issueService = {
  create: (data: CreateIssueRequest) =>
    api.post<IssueEntry>('/issues', data).then((res) => res.data),

  list: (params?: { status?: string; severity?: string; page?: number; size?: number }) =>
    api.get<PageResponse<IssueEntry>>('/issues', { params }).then((res) => res.data),

  getById: (id: string) =>
    api.get<IssueEntry>(`/issues/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateIssueRequest) =>
    api.put<IssueEntry>(`/issues/${id}`, data).then((res) => res.data),

  delete: (id: string) =>
    api.delete<void>(`/issues/${id}`).then((res) => res.data),

  listForUser: (userId: string, params?: { page?: number; size?: number }) =>
    api.get<PageResponse<IssueEntry>>(`/issues/user/${userId}`, { params }).then((res) => res.data),
};
