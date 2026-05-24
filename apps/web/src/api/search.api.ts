import type { PaginatedResponse, SearchResultItem } from '@onboarding-diary/shared';
import { apiClient } from './client';

export interface SearchParams {
  q: string;
  types?: string;
  page?: number;
  limit?: number;
  from_date?: string;
  to_date?: string;
  sort_by?: 'relevance' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export const searchApi = {
  async search(params: SearchParams): Promise<PaginatedResponse<SearchResultItem>> {
    const { data } = await apiClient.get<PaginatedResponse<SearchResultItem>>('/search', { params });
    return data;
  },
};
