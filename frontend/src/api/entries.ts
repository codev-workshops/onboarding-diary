import { apiFetch } from './client';
import type {
  FeedbackRequest,
  FeedbackResponse,
  IssueRequest,
  IssueResponse,
  NoteRequest,
  NoteResponse,
  TaskRequest,
  TaskResponse,
} from './types';

function toQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/// CRUD helpers for one diary entry resource (tasks, issues, feedback, notes).
function entryApi<TRequest, TResponse>(resource: string) {
  return {
    list: (params: Record<string, string | undefined> = {}) =>
      apiFetch<TResponse[]>(`/api/${resource}${toQuery(params)}`),
    create: (body: TRequest) =>
      apiFetch<TResponse>(`/api/${resource}`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: TRequest) =>
      apiFetch<TResponse>(`/api/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: string) => apiFetch<void>(`/api/${resource}/${id}`, { method: 'DELETE' }),
  };
}

export const tasksApi = entryApi<TaskRequest, TaskResponse>('tasks');
export const issuesApi = entryApi<IssueRequest, IssueResponse>('issues');
export const feedbackApi = entryApi<FeedbackRequest, FeedbackResponse>('feedback');
export const notesApi = entryApi<NoteRequest, NoteResponse>('notes');
