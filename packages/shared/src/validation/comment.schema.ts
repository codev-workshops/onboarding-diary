import { z } from 'zod';
import { FEEDBACK, PAGINATION } from '../constants';
import { FeedbackType } from '../enums';

export const createFeedbackSchema = z.object({
  subject_id: z.string().uuid('Subject must be a valid user ID'),
  type: z.nativeEnum(FeedbackType).default(FeedbackType.NEUTRAL),
  title: z.string().min(FEEDBACK.TITLE_MIN_LENGTH).max(FEEDBACK.TITLE_MAX_LENGTH),
  body: z.string().min(FEEDBACK.BODY_MIN_LENGTH).max(FEEDBACK.BODY_MAX_LENGTH),
  rating: z.number().int().min(FEEDBACK.RATING_MIN).max(FEEDBACK.RATING_MAX).optional(),
});

export const updateFeedbackSchema = z.object({
  type: z.nativeEnum(FeedbackType).optional(),
  title: z.string().min(FEEDBACK.TITLE_MIN_LENGTH).max(FEEDBACK.TITLE_MAX_LENGTH).optional(),
  body: z.string().min(FEEDBACK.BODY_MIN_LENGTH).max(FEEDBACK.BODY_MAX_LENGTH).optional(),
  rating: z.number().int().min(FEEDBACK.RATING_MIN).max(FEEDBACK.RATING_MAX).optional(),
});

export const feedbackListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  sort_by: z.enum(['created_at', 'updated_at', 'type', 'rating', 'title']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  type: z.nativeEnum(FeedbackType).optional(),
  subject_id: z.string().uuid().optional(),
  author_id: z.string().uuid().optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  q: z.string().max(200).optional(),
});

export type CreateFeedbackSchema = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackSchema = z.infer<typeof updateFeedbackSchema>;
export type FeedbackListParamsSchema = z.infer<typeof feedbackListParamsSchema>;
