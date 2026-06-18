import { apiClient } from "./client";
import type {
  IssueFilters,
  IssueInput,
  IssueResponse,
  PagedResponse,
} from "./types";

function toParams(filters: IssueFilters, page: number, size: number) {
  const params: Record<string, string | number> = { page, size };
  if (filters.status) params.status = filters.status;
  if (filters.severity) params.severity = filters.severity;
  if (filters.ownerId != null) params.ownerId = filters.ownerId;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.search) params.search = filters.search;
  return params;
}

export const issuesApi = {
  list: async (filters: IssueFilters = {}, page = 0, size = 20) => {
    const { data } = await apiClient.get<PagedResponse<IssueResponse>>("/issues", {
      params: toParams(filters, page, size),
    });
    return data;
  },
  get: async (id: number) => {
    const { data } = await apiClient.get<IssueResponse>(`/issues/${id}`);
    return data;
  },
  create: async (input: IssueInput) => {
    const { data } = await apiClient.post<IssueResponse>("/issues", input);
    return data;
  },
  update: async (id: number, input: IssueInput) => {
    const { data } = await apiClient.put<IssueResponse>(`/issues/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await apiClient.delete(`/issues/${id}`);
  },
};
