import { apiRequest } from './client';
import type { Paged } from './tasks';
import { queryString } from './tasks';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type IssueStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export type FeedbackType = 'Positive' | 'Suggestion' | 'Concern' | 'Question';

export const issueSeverities: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

export const issueStatuses: IssueStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed'];

export const feedbackTypes: FeedbackType[] = ['Positive', 'Suggestion', 'Concern', 'Question'];

export const issueStatusLabels: Record<IssueStatus, string> = {
  Open: 'Open',
  InProgress: 'In progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

/** Mirrors the backend state machine so the UI only offers reachable statuses. */
const allowedTransitions: Record<IssueStatus, IssueStatus[]> = {
  Open: ['Open', 'InProgress', 'Resolved'],
  InProgress: ['InProgress', 'Open', 'Resolved'],
  Resolved: ['Resolved', 'Closed', 'Open'],
  Closed: ['Closed', 'Open'],
};

export const nextStatuses = (status: IssueStatus): IssueStatus[] => allowedTransitions[status];

export const requiresResolutionNotes = (status: IssueStatus): boolean =>
  status === 'Resolved' || status === 'Closed';

export interface Issue {
  id: number;
  userId: number;
  entryDate: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueCreatePayload {
  entryDate: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
}

export interface IssueUpdatePayload extends IssueCreatePayload {
  status: IssueStatus;
  resolutionNotes: string | null;
}

export interface IssueFilters {
  from?: string;
  to?: string;
  severity?: IssueSeverity | '';
  status?: IssueStatus | '';
  q?: string;
  page?: number;
  pageSize?: number;
}

export const listIssues = (filters: IssueFilters) =>
  apiRequest<Paged<Issue>>(`/issues${queryString(filters)}`);

export const createIssue = (payload: IssueCreatePayload) =>
  apiRequest<Issue>('/issues', { method: 'POST', body: payload });

export const updateIssue = (id: number, payload: IssueUpdatePayload) =>
  apiRequest<Issue>(`/issues/${id}`, { method: 'PATCH', body: payload });

export const deleteIssue = (id: number) => apiRequest<void>(`/issues/${id}`, { method: 'DELETE' });

export interface Feedback {
  id: number;
  userId: number;
  entryDate: string;
  title: string;
  message: string;
  type: FeedbackType;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackPayload {
  entryDate: string;
  title: string;
  message: string;
  type: FeedbackType;
}

export interface FeedbackFilters {
  from?: string;
  to?: string;
  type?: FeedbackType | '';
  q?: string;
  page?: number;
  pageSize?: number;
}

export const listFeedback = (filters: FeedbackFilters) =>
  apiRequest<Paged<Feedback>>(`/feedback${queryString(filters)}`);

export const createFeedback = (payload: FeedbackPayload) =>
  apiRequest<Feedback>('/feedback', { method: 'POST', body: payload });

export const updateFeedback = (id: number, payload: FeedbackPayload) =>
  apiRequest<Feedback>(`/feedback/${id}`, { method: 'PATCH', body: payload });

export const deleteFeedback = (id: number) =>
  apiRequest<void>(`/feedback/${id}`, { method: 'DELETE' });

export interface Note {
  id: number;
  userId: number;
  entryDate: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotePayload {
  entryDate: string;
  title: string;
  content: string;
  tags: string[];
}

export interface NoteFilters {
  from?: string;
  to?: string;
  tag?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const listNotes = (filters: NoteFilters) =>
  apiRequest<Paged<Note>>(`/notes${queryString(filters)}`);

export const createNote = (payload: NotePayload) =>
  apiRequest<Note>('/notes', { method: 'POST', body: payload });

export const updateNote = (id: number, payload: NotePayload) =>
  apiRequest<Note>(`/notes/${id}`, { method: 'PATCH', body: payload });

export const deleteNote = (id: number) => apiRequest<void>(`/notes/${id}`, { method: 'DELETE' });

/** Accepts the comma or space separated text the tag input collects. */
export const parseTags = (input: string): string[] => [
  ...new Set(
    input
      .split(/[,\n]/)
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
  ),
];
