import type { Note, NoteCreateRequest, NoteUpdateRequest } from "@/lib/apiClient";
import { MAX_TAGS_PER_NOTE, TAG_MAX_LENGTH } from "@/lib/apiClient";
import { isValidTag, normalizeTag } from "@/stores/NoteStore";

export const TITLE_MAX = 200;
export const CONTENT_MAX = 10000;

export interface NoteFormValues {
  entryDate: string;
  title: string;
  content: string;
  /** Chips as shown; normalized + deduplicated by `normalizeTags` before submit. */
  tags: string[];
}

/** Today's date in UTC as `YYYY-MM-DD` (INV-09 is evaluated in UTC by the backend). */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Latest date the backend accepts: one day after the UTC date (timezone slack). */
export function maxEntryDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function noteToFormValues(note: Note | null): NoteFormValues {
  return {
    entryDate: note?.entryDate ?? todayUtc(),
    title: note?.title ?? "",
    content: note?.content ?? "",
    tags: note?.tags ? [...note.tags] : [],
  };
}

/** Mirror of the backend `TagNormalizer.normalize`: trim, lowercase, drop blanks, dedupe (first occurrence wins). */
export function normalizeTags(raw: readonly string[]): string[] {
  const out: string[] = [];
  for (const r of raw) {
    const t = normalizeTag(r);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Why a single tag is rejected, or `null` when it is acceptable. */
export function tagError(raw: string): string | null {
  const t = normalizeTag(raw);
  if (!t) return "Tag cannot be empty.";
  if (t.length > TAG_MAX_LENGTH) return `Tags must be at most ${TAG_MAX_LENGTH} characters.`;
  if (!isValidTag(t)) return "Tags may only contain lowercase letters, digits and hyphens, and must start with a letter or digit.";
  return null;
}

/** Client-side mirror of the backend field rules (REQ-FUNC-060, §7.7). */
export function validateNote(values: NoteFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = values.title.trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters.`;
  const content = values.content.trim();
  if (!content) errors.content = "Content is required.";
  else if (content.length > CONTENT_MAX) errors.content = `Content must be at most ${CONTENT_MAX} characters.`;
  if (!values.entryDate) errors.entryDate = "Date is required.";
  else if (values.entryDate > maxEntryDate()) errors.entryDate = "Date cannot be in the future.";
  const tags = normalizeTags(values.tags);
  const invalid = tags.find((t) => !isValidTag(t));
  if (invalid) errors.tags = `“${invalid}” is not a valid tag.`;
  else if (tags.length > MAX_TAGS_PER_NOTE) errors.tags = `At most ${MAX_TAGS_PER_NOTE} tags per note.`;
  return errors;
}

export function toCreateRequest(values: NoteFormValues): NoteCreateRequest {
  return {
    entryDate: values.entryDate,
    title: values.title.trim(),
    content: values.content.trim(),
    tags: normalizeTags(values.tags),
  };
}

export function toUpdateRequest(values: NoteFormValues): NoteUpdateRequest {
  return toCreateRequest(values);
}
