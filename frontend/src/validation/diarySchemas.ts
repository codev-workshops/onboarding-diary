import { z } from 'zod';
import {
  FEEDBACK_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../api/diaryTypes';
import { earliestEntryDate, todayIso } from '../utils/dates';

export const MAX_TAGS = 10;

/** Entry dates must be real dates, not in the future and at most 30 days before the start date. */
export function entryDateSchema(startDate: string, today: string = todayIso()) {
  const earliest = earliestEntryDate(startDate);
  return z
    .string()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date (YYYY-MM-DD)')
    .refine((value) => value <= today, 'Date cannot be in the future')
    .refine((value) => value >= earliest, `Date cannot be earlier than ${earliest}`);
}

const title = z.string().trim().min(1, 'Title is required').max(150, 'Use at most 150 characters');
const description = z.string().max(5000, 'Use at most 5000 characters');

export function taskSchema(startDate: string) {
  return z.object({
    entryDate: entryDateSchema(startDate),
    title,
    description,
    category: z.enum(TASK_CATEGORIES, { message: 'Category is required' }),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
  });
}

export function issueSchema(startDate: string) {
  return z
    .object({
      entryDate: entryDateSchema(startDate),
      title,
      description,
      severity: z.enum(ISSUE_SEVERITIES, { message: 'Severity is required' }),
      status: z.enum(ISSUE_STATUSES),
      resolutionNotes: z.string().max(5000, 'Use at most 5000 characters'),
      relatedTaskId: z.number().nullable(),
    })
    .refine(
      (values) =>
        !['RESOLVED', 'CLOSED'].includes(values.status) || values.resolutionNotes.trim() !== '',
      {
        path: ['resolutionNotes'],
        message: 'Resolution notes are required to resolve or close an issue',
      },
    );
}

export function feedbackSchema(startDate: string) {
  return z.object({
    entryDate: entryDateSchema(startDate),
    subject: z.string().trim().min(1, 'Subject is required').max(150, 'Use at most 150 characters'),
    type: z.enum(FEEDBACK_TYPES, { message: 'Type is required' }),
    details: z
      .string()
      .trim()
      .min(1, 'Details are required')
      .max(5000, 'Use at most 5000 characters'),
  });
}

export function noteSchema(startDate: string) {
  return z.object({
    entryDate: entryDateSchema(startDate),
    title,
    content: z
      .string()
      .trim()
      .min(1, 'Content is required')
      .max(20000, 'Use at most 20000 characters'),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(40, 'Tags can be at most 40 characters')
          .regex(/^[^,]+$/, 'Tags cannot contain commas'),
      )
      .max(MAX_TAGS, `Use at most ${MAX_TAGS} tags`),
    shared: z.boolean(),
  });
}

export type TaskValues = z.infer<ReturnType<typeof taskSchema>>;
export type IssueValues = z.infer<ReturnType<typeof issueSchema>>;
export type FeedbackValues = z.infer<ReturnType<typeof feedbackSchema>>;
export type NoteValues = z.infer<ReturnType<typeof noteSchema>>;
