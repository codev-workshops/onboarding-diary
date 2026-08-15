import { z } from 'zod';
import { feedbackTypes } from '../../shared/types';

export const feedbackSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject must be 200 characters or fewer'),
  type: z.enum(feedbackTypes as [string, ...string[]]),
  details: z.string().max(2000, 'Details must be 2000 characters or fewer').optional(),
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;
