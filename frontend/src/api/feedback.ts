import { apiClient } from "./client";
import type {
  FeedbackFilters,
  FeedbackInput,
  FeedbackResponse,
  PagedResponse,
} from "./types";

function toParams(filters: FeedbackFilters, page: number, size: number) {
  const params: Record<string, string | number> = { page, size };
  if (filters.type) params.type = filters.type;
  if (filters.ownerId != null) params.ownerId = filters.ownerId;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.search) params.search = filters.search;
  return params;
}

export const feedbackApi = {
  list: async (filters: FeedbackFilters = {}, page = 0, size = 20) => {
    const { data } = await apiClient.get<PagedResponse<FeedbackResponse>>("/feedback", {
      params: toParams(filters, page, size),
    });
    return data;
  },
  get: async (id: number) => {
    const { data } = await apiClient.get<FeedbackResponse>(`/feedback/${id}`);
    return data;
  },
  create: async (input: FeedbackInput) => {
    const { data } = await apiClient.post<FeedbackResponse>("/feedback", input);
    return data;
  },
  update: async (id: number, input: FeedbackInput) => {
    const { data } = await apiClient.put<FeedbackResponse>(`/feedback/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await apiClient.delete(`/feedback/${id}`);
  },
};
