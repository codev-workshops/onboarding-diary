import type { IssueSeverity, IssueStatus, Priority, TaskStatus, Visibility } from '../enums';

export interface TaskEntryDto {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  visibility: Visibility;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTaskEntryInput {
  title: string;
  description?: string;
  priority?: Priority;
  due_date?: string;
  visibility?: Visibility;
  tags?: string[];
}

export interface UpdateTaskEntryInput {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: TaskStatus;
  due_date?: string;
  visibility?: Visibility;
  tags?: string[];
}

export interface NoteEntryDto {
  id: string;
  user_id: string;
  title: string;
  body: string;
  mood_rating: number | null;
  entry_date: string;
  visibility: Visibility;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateNoteEntryInput {
  title: string;
  body: string;
  mood_rating?: number;
  entry_date: string;
  visibility?: Visibility;
  tags?: string[];
}

export interface UpdateNoteEntryInput {
  title?: string;
  body?: string;
  mood_rating?: number;
  visibility?: Visibility;
  tags?: string[];
}

export interface IssueEntryDto {
  id: string;
  user_id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  visibility: Visibility;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateIssueEntryInput {
  title: string;
  description: string;
  severity?: IssueSeverity;
  visibility?: Visibility;
  tags?: string[];
}

export interface UpdateIssueEntryInput {
  title?: string;
  description?: string;
  severity?: IssueSeverity;
  status?: IssueStatus;
  resolution_note?: string;
  visibility?: Visibility;
  tags?: string[];
}

export interface DiaryListParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  status?: TaskStatus;
  priority?: Priority;
  visibility?: Visibility;
  from_date?: string;
  to_date?: string;
  q?: string;
}
