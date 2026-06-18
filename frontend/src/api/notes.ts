import { apiClient } from "./client";
import type { NoteFilters, NoteInput, NoteResponse, PagedResponse } from "./types";

function toParams(filters: NoteFilters, page: number, size: number) {
  const params: Record<string, string | number | string[]> = { page, size };
  if (filters.tags && filters.tags.length > 0) params.tags = filters.tags;
  if (filters.ownerId != null) params.ownerId = filters.ownerId;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.search) params.search = filters.search;
  return params;
}

export const notesApi = {
  list: async (filters: NoteFilters = {}, page = 0, size = 20) => {
    const { data } = await apiClient.get<PagedResponse<NoteResponse>>("/notes", {
      params: toParams(filters, page, size),
      paramsSerializer: { indexes: null },
    });
    return data;
  },
  get: async (id: number) => {
    const { data } = await apiClient.get<NoteResponse>(`/notes/${id}`);
    return data;
  },
  create: async (input: NoteInput) => {
    const { data } = await apiClient.post<NoteResponse>("/notes", input);
    return data;
  },
  update: async (id: number, input: NoteInput) => {
    const { data } = await apiClient.put<NoteResponse>(`/notes/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await apiClient.delete(`/notes/${id}`);
  },
};
