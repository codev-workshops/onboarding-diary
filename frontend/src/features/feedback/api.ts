import { createCrudHooks } from '../../shared/api/crud';
import type { FeedbackEntry } from '../../shared/types';
import type { FeedbackFormValues } from './schema';

export const feedbackApi = createCrudHooks<FeedbackEntry, FeedbackFormValues>('feedback');
