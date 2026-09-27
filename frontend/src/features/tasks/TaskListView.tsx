"use client";

import { observer } from "mobx-react-lite";
import Link from "next/link";
import { useCallback, useEffect } from "react";
import { EntryList } from "@/components/entries/EntryList";
import { FilterBar } from "@/components/entries/FilterBar";
import { isIsoDate, useUrlFilters } from "@/hooks/useUrlFilters";
import { useStores } from "@/stores/StoreProvider";
import { DEFAULT_TASK_FILTERS, DEFAULT_TASK_SORT, isTaskCategory, isTaskStatus, type TaskFilters } from "@/stores/TaskStore";
import { CATEGORY_OPTIONS, STATUS_OPTIONS, TaskCard } from "@/features/tasks/labels";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const TASK_FILTER_FIELDS = [
  { key: "from", label: "From", type: "date" as const },
  { key: "to", label: "To", type: "date" as const },
  { key: "category", label: "Category", type: "select" as const, options: CATEGORY_OPTIONS, placeholder: "All categories" },
  { key: "status", label: "Status", type: "select" as const, options: STATUS_OPTIONS, placeholder: "All statuses" },
];

const SORT_OPTIONS = [
  { value: "entryDate,desc", label: "Newest first" },
  { value: "entryDate,asc", label: "Oldest first" },
  { value: "priority,desc", label: "Priority" },
  { value: "status,asc", label: "Status" },
  { value: "title,asc", label: "Title A→Z" },
];
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);

function sanitizeTaskFilter(key: keyof TaskFilters, raw: string): string | undefined {
  switch (key) {
    case "category":
      return isTaskCategory(raw) ? raw : undefined;
    case "status":
      return isTaskStatus(raw) ? raw : undefined;
    default:
      return isIsoDate(raw) ? raw : undefined;
  }
}

interface TaskListViewProps {
  /** Manager/admin read-only view of another recruit; `null` = the signed-in recruit. */
  recruitId?: string | null;
  /** Detail route builder; defaults to `/tasks/{id}`. */
  hrefFor?: (id: string) => string;
  readOnly?: boolean;
}

/**
 * Filter bar + paginated list, with filters/page/sort mirrored in the URL query.
 * Used by /tasks (recruit) and the /recruits/{id} Tasks tab (manager/admin).
 */
export const TaskListView = observer(function TaskListView({ recruitId = null, hrefFor, readOnly }: TaskListViewProps) {
  const { tasks } = useStores();
  const { state, set, reset } = useUrlFilters<TaskFilters>({
    defaults: DEFAULT_TASK_FILTERS,
    defaultSort: DEFAULT_TASK_SORT,
    sanitize: sanitizeTaskFilter,
    sortOptions: SORT_VALUES,
  });

  useEffect(() => {
    tasks.setRecruitId(recruitId);
    tasks.setFilters(state.filters);
    tasks.setSort(state.sort);
    tasks.setPage(state.page);
    void tasks.load();
  }, [tasks, recruitId, state]);

  // The store clamps an out-of-range page to the last one; mirror that in the URL.
  const loadedPage = tasks.list?.page;
  useEffect(() => {
    if (!tasks.listLoading && loadedPage !== undefined && loadedPage !== state.page) set({ page: loadedPage });
  }, [tasks.listLoading, loadedPage, state.page, set]);

  const onPageChange = useCallback((page: number) => set({ page }), [set]);
  const linkFor = hrefFor ?? ((id: string) => `/tasks/${id}`);

  return (
    <>
      <FilterBar
        fields={TASK_FILTER_FIELDS}
        values={state.filters}
        onChange={(patch) => set({ filters: patch })}
        onReset={reset}
        hasActiveFilters={tasks.hasActiveFilters}
        disabled={tasks.listLoading && !tasks.list}
        idPrefix="tasks"
      >
        <div className={formStyles.field}>
          <label htmlFor="tasks-sort" className={formStyles.label}>
            Sort
          </label>
          <select id="tasks-sort" className={tableStyles.select} value={state.sort} onChange={(e) => set({ sort: e.target.value })}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>
      <EntryList
        page={tasks.list}
        loading={tasks.listLoading}
        error={tasks.listError}
        renderItem={(task) => <TaskCard task={task} />}
        hrefFor={(task) => linkFor(task.id)}
        onPageChange={onPageChange}
        hasActiveFilters={tasks.hasActiveFilters}
        filteredEmptyMessage="No tasks match these filters."
        emptyMessage={
          readOnly ? (
            "This recruit has not logged any tasks yet."
          ) : (
            <>
              No tasks yet.{" "}
              <Link href="/tasks/new" className={tableStyles.rowLink}>
                Log your first task
              </Link>
              .
            </>
          )
        }
        testId="task-list"
      />
    </>
  );
});
