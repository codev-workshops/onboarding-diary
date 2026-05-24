import { z } from 'zod';
import { ISSUE, NOTE, PAGINATION, TASK } from '../constants';
import { IssueSeverity, IssueStatus, Priority, TaskStatus, Visibility } from '../enums';

export const createTaskEntrySchema = z.object({
  title: z.string().min(TASK.TITLE_MIN_LENGTH).max(TASK.TITLE_MAX_LENGTH),
  description: z.string().max(TASK.DESCRIPTION_MAX_LENGTH).optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  due_date: z.string().date('Must be a valid date (YYYY-MM-DD)').optional(),
  visibility: z.nativeEnum(Visibility).default(Visibility.MANAGER_ONLY),
  tags: z
    .array(z.string().max(TASK.TAG_MAX_LENGTH).regex(/^[a-zA-Z0-9-]+$/))
    .max(TASK.MAX_TAGS)
    .optional(),
});

export const updateTaskEntrySchema = z.object({
  title: z.string().min(TASK.TITLE_MIN_LENGTH).max(TASK.TITLE_MAX_LENGTH).optional(),
  description: z.string().max(TASK.DESCRIPTION_MAX_LENGTH).optional(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  due_date: z.string().date().optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  tags: z
    .array(z.string().max(TASK.TAG_MAX_LENGTH).regex(/^[a-zA-Z0-9-]+$/))
    .max(TASK.MAX_TAGS)
    .optional(),
});

export const createNoteEntrySchema = z.object({
  title: z.string().min(NOTE.TITLE_MIN_LENGTH).max(NOTE.TITLE_MAX_LENGTH),
  body: z.string().min(NOTE.BODY_MIN_LENGTH).max(NOTE.BODY_MAX_LENGTH),
  mood_rating: z.number().int().min(NOTE.MOOD_MIN).max(NOTE.MOOD_MAX).optional(),
  entry_date: z.string().date('Must be a valid date (YYYY-MM-DD)'),
  visibility: z.nativeEnum(Visibility).default(Visibility.PRIVATE),
  tags: z
    .array(z.string().max(NOTE.TAG_MAX_LENGTH).regex(/^[a-zA-Z0-9-]+$/))
    .max(NOTE.MAX_TAGS)
    .optional(),
});

export const updateNoteEntrySchema = z.object({
  title: z.string().min(NOTE.TITLE_MIN_LENGTH).max(NOTE.TITLE_MAX_LENGTH).optional(),
  body: z.string().min(NOTE.BODY_MIN_LENGTH).max(NOTE.BODY_MAX_LENGTH).optional(),
  mood_rating: z.number().int().min(NOTE.MOOD_MIN).max(NOTE.MOOD_MAX).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  tags: z
    .array(z.string().max(NOTE.TAG_MAX_LENGTH).regex(/^[a-zA-Z0-9-]+$/))
    .max(NOTE.MAX_TAGS)
    .optional(),
});

export const taskListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  sort_by: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'status', 'title']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  tag: z.string().max(50).optional(),
  q: z.string().max(200).optional(),
});

export const createIssueEntrySchema = z.object({
  title: z.string().min(ISSUE.TITLE_MIN_LENGTH).max(ISSUE.TITLE_MAX_LENGTH),
  description: z.string().min(ISSUE.DESCRIPTION_MIN_LENGTH).max(ISSUE.DESCRIPTION_MAX_LENGTH),
  severity: z.nativeEnum(IssueSeverity).default(IssueSeverity.MEDIUM),
  visibility: z.nativeEnum(Visibility).default(Visibility.MANAGER_ONLY),
  tags: z
    .array(z.string().max(ISSUE.TAG_MAX_LENGTH).regex(/^[a-zA-Z0-9-]+$/))
    .max(ISSUE.MAX_TAGS)
    .optional(),
});

export const updateIssueEntrySchema = z.object({
  title: z.string().min(ISSUE.TITLE_MIN_LENGTH).max(ISSUE.TITLE_MAX_LENGTH).optional(),
  description: z.string().min(ISSUE.DESCRIPTION_MIN_LENGTH).max(ISSUE.DESCRIPTION_MAX_LENGTH).optional(),
  severity: z.nativeEnum(IssueSeverity).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  resolution_note: z.string().max(ISSUE.RESOLUTION_MAX_LENGTH).optional().nullable(),
  visibility: z.nativeEnum(Visibility).optional(),
  tags: z
    .array(z.string().max(ISSUE.TAG_MAX_LENGTH).regex(/^[a-zA-Z0-9-]+$/))
    .max(ISSUE.MAX_TAGS)
    .optional(),
});

export const issueListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  sort_by: z.enum(['created_at', 'updated_at', 'severity', 'status', 'title']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  status: z.nativeEnum(IssueStatus).optional(),
  severity: z.nativeEnum(IssueSeverity).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  tag: z.string().max(50).optional(),
  q: z.string().max(200).optional(),
});

export const noteListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  sort_by: z.enum(['created_at', 'updated_at', 'entry_date', 'title']).default('entry_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  visibility: z.nativeEnum(Visibility).optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  tag: z.string().max(50).optional(),
  q: z.string().max(200).optional(),
});

export type CreateTaskEntrySchema = z.infer<typeof createTaskEntrySchema>;
export type UpdateTaskEntrySchema = z.infer<typeof updateTaskEntrySchema>;
export type CreateNoteEntrySchema = z.infer<typeof createNoteEntrySchema>;
export type UpdateNoteEntrySchema = z.infer<typeof updateNoteEntrySchema>;
export type TaskListParamsSchema = z.infer<typeof taskListParamsSchema>;
export type CreateIssueEntrySchema = z.infer<typeof createIssueEntrySchema>;
export type UpdateIssueEntrySchema = z.infer<typeof updateIssueEntrySchema>;
export type IssueListParamsSchema = z.infer<typeof issueListParamsSchema>;
export type NoteListParamsSchema = z.infer<typeof noteListParamsSchema>;
