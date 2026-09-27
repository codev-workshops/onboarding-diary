"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge, formatDateTime } from "@/components/ui/labels";
import formStyles from "@/components/ui/forms.module.css";
import styles from "@/components/ui/table.module.css";
import type { AssignmentStatus } from "@/lib/apiClient";
import { useStores } from "@/stores/StoreProvider";

const AssignmentsList = observer(function AssignmentsList() {
  const { assignments } = useStores();

  useEffect(() => {
    void assignments.loadAssignments();
  }, [assignments, assignments.filters, assignments.page, assignments.sort]);

  const page = assignments.assignments;

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="assignments-title" style={{ maxWidth: 1100 }}>
      <div className={styles.headerRow}>
        <div>
          <h1 id="assignments-title" className={formStyles.title}>
            Assignments
          </h1>
          <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
            Every manager ↔ recruit assignment, including superseded ones. Assign from a recruit&apos;s user page.
          </p>
        </div>
        <Link href="/recruits" className={`${formStyles.button} ${formStyles.buttonSecondary}`}>
          All recruits
        </Link>
      </div>

      <div className={styles.toolbar}>
        <div className={formStyles.field}>
          <label htmlFor="assignments-status" className={formStyles.label}>
            Status
          </label>
          <select
            id="assignments-status"
            className={styles.select}
            value={assignments.filters.status}
            onChange={(e) => assignments.setFilters({ status: e.target.value as AssignmentStatus | "" })}
          >
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="REASSIGNED">REASSIGNED</option>
          </select>
        </div>
        <div className={formStyles.field}>
          <label htmlFor="assignments-sort" className={formStyles.label}>
            Sort
          </label>
          <select
            id="assignments-sort"
            className={styles.select}
            value={assignments.sort}
            onChange={(e) => assignments.setSort(e.target.value)}
          >
            <option value="assignedAt,desc">Newest first</option>
            <option value="assignedAt,asc">Oldest first</option>
            <option value="status,asc">Status</option>
          </select>
        </div>
      </div>

      {assignments.listError && (
        <div className={formStyles.formError} role="alert">
          {assignments.listError}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="assignments-table" aria-busy={assignments.listLoading}>
          <thead>
            <tr>
              <th>Recruit</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Ended</th>
              <th>By</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {page && page.items.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  No assignments yet.
                </td>
              </tr>
            )}
            {page?.items.map((a) => (
              <tr key={a.id} data-testid="assignment-row">
                <td>
                  <Link href={`/admin/users/${a.recruit.id}`} className={styles.rowLink}>
                    {a.recruit.fullName}
                  </Link>
                </td>
                <td>
                  <Link href={`/admin/users/${a.manager.id}`} className={styles.rowLink}>
                    {a.manager.fullName}
                  </Link>
                </td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                <td>{formatDateTime(a.assignedAt)}</td>
                <td>{a.endedAt ? formatDateTime(a.endedAt) : <span className={styles.muted}>—</span>}</td>
                <td>{a.assignedBy.fullName}</td>
                <td>{a.note ?? <span className={styles.muted}>—</span>}</td>
              </tr>
            ))}
            {!page && assignments.listLoading && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} onPageChange={(p) => assignments.setPage(p)} disabled={assignments.listLoading} />
    </section>
  );
});

export default function AdminAssignmentsPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <AssignmentsList />
    </RequireRole>
  );
}
