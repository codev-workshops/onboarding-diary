export type FeedbackType = 'POSITIVE' | 'SUGGESTION' | 'CONCERN';

export type FeedbackSource = 'MEETING' | 'EMAIL' | 'SLACK' | 'ONE_ON_ONE' | 'SURVEY' | 'OTHER';

export interface FeedbackEntry {
  id: string;
  userId: string;
  date: string;
  subject: string;
  type: FeedbackType;
  details: string;
  source: FeedbackSource;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackRequest {
  date: string;
  subject: string;
  type: FeedbackType;
  details: string;
  source?: FeedbackSource;
}

export interface UpdateFeedbackRequest extends CreateFeedbackRequest {}
