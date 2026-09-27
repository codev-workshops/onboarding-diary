"use client";

import { observer } from "mobx-react-lite";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EntryList } from "@/components/entries/EntryList";
import { FilterBar } from "@/components/entries/FilterBar";
import { isIsoDate, useUrlFilters } from "@/hooks/useUrlFilters";
import { useStores } from "@/stores/StoreProvider";
import { DEFAULT_NOTE_FILTERS, DEFAULT_NOTE_SORT, isValidTag, normalizeTag, type NoteFilters } from "@/stores/NoteStore";
import { NoteCard } from "@/features/notes/labels";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";
import styles from "./notes.module.css";

const NOTE_FILTER_FIELDS = [
  { key: "from", label: "From", type: "date" as const },
  { key: "to", label: "To", type: "date" as const },
];

const SORT_OPTIONS = [
  { value: "entryDate,desc", label: "Newest first" },
  { value: "entryDate,asc", label: "Oldest first" },
  { value: "createdAt,desc", label: "Recently added" },
  { value: "title,asc", label: "Title A→Z" },
];
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);

function sanitizeNoteFilter(key: keyof NoteFilters, raw: string): string | undefined {
  if (key === "tag") {
    const tag = normalizeTag(raw);
    return isValidTag(tag) ? tag : undefined;
  }
  return isIsoDate(raw) ? raw : undefined;
}

interface TagFilterProps {
  value: string;
  onCommit: (tag: string) => void;
  disabled?: boolean;
  id: string;
}

/**
 * Free-text exact-match tag filter; committed on Enter / blur so the URL is not
 * rewritten per keystroke. Rendered with `key={value}` so an external change
 * (reset, deep link) re-seeds the draft.
 */
function TagFilter({ value, onCommit, disabled, id }: TagFilterProps) {
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const tag = normalizeTag(draft);
    if (tag === value) return;
    if (tag && !isValidTag(tag)) return;
    onCommit(tag);
  };

  return (
    <div className={formStyles.field}>
      <label htmlFor={id} className={formStyles.label}>
        Tag
      </label>
      <input
        id={id}
        type="search"
        className={`${formStyles.input} ${styles.filterText}`}
        value={draft}
        placeholder="e.g. kotlin"
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}

interface NoteListViewProps {
  /** Manager/admin read-only view of another recruit; `null` = the signed-in recruit. */
  recruitId?: string | null;
  /** Detail route builder; defaults to `/notes/{id}`. */
  hrefFor?: (id: string) => string;
  readOnly?: boolean;
}

/**
 * Filter bar + paginated list, with filters/page/sort mirrored in the URL query.
 * Used by /notes (recruit) and the /recruits/{id} Notes tab (manager/admin).
 */
export const NoteListView = observer(function NoteListView({ recruitId = null, hrefFor, readOnly }: NoteListViewProps) {
  const { notes } = useStores();
  const { state, set, reset } = useUrlFilters<NoteFilters>({
    defaults: DEFAULT_NOTE_FILTERS,
    defaultSort: DEFAULT_NOTE_SORT,
    sanitize: sanitizeNoteFilter,
    sortOptions: SORT_VALUES,
  });

  useEffect(() => {
    notes.setRecruitId(recruitId);
    notes.setFilters(state.filters);
    notes.setSort(state.sort);
    notes.setPage(state.page);
    void notes.load();
  }, [notes, recruitId, state]);

  const list = notes.recruitId === recruitId ? notes.currentList : null;

  const loadedPage = list?.page;
  useEffect(() => {
    const current = notes.recruitId === recruitId ? notes.currentList : null;
    if (!notes.listLoading && current && current.page !== state.page) set({ page: current.page });
  }, [notes, recruitId, notes.listLoading, loadedPage, state.page, set]);

  const onPageChange = useCallback((page: number) => set({ page }), [set]);
  const linkFor = hrefFor ?? ((id: string) => `/notes/${id}`);
  const disabled = notes.listLoading && !list;

  return (
    <>
      <FilterBar
        fields={NOTE_FILTER_FIELDS}
        values={state.filters}
        onChange={(patch) => set({ filters: patch })}
        onReset={reset}
        hasActiveFilters={notes.hasActiveFilters}
        disabled={disabled}
        idPrefix="notes"
      >
        <TagFilter key={state.filters.tag} id="notes-tag" value={state.filters.tag} disabled={disabled} onCommit={(tag) => set({ filters: { tag } })} />
        <div className={formStyles.field}>
          <label htmlFor="notes-sort" className={formStyles.label}>
            Sort
          </label>
          <select id="notes-sort" className={tableStyles.select} value={state.sort} onChange={(e) => set({ sort: e.target.value })}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>
      <EntryList
        page={list}
        loading={notes.listLoading || (!list && !notes.listError)}
        error={notes.listError}
        renderItem={(note) => <NoteCard note={note} />}
        hrefFor={(note) => linkFor(note.id)}
        onPageChange={onPageChange}
        hasActiveFilters={notes.hasActiveFilters}
        filteredEmptyMessage="No notes match these filters."
        emptyMessage={
          readOnly ? (
            "This recruit has not written any notes yet."
          ) : (
            <>
              No notes yet.{" "}
              <Link href="/notes/new" className={tableStyles.rowLink}>
                Write your first note
              </Link>
              .
            </>
          )
        }
        testId="note-list"
      />
    </>
  );
});
