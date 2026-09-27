"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge, formatDate, formatDateTime } from "@/components/ui/labels";
import formStyles from "@/components/ui/forms.module.css";
import styles from "@/components/ui/table.module.css";
import { useStores } from "@/stores/StoreProvider";

/** Manager view: `GET /me/recruits` (only ACTIVE assignments to me). */
const MyRecruits = observer(function MyRecruits() {
  const { assignments } = useStores();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("fullName,asc");

  useEffect(() => {
    void assignments.loadMyRecruits(page, sort).then((shown) => {
      if (shown !== page) setPage(shown);
    });
  }, [assignments, page, sort]);

  const data = assignments.myRecruits;

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="recruits-title" style={{ maxWidth: 1000 }}>
      <div className={styles.headerRow}>
        <div>
          <h1 id="recruits-title" className={formStyles.title}>
            My recruits
          </h1>
          <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
            New recruits currently assigned to you.
          </p>
        </div>
        <div className={formStyles.field}>
          <label htmlFor="recruits-sort" className={formStyles.label}>
            Sort
          </label>
          <select id="recruits-sort" className={styles.select} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="fullName,asc">Name A→Z</option>
            <option value="fullName,desc">Name Z→A</option>
            <option value="assignedAt,desc">Recently assigned</option>
            <option value="assignedAt,asc">Longest assigned</option>
          </select>
        </div>
      </div>
      {assignments.myRecruitsError && (
        <div className={formStyles.formError} role="alert">
          {assignments.myRecruitsError}
        </div>
      )}
      {data && data.items.length === 0 && (
        <p className={styles.empty} data-testid="recruits-empty">
          No recruits are assigned to you yet.
        </p>
      )}
      {data && data.items.length > 0 && (
        <ul className={styles.cards} data-testid="recruit-cards" style={{ listStyle: "none" }}>
          {data.items.map((r) => (
            <li key={r.recruit.id} className={styles.recruitCard} data-testid="recruit-card">
              <Link href={`/recruits/${r.recruit.id}`} className={`${styles.recruitName} ${styles.rowLink}`}>
                {r.recruit.fullName}
              </Link>
              <span className={styles.muted}>{r.recruit.email}</span>
              <span className={styles.muted}>
                {r.recruit.department ?? "No department"} · starts {r.recruit.startDate ? formatDate(r.recruit.startDate) : "—"}
              </span>
              <span className={styles.muted}>Assigned {formatDateTime(r.assignedAt)}</span>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data} onPageChange={setPage} disabled={assignments.myRecruitsLoading} />
    </section>
  );
});

/** Admin view: every ACTIVE assignment via `GET /assignments?status=ACTIVE`. */
const AllRecruits = observer(function AllRecruits() {
  const { assignments } = useStores();

  useEffect(() => {
    void assignments.loadActiveAssignments();
  }, [assignments, assignments.activeAssignmentsPage]);

  const data = assignments.activeAssignments;

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="recruits-title" style={{ maxWidth: 1000 }}>
      <div className={styles.headerRow}>
        <div>
          <h1 id="recruits-title" className={formStyles.title}>
            All recruits
          </h1>
          <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
            Every recruit with an active manager. Unassigned recruits appear under{" "}
            <Link href="/admin/users?role=NEW_RECRUIT" className={styles.rowLink}>
              Users
            </Link>
            .
          </p>
        </div>
        <Link href="/admin/assignments" className={`${formStyles.button} ${formStyles.buttonSecondary}`}>
          Assignment log
        </Link>
      </div>
      {assignments.activeAssignmentsError && (
        <div className={formStyles.formError} role="alert">
          {assignments.activeAssignmentsError}
        </div>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="all-recruits-table" aria-busy={assignments.activeAssignmentsLoading}>
          <thead>
            <tr>
              <th>Recruit</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Since</th>
            </tr>
          </thead>
          <tbody>
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  No recruits are assigned yet.
                </td>
              </tr>
            )}
            {data?.items.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/recruits/${a.recruit.id}`} className={styles.rowLink}>
                    {a.recruit.fullName}
                  </Link>
                  <div className={styles.muted}>
                    {a.recruit.email} ·{" "}
                    <Link href={`/admin/users/${a.recruit.id}`} className={styles.rowLink}>
                      manage
                    </Link>
                  </div>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={data}
        onPageChange={(p) => assignments.setActiveAssignmentsPage(p)}
        disabled={assignments.activeAssignmentsLoading}
      />
    </section>
  );
});

const RecruitsContent = observer(function RecruitsContent() {
  const { auth } = useStores();
  return auth.role === "ADMIN" ? <AllRecruits /> : <MyRecruits />;
});

export default function RecruitsPage() {
  return (
    <RequireRole roles={["MANAGER", "ADMIN"]}>
      <RecruitsContent />
    </RequireRole>
  );
}
