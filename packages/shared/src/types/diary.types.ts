import type { Visibility } from '../enums';

export interface TagDto {
  id: string;
  name: string;
  slug: string;
}

export interface AttachmentDto {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface DiaryEntryDto {
  id: string;
  user_id: string;
  title: string;
  body: string;
  mood_rating: number;
  entry_date: string;
  visibility: Visibility;
  tags: TagDto[];
  attachments: AttachmentDto[];
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntryListItemDto {
  id: string;
  title: string;
  mood_rating: number;
  entry_date: string;
  visibility: Visibility;
  tags: TagDto[];
  comment_count: number;
  created_at: string;
}

export interface CreateDiaryEntryInput {
  title: string;
  body: string;
  mood_rating: number;
  entry_date: string;
  visibility: Visibility;
  tags?: string[];
}

export interface UpdateDiaryEntryInput {
  title?: string;
  body?: string;
  mood_rating?: number;
  visibility?: Visibility;
  tags?: string[];
}

export interface DiaryEntryListParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  mood_min?: number;
  mood_max?: number;
  tag?: string;
  visibility?: Visibility;
  from_date?: string;
  to_date?: string;
  q?: string;
}
