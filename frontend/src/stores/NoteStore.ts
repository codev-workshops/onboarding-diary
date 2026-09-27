import type { ApiClient, ListNotesQuery, Note, NoteCreateRequest, NoteUpdateRequest } from "@/lib/apiClient";
import { ApiError, TAG_PATTERN } from "@/lib/apiClient";
import { EntryStore, type EntryFilters } from "@/stores/EntryStore";

export interface NoteFilters extends EntryFilters {
  /** Exact-match tag filter; normalized (trim + lowercase) before it is sent. */
  tag: string;
}

export const DEFAULT_NOTE_FILTERS: NoteFilters = { from: "", to: "", tag: "" };
export const DEFAULT_NOTE_SORT = "entryDate,desc";

/** Client-side mirror of the backend `TagNormalizer.normalizeOne`. */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidTag(tag: string): boolean {
  return TAG_PATTERN.test(tag);
}

/** User-facing copy for the note error catalog (REQ-FUNC-060..063). */
export function noteErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "NOT_FOUND":
        return "This note does not exist or you cannot access it.";
      case "CONFLICT":
        return "This note was changed by someone else. Review the latest version and try again.";
      case "NOT_ASSIGNED":
        return "You are not assigned to this recruit.";
      case "FORBIDDEN":
        return "You are not allowed to do that.";
      case "VALIDATION_FAILED": {
        const fields = e.details.filter((d) => d.field).map((d) => `${d.field} ${d.message}`);
        return fields.length ? `Check the filters: ${fields.join("; ")}.` : e.message;
      }
      default:
        return e.message;
    }
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

/** Additional notes (REQ-FUNC-060..063) — S6 copy of the S3 `TaskStore` pattern. */
export class NoteStore extends EntryStore<Note, NoteCreateRequest, NoteUpdateRequest, NoteFilters, ListNotesQuery> {
  constructor(api: ApiClient) {
    super(api.notes, DEFAULT_NOTE_FILTERS, DEFAULT_NOTE_SORT);
  }

  protected override errorMessage(e: unknown): string {
    return noteErrorMessage(e);
  }

  protected filterQuery(filters: NoteFilters): Pick<ListNotesQuery, "tag"> {
    return { tag: normalizeTag(filters.tag) || undefined };
  }

  protected override matchesFilters(note: Note, filters: NoteFilters): boolean {
    const tag = normalizeTag(filters.tag);
    return super.matchesFilters(note, filters) && (!tag || note.tags.includes(tag));
  }
}
