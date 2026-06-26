import axios from 'axios';
import {
  PaginatedResponse,
  IssueEntry,
  CreateIssueRequest,
  UpdateIssueRequest,
  IssueFilters,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5096/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint = requestUrl.includes('/auth/');
      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const issueApi = {
  getIssues: (filters: IssueFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.status) params.append('status', filters.status);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.userId) params.append('userId', String(filters.userId));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    return api.get<PaginatedResponse<IssueEntry>>(`/issues?${params.toString()}`);
  },
  getIssue: (id: number) => api.get<IssueEntry>(`/issues/${id}`),
  createIssue: (data: CreateIssueRequest) => api.post<IssueEntry>('/issues', data),
  updateIssue: (id: number, data: UpdateIssueRequest) => api.put<IssueEntry>(`/issues/${id}`, data),
  deleteIssue: (id: number) => api.delete(`/issues/${id}`),
};

export default api;
