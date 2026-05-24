export interface CommentAuthorDto {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url: string | null;
}

export interface CommentDto {
  id: string;
  diary_entry_id: string;
  body: string;
  author: CommentAuthorDto;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentInput {
  body: string;
}

export interface UpdateCommentInput {
  body: string;
}
