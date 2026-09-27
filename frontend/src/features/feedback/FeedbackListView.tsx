"use client";

import { observer } from "mobx-react-lite";
import Link from "next/link";
import { useCallback, useEffect } from "react";
import { EntryList } from "@/components/entries/EntryList";
import { FilterBar } from "@/components/entries/FilterBar";
import { isIsoDate, useUrlFilters } from "@/hooks/useUrlFilters";
import { useStores } from "@/stores/StoreProvider";
import { DEFAULT_FEEDBACK_FILTERS, DEFAULT_FEEDBACK_SORT, isFeedbackType, type FeedbackFilters } from "@/stores/FeedbackStore";
import { FEEDBACK_TYPE_OPTIONS, FeedbackCard, FeedbackVisibilityNotice } from "@/features/feedback/labels";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const FEEDBACK_FILTER_FIELDS = [
  { key: "from", label: "From", type: "date" as const },
  { key: "to", label: "To", type: "date" as const },
  { key: "type", label: "Type", type: "select" as const, options: FEEDBACK_TYPE_OPTIONS, placeholder: "All types" },
];

const SORT_OPTIONS = [
  { value: "entryDate,desc", label: "Newest first" },
  { value: "entryDate,asc", label: "Oldest first" },
  { value: "type,asc", label: "Type" },
  { value: "subject,asc", label: "Subject A→Z" },
];
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);

function sanitizeFeedbackFilter(key: keyof FeedbackFilters, raw: string): string | undefined {
  if (key === "type") return isFeedbackType(raw) ? raw : undefined;
  return isIsoDate(raw) ? raw : undefined;
}

interface FeedbackListViewProps {
  /** Manager/admin read-only view of another recruit; `null` = the signed-in recruit. */
  recruitId?: string | null;
  /** Detail route builder; defaults to `/feedback/{id}`. */
  hrefFor?: (id: string) => string;
  readOnly?: boolean;
}

/**
 * Filter bar + paginated list, with filters/page/sort mirrored in the URL query.
 * Used by /feedback (recruit) and the /recruits/{id} Feedback tab (manager/admin).
 */
export const FeedbackListView = observer(function FeedbackListView({ recruitId = null, hrefFor, readOnly }: FeedbackListViewProps) {
  const { feedback } = useStores();
  const { state, set, reset } = useUrlFilters<FeedbackFilters>({
    defaults: DEFAULT_FEEDBACK_FILTERS,
    defaultSort: DEFAULT_FEEDBACK_SORT,
    sanitize: sanitizeFeedbackFilter,
    sortOptions: SORT_VALUES,
  });

  useEffect(() => {
    feedback.setRecruitId(recruitId);
    feedback.setFilters(state.filters);
    feedback.setSort(state.sort);
    feedback.setPage(state.page);
    void feedback.load();
  }, [feedback, recruitId, state]);

  const list = feedback.recruitId === recruitId ? feedback.currentList : null;

  const loadedPage = list?.page;
  useEffect(() => {
    const current = feedback.recruitId === recruitId ? feedback.currentList : null;
    if (!feedback.listLoading && current && current.page !== state.page) set({ page: current.page });
  }, [feedback, recruitId, feedback.listLoading, loadedPage, state.page, set]);

  const onPageChange = useCallback((page: number) => set({ page }), [set]);
  const linkFor = hrefFor ?? ((id: string) => `/feedback/${id}`);

  return (
    <>
      <FeedbackVisibilityNotice audience={readOnly ? "viewer" : "recruit"} />
      <FilterBar
        fields={FEEDBACK_FILTER_FIELDS}
        values={state.filters}
        onChange={(patch) => set({ filters: patch })}
        onReset={reset}
        hasActiveFilters={feedback.hasActiveFilters}
        disabled={feedback.listLoading && !list}
        idPrefix="feedback"
      >
        <div className={formStyles.field}>
          <label htmlFor="feedback-sort" className={formStyles.label}>
            Sort
          </label>
          <select id="feedback-sort" className={tableStyles.select} value={state.sort} onChange={(e) => set({ sort: e.target.value })}>
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
        loading={feedback.listLoading || (!list && !feedback.listError)}
        error={feedback.listError}
        renderItem={(note) => <FeedbackCard note={note} />}
        hrefFor={(note) => linkFor(note.id)}
        onPageChange={onPageChange}
        hasActiveFilters={feedback.hasActiveFilters}
        filteredEmptyMessage="No feedback matches these filters."
        emptyMessage={
          readOnly ? (
            "This recruit has not shared any feedback yet."
          ) : (
            <>
              No feedback yet.{" "}
              <Link href="/feedback/new" className={tableStyles.rowLink}>
                Share your first note
              </Link>
              .
            </>
          )
        }
        testId="feedback-list"
      />
    </>
  );
});
