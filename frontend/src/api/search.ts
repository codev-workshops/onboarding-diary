import { apiClient } from "./client";

export type SearchEntityType = "TASK" | "ISSUE" | "FEEDBACK" | "NOTE";
export type SearchSort = "RELEVANCE" | "DATE";

export interface SearchResult {
  type: SearchEntityType;
  id: number;
  ownerId: number;
  title: string;
  snippet: string;
  date: string;
  occurredAt: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

export interface SearchParams {
  q: string;
  types?: SearchEntityType[];
  sort?: SearchSort;
}

export const searchApi = {
  query: async (params: SearchParams): Promise<SearchResponse> => {
    const query: Record<string, string | string[]> = { q: params.q };
    if (params.types && params.types.length > 0) {
      query.types = params.types;
    }
    if (params.sort) {
      query.sort = params.sort;
    }
    const { data } = await apiClient.get<SearchResponse>("/search", {
      params: query,
      paramsSerializer: { indexes: null },
    });
    return data;
  },
};
