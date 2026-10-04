import { apiClient } from './client';
import type { DiaryResource, Page, Task, TaskStatus } from './diaryTypes';

export const PAGE_SIZE = 20;

/** Query values; arrays are sent comma-separated, which Spring binds to multi-valued params. */
export type ListParams = Record<string, string | number | string[] | undefined>;

function toQuery(params: ListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) query[key] = value.join(',');
    } else {
      query[key] = value;
    }
  }
  return query;
}

export async function listEntries<T>(
  resource: DiaryResource,
  params: ListParams,
): Promise<Page<T>> {
  const { data } = await apiClient.get<Page<T>>(`/${resource}`, { params: toQuery(params) });
  return data;
}

export async function createEntry<T, R>(resource: DiaryResource, body: R): Promise<T> {
  const { data } = await apiClient.post<T>(`/${resource}`, body);
  return data;
}

export async function updateEntry<T, R>(resource: DiaryResource, id: number, body: R): Promise<T> {
  const { data } = await apiClient.put<T>(`/${resource}/${id}`, body);
  return data;
}

export async function deleteEntry(resource: DiaryResource, id: number): Promise<void> {
  await apiClient.delete(`/${resource}/${id}`);
}

export async function changeTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${id}/status`, { status });
  return data;
}

export async function fetchNoteTags(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/notes/tags');
  return data;
}
