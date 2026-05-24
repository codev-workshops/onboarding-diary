import type { FeedbackType, IssueSeverity, IssueStatus, Priority, TaskStatus, Visibility } from '../enums';

export type SearchEntityType = 'task' | 'issue' | 'feedback' | 'note';

export interface SearchHighlight {
  field: string;
  snippet: string;
}

export interface SearchResultItem {
  id: string;
  type: SearchEntityType;
  title: string;
  body: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  highlights: SearchHighlight[];
  // Entity-specific metadata
  meta: TaskSearchMeta | IssueSearchMeta | FeedbackSearchMeta | NoteSearchMeta;
}

export interface TaskSearchMeta {
  type: 'task';
  status: TaskStatus;
  priority: Priority;
  visibility: Visibility;
  tags: string[];
  due_date: string | null;
}

export interface IssueSearchMeta {
  type: 'issue';
  status: IssueStatus;
  severity: IssueSeverity;
  visibility: Visibility;
  tags: string[];
}

export interface FeedbackSearchMeta {
  type: 'feedback';
  feedback_type: FeedbackType;
  rating: number | null;
  author_id: string;
  subject_id: string;
}

export interface NoteSearchMeta {
  type: 'note';
  visibility: Visibility;
  mood_rating: number | null;
  entry_date: string;
  tags: string[];
}

export interface GlobalSearchParams {
  q: string;
  types?: SearchEntityType[];
  page?: number;
  limit?: number;
  from_date?: string;
  to_date?: string;
  sort_by?: 'relevance' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}
