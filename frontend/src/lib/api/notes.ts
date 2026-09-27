import type { ApiTransport, EntryApi, EntryBase, EntryListQuery, Page } from "@/lib/api/core";
import { toQuery } from "@/lib/api/core";

// ---- S6: additional notes contract (docs/openapi.yaml `Note*`) -------------------

/** Backend tag rule (docs/detailed-requirements.md §7.7): normalized tags only. */
export const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,29}$/;
export const MAX_TAGS_PER_NOTE = 10;
export const TAG_MAX_LENGTH = 30;

export interface Note extends EntryBase {
  title: string;
  content: string;
  /** Normalized (trimmed, lowercase, unique) tags as stored by the backend. */
  tags: string[];
  /** Optimistic-lock counter; send it back as `If-Match: "<version>"` on PUT. */
  version: number;
}

/** ETag value for `If-Match` from a note's `version`. */
export const noteEtag = (note: Pick<Note, "version">): string => `"${note.version}"`;

export interface NoteCreateRequest {
  entryDate: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface NoteUpdateRequest {
  entryDate: string;
  title: string;
  content: string;
  /** Replaces the whole tag set. */
  tags?: string[];
}

export interface ListNotesQuery extends EntryListQuery {
  /** Exact-match on one normalized tag. */
  tag?: string;
}

/** Typed `/notes` resource; registered once on `ApiClient` as `api.notes`. */
export class NotesApi implements EntryApi<Note, NoteCreateRequest, NoteUpdateRequest, ListNotesQuery> {
  constructor(private readonly http: ApiTransport) {}

  /** operationId: listNotes */
  list(query: ListNotesQuery = {}): Promise<Page<Note>> {
    return this.http.request<Page<Note>>("GET", `/notes${toQuery(query)}`);
  }

  /** operationId: createNote */
  create(body: NoteCreateRequest): Promise<Note> {
    return this.http.request<Note>("POST", "/notes", { body });
  }

  /** operationId: getNote */
  get(noteId: string): Promise<Note> {
    return this.http.request<Note>("GET", `/notes/${noteId}`);
  }

  /** operationId: updateNote */
  update(noteId: string, body: NoteUpdateRequest, ifMatch?: string): Promise<Note> {
    return this.http.request<Note>("PUT", `/notes/${noteId}`, { body, headers: ifMatch ? { "If-Match": ifMatch } : undefined });
  }

  /** operationId: deleteNote */
  remove(noteId: string): Promise<void> {
    return this.http.request<void>("DELETE", `/notes/${noteId}`);
  }
}
