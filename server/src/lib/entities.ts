import { z } from 'zod';
import type { EntityName } from './types.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a date in YYYY-MM-DD format');

export const TASK_CATEGORIES = [
  'Setup',
  'Training',
  'Documentation',
  'Shadowing',
  'Development',
  'Meeting',
  'Other',
] as const;
export const TASK_STATUSES = ['Not started', 'In progress', 'Completed', 'Blocked'] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ISSUE_STATUSES = ['Open', 'In progress', 'Resolved'] as const;
export const FEEDBACK_TYPES = ['Positive', 'Suggestion', 'Concern'] as const;

const taskSchema = z.object({
  date: isoDate,
  title: z.string().trim().min(1, 'Please enter a title').max(140),
  description: z.string().trim().max(4000).default(''),
  category: z.enum(TASK_CATEGORIES),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
});

const issueSchema = z.object({
  date: isoDate,
  title: z.string().trim().min(1, 'Please enter a title').max(140),
  description: z.string().trim().max(4000).default(''),
  severity: z.enum(ISSUE_SEVERITIES),
  status: z.enum(ISSUE_STATUSES),
  resolutionNotes: z.string().trim().max(4000).default(''),
});

const feedbackSchema = z.object({
  date: isoDate,
  subject: z.string().trim().min(1, 'Please enter a subject').max(140),
  type: z.enum(FEEDBACK_TYPES),
  details: z.string().trim().max(4000).default(''),
});

const noteSchema = z.object({
  date: isoDate,
  title: z.string().trim().min(1, 'Please enter a title').max(140),
  content: z.string().trim().max(8000).default(''),
  tags: z.string().trim().max(200).default(''),
});

export interface EntityDefinition {
  table: EntityName;
  columns: ReadonlyArray<string>;
  /** Columns matched by the global search query. */
  searchColumns: ReadonlyArray<string>;
  /** Query parameters usable as exact-match filters. */
  filterColumns: ReadonlyArray<string>;
  schema: z.ZodTypeAny;
  label: string;
}

export const ENTITIES: Record<EntityName, EntityDefinition> = {
  tasks: {
    table: 'tasks',
    columns: ['date', 'title', 'description', 'category', 'status', 'priority'],
    searchColumns: ['title', 'description', 'category'],
    filterColumns: ['category', 'status', 'priority'],
    schema: taskSchema,
    label: 'Task',
  },
  issues: {
    table: 'issues',
    columns: ['date', 'title', 'description', 'severity', 'status', 'resolutionNotes'],
    searchColumns: ['title', 'description', 'resolutionNotes'],
    filterColumns: ['severity', 'status'],
    schema: issueSchema,
    label: 'Issue',
  },
  feedback: {
    table: 'feedback',
    columns: ['date', 'subject', 'type', 'details'],
    searchColumns: ['subject', 'details'],
    filterColumns: ['type'],
    schema: feedbackSchema,
    label: 'Feedback',
  },
  notes: {
    table: 'notes',
    columns: ['date', 'title', 'content', 'tags'],
    searchColumns: ['title', 'content', 'tags'],
    filterColumns: [],
    schema: noteSchema,
    label: 'Note',
  },
};
