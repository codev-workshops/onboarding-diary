import apiClient from './client'

export interface SearchResult {
  id: string
  type: 'TASK' | 'ISSUE' | 'FEEDBACK' | 'NOTE'
  title: string
  description: string | null
  date: string
  highlight: string
}

export interface SearchData {
  results: SearchResult[]
  totalResults: number
}

export const searchApi = {
  search: (query: string) =>
    apiClient.get<SearchData>('/search', { params: { q: query } }),

  searchForUser: (userId: string, query: string) =>
    apiClient.get<SearchData>(`/search/user/${userId}`, { params: { q: query } }),
}
