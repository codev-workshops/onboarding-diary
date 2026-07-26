import { z } from 'zod';

import { TEXT_MAX_LENGTH, TITLE_MAX_LENGTH } from '../constants.js';
import { FEEDBACK_TYPES, type FeedbackType } from '../enums.js';
import {
  calendarDate,
  enumListFilter,
  optionalText,
  paginationQuery,
  pastOrPresentCalendarDate,
  trimmedNonEmptyString,
  uuid,
} from '../primitives.js';

const feedbackFields = {
  entryDate: pastOrPresentCalendarDate,
  subject: trimmedNonEmptyString(TITLE_MAX_LENGTH),
  type: z.enum(FEEDBACK_TYPES),
  details: optionalText(TEXT_MAX_LENGTH),
};

export const createFeedbackBody = z.object({
  ...feedbackFields,
  details: feedbackFields.details.optional(),
});

export const updateFeedbackBody = z.object(feedbackFields).partial();

export const listFeedbackQuery = paginationQuery.extend({
  ownerId: uuid.optional(),
  type: enumListFilter(FEEDBACK_TYPES).optional(),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
});

export type CreateFeedbackBody = z.infer<typeof createFeedbackBody>;
export type UpdateFeedbackBody = z.infer<typeof updateFeedbackBody>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuery>;

export type FeedbackNoteDto = {
  id: string;
  ownerId: string;
  entryDate: string;
  subject: string;
  type: FeedbackType;
  details: string | null;
  createdAt: string;
  updatedAt: string;
};
