"use client";

import { observer } from "mobx-react-lite";
import Link from "next/link";
import { useCallback, useEffect } from "react";
import { EntryList } from "@/components/entries/EntryList";
import { FilterBar } from "@/components/entries/FilterBar";
import { isIsoDate, useUrlFilters } from "@/hooks/useUrlFilters";
import { useStores } from "@/stores/StoreProvider";
import { DEFAULT_ISSUE_FILTERS, DEFAULT_ISSUE_SORT, isIssueSeverity, isIssueStatus, type IssueFilters } from "@/stores/IssueStore";
import { ISSUE_SEVERITY_OPTIONS, ISSUE_STATUS_OPTIONS, IssueCard } from "@/features/issues/labels";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const ISSUE_FILTER_FIELDS = [
  { key: "from", label: "From", type: "date" as const },
  { key: "to", label: "To", type: "date" as const },
  { key: "status", label: "Status", type: "select" as const, options: ISSUE_STATUS_OPTIONS, placeholder: "All statuses" },
  { key: "severity", label: "Severity", type: "select" as const, options: ISSUE_SEVERITY_OPTIONS, placeholder: "All severities" },
];

const SORT_OPTIONS = [
  { value: "entryDate,desc", label: "Newest first" },
  { value: "entryDate,asc", label: "Oldest first" },
  { value: "severity,desc", label: "Severity" },
  { value: "status,asc", label: "Status" },
  { value: "title,asc", label: "Title A→Z" },
];
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);

function sanitizeIssueFilter(key: keyof IssueFilters, raw: string): string | undefined {
  switch (key) {
    case "severity":
      return isIssueSeverity(raw) ? raw : undefined;
    case "status":
      return isIssueStatus(raw) ? raw : undefined;
    default:
      return isIsoDate(raw) ? raw : undefined;
  }
}

interface IssueListViewProps {
  /** Manager/admin read-only view of another recruit; `null` = the signed-in recruit. */
  recruitId?: string | null;
  /** Detail route builder; defaults to `/issues/{id}`. */
  hrefFor?: (id: string) => string;
  readOnly?: boolean;
}

/**
 * Filter bar + paginated list, with filters/page/sort mirrored in the URL query.
 * Used by /issues (recruit) and the /recruits/{id} Issues tab (manager/admin).
 */
export const IssueListView = observer(function IssueListView({ recruitId = null, hrefFor, readOnly }: IssueListViewProps) {
  const { issues } = useStores();
  const { state, set, reset } = useUrlFilters<IssueFilters>({
    defaults: DEFAULT_ISSUE_FILTERS,
    defaultSort: DEFAULT_ISSUE_SORT,
    sanitize: sanitizeIssueFilter,
    sortOptions: SORT_VALUES,
  });

  useEffect(() => {
    issues.setRecruitId(recruitId);
    issues.setFilters(state.filters);
    issues.setSort(state.sort);
    issues.setPage(state.page);
    void issues.load();
  }, [issues, recruitId, state]);

  // Only a page loaded for the *current* store query is shown: after a filter,
  // sort or recruit change the previous results are hidden until the new ones
  // arrive (never flash another recruit's issues).
  const list = issues.recruitId === recruitId ? issues.currentList : null;

  // The store clamps an out-of-range page to the last one; mirror that in the URL.
  // Read live store state so a page from the previous query is never written back.
  const loadedPage = list?.page;
  useEffect(() => {
    const current = issues.recruitId === recruitId ? issues.currentList : null;
    if (!issues.listLoading && current && current.page !== state.page) set({ page: current.page });
  }, [issues, recruitId, issues.listLoading, loadedPage, state.page, set]);

  const onPageChange = useCallback((page: number) => set({ page }), [set]);
  const linkFor = hrefFor ?? ((id: string) => `/issues/${id}`);

  return (
    <>
      <FilterBar
        fields={ISSUE_FILTER_FIELDS}
        values={state.filters}
        onChange={(patch) => set({ filters: patch })}
        onReset={reset}
        hasActiveFilters={issues.hasActiveFilters}
        disabled={issues.listLoading && !list}
        idPrefix="issues"
      >
        <div className={formStyles.field}>
          <label htmlFor="issues-sort" className={formStyles.label}>
            Sort
          </label>
          <select id="issues-sort" className={tableStyles.select} value={state.sort} onChange={(e) => set({ sort: e.target.value })}>
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
        loading={issues.listLoading || (!list && !issues.listError)}
        error={issues.listError}
        renderItem={(issue) => <IssueCard issue={issue} />}
        hrefFor={(issue) => linkFor(issue.id)}
        onPageChange={onPageChange}
        hasActiveFilters={issues.hasActiveFilters}
        filteredEmptyMessage="No issues match these filters."
        emptyMessage={
          readOnly ? (
            "This recruit has not logged any issues yet."
          ) : (
            <>
              No issues yet.{" "}
              <Link href="/issues/new" className={tableStyles.rowLink}>
                Log your first issue
              </Link>
              .
            </>
          )
        }
        testId="issue-list"
      />
    </>
  );
});
