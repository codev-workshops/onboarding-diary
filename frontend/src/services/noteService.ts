import api from './api';
import { NoteEntry, CreateNoteRequest, UpdateNoteRequest } from '@/types/note';
import { PageResponse } from '@/types/common';

export const noteService = {
  create: (data: CreateNoteRequest) =>
    api.post<NoteEntry>('/notes', data).then((res) => res.data),

  list: (params?: { tag?: string; search?: string; page?: number; size?: number }) =>
    api.get<PageResponse<NoteEntry>>('/notes', { params }).then((res) => res.data),

  getById: (id: string) =>
    api.get<NoteEntry>(`/notes/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateNoteRequest) =>
    api.put<NoteEntry>(`/notes/${id}`, data).then((res) => res.data),

  delete: (id: string) =>
    api.delete<void>(`/notes/${id}`).then((res) => res.data),

  getTags: () =>
    api.get<string[]>('/notes/tags').then((res) => res.data),
};
