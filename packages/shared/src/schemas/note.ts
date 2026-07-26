import { z } from 'zod';

import {
  NOTE_CONTENT_MAX_LENGTH,
  TAGS_MAX_COUNT,
  TAG_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../constants.js';
import {
  calendarDate,
  optionalText,
  paginationQuery,
  pastOrPresentCalendarDate,
  trimmedNonEmptyString,
  uuid,
} from '../primitives.js';

/** Lowercase, trim, drop blanks, and de-duplicate a note's tags (FR-N2). */
export function normaliseTags(tags: readonly string[]): string[] {
  const normalised = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)
    .map((tag) => tag.slice(0, TAG_MAX_LENGTH));
  return [...new Set(normalised)];
}

export const tagList = z
  .array(z.string())
  .max(TAGS_MAX_COUNT, `Must be at most ${TAGS_MAX_COUNT} tags`)
  .transform(normaliseTags);

const noteFields = {
  entryDate: pastOrPresentCalendarDate,
  title: trimmedNonEmptyString(TITLE_MAX_LENGTH),
  content: optionalText(NOTE_CONTENT_MAX_LENGTH),
  tags: tagList,
};

export const createNoteBody = z.object({
  ...noteFields,
  content: noteFields.content.optional(),
  tags: noteFields.tags.default([]),
});

export const updateNoteBody = z.object(noteFields).partial();

export const listNotesQuery = paginationQuery.extend({
  ownerId: uuid.optional(),
  tag: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value : value.split(',')))
    .transform(normaliseTags)
    .optional(),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
});

export type CreateNoteBody = z.infer<typeof createNoteBody>;
export type UpdateNoteBody = z.infer<typeof updateNoteBody>;
export type ListNotesQuery = z.infer<typeof listNotesQuery>;

export type NoteDto = {
  id: string;
  ownerId: string;
  entryDate: string;
  title: string;
  content: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};
