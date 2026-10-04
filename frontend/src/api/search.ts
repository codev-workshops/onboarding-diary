import { apiClient } from './client';
import type { RecentEntryType } from './dashboard';

export type SearchScope = 'SELF' | 'TEAM';

export interface SearchHit {
  type: RecentEntryType;
  id: number;
  ownerId: number;
  ownerName: string | null;
  entryDate: string;
  title: string;
  snippet: string | null;
  status: string | null;
}

export interface SearchResults {
  query: string;
  scope: SearchScope;
  groups: { type: RecentEntryType; total: number; hits: SearchHit[] }[];
}

export const MIN_SEARCH_LENGTH = 2;

export async function searchEntries(q: string, scope: SearchScope): Promise<SearchResults> {
  const { data } = await apiClient.get<SearchResults>('/search', { params: { q, scope } });
  return data;
}
