import { z } from 'zod';
import { FEEDBACK } from '../constants';
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

export type CreateFeedbackSchema = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackSchema = z.infer<typeof updateFeedbackSchema>;
