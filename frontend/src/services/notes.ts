import api from './api';
import {
  NoteResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
  PaginatedResponse,
} from '@/types';

export interface NotesQueryParams {
  dateFrom?: string;
  dateTo?: string;
  tags?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

export async function getNotes(params: NotesQueryParams = {}): Promise<PaginatedResponse<NoteResponse>> {
  const response = await api.get<PaginatedResponse<NoteResponse>>('/notes', { params });
  return response.data;
}

export async function getNoteById(id: number): Promise<NoteResponse> {
  const response = await api.get<NoteResponse>(`/notes/${id}`);
  return response.data;
}

export async function createNote(data: CreateNoteRequest): Promise<NoteResponse> {
  const response = await api.post<NoteResponse>('/notes', data);
  return response.data;
}

export async function updateNote(id: number, data: UpdateNoteRequest): Promise<NoteResponse> {
  const response = await api.put<NoteResponse>(`/notes/${id}`, data);
  return response.data;
}

export async function deleteNote(id: number): Promise<void> {
  await api.delete(`/notes/${id}`);
}
