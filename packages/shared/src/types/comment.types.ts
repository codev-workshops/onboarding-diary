import type { FeedbackType } from '../enums';

export interface FeedbackEntryDto {
  id: string;
  author_id: string;
  subject_id: string;
  type: FeedbackType;
  title: string;
  body: string;
  rating: number | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  subject?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface CreateFeedbackInput {
  subject_id: string;
  type: FeedbackType;
  title: string;
  body: string;
  rating?: number;
}

export interface UpdateFeedbackInput {
  type?: FeedbackType;
  title?: string;
  body?: string;
  rating?: number;
}
