import { apiClient } from "./client";
import type {
  PagedResponse,
  TaskFilters,
  TaskInput,
  TaskResponse,
} from "./types";

function toParams(filters: TaskFilters, page: number, size: number) {
  const params: Record<string, string | number> = { page, size };
  if (filters.status) params.status = filters.status;
  if (filters.category) params.category = filters.category;
  if (filters.priority) params.priority = filters.priority;
  if (filters.ownerId != null) params.ownerId = filters.ownerId;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.search) params.search = filters.search;
  return params;
}

export const tasksApi = {
  list: async (filters: TaskFilters = {}, page = 0, size = 20) => {
    const { data } = await apiClient.get<PagedResponse<TaskResponse>>("/tasks", {
      params: toParams(filters, page, size),
    });
    return data;
  },
  get: async (id: number) => {
    const { data } = await apiClient.get<TaskResponse>(`/tasks/${id}`);
    return data;
  },
  create: async (input: TaskInput) => {
    const { data } = await apiClient.post<TaskResponse>("/tasks", input);
    return data;
  },
  update: async (id: number, input: TaskInput) => {
    const { data } = await apiClient.put<TaskResponse>(`/tasks/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await apiClient.delete(`/tasks/${id}`);
  },
};
