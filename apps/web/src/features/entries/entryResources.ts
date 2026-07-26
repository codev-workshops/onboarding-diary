/**
 * The four diary resources share one shape: a paginated list, create, update, and delete on
 * `/{resource}`. Declaring them once keeps the list pages, the forms, and the manager's
 * read-only diary from re-implementing the same plumbing four times.
 */

import type {
  FeedbackNoteDto,
  IssueEntryDto,
  NoteDto,
  TaskEntryDto,
} from '@onboarding-diary/shared';

import type { EntryResource } from '../../app/queryKeys.js';

export type EntryDtoOf = {
  tasks: TaskEntryDto;
  issues: IssueEntryDto;
  feedback: FeedbackNoteDto;
  notes: NoteDto;
};

export const ENTRY_PATHS: Record<EntryResource, string> = {
  tasks: '/tasks',
  issues: '/issues',
  feedback: '/feedback',
  notes: '/notes',
};

export const ENTRY_LABELS: Record<EntryResource, { singular: string; plural: string }> = {
  tasks: { singular: 'task', plural: 'Tasks' },
  issues: { singular: 'issue', plural: 'Issues' },
  feedback: { singular: 'feedback note', plural: 'Feedback' },
  notes: { singular: 'note', plural: 'Notes' },
};
