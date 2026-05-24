import type { PaginatedResponse, ApiResponse } from '@onboarding-diary/shared';
import { apiClient } from './client';

export interface NoteEntryDto {
  id: string;
  user_id: string;
  title: string;
  body: string;
  visibility: string;
  mood_rating: number | null;
  entry_date: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  title: string;
  body: string;
  visibility?: string;
  mood_rating?: number;
  entry_date?: string;
  tags?: string[];
}

export interface UpdateNoteInput extends Partial<CreateNoteInput> {}

export const notesApi = {
  async list(params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<NoteEntryDto>> {
    const { data } = await apiClient.get<PaginatedResponse<NoteEntryDto>>('/notes', { params });
    return data;
  },

  async getById(id: string): Promise<NoteEntryDto> {
    const { data } = await apiClient.get<ApiResponse<NoteEntryDto>>(`/notes/${id}`);
    return data.data;
  },

  async create(input: CreateNoteInput): Promise<NoteEntryDto> {
    const { data } = await apiClient.post<ApiResponse<NoteEntryDto>>('/notes', input);
    return data.data;
  },

  async update(id: string, input: UpdateNoteInput): Promise<NoteEntryDto> {
    const { data } = await apiClient.patch<ApiResponse<NoteEntryDto>>(`/notes/${id}`, input);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/notes/${id}`);
  },
};
