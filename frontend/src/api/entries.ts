import apiClient from './client';
import type { DiaryEntry, DiaryEntryRequest } from '../types';

export async function getEntries(): Promise<DiaryEntry[]> {
  const { data } = await apiClient.get<DiaryEntry[]>('/entries');
  return data;
}

export async function getEntry(id: number): Promise<DiaryEntry> {
  const { data } = await apiClient.get<DiaryEntry>(`/entries/${id}`);
  return data;
}

export async function createEntry(request: DiaryEntryRequest): Promise<DiaryEntry> {
  const { data } = await apiClient.post<DiaryEntry>('/entries', request);
  return data;
}

export async function updateEntry(id: number, request: DiaryEntryRequest): Promise<DiaryEntry> {
  const { data } = await apiClient.put<DiaryEntry>(`/entries/${id}`, request);
  return data;
}

export async function deleteEntry(id: number): Promise<void> {
  await apiClient.delete(`/entries/${id}`);
}
