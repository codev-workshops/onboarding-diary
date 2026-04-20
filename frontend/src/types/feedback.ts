export type FeedbackType = 'POSITIVE' | 'SUGGESTION' | 'CONCERN';

export interface FeedbackEntry {
  id: string;
  userId: string;
  date: string;
  subject: string;
  type: FeedbackType;
  details: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackRequest {
  date: string;
  subject: string;
  type: FeedbackType;
  details: string;
}

export interface UpdateFeedbackRequest extends CreateFeedbackRequest {}
