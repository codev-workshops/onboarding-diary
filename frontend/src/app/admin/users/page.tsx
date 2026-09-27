"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useEffect, useState, type FormEvent } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { FormField } from "@/components/ui/FormField";
import { Pagination } from "@/components/ui/Pagination";
import { ROLES, ROLE_LABELS, StatusBadge, USER_STATUSES } from "@/components/ui/labels";
import formStyles from "@/components/ui/forms.module.css";
import styles from "@/components/ui/table.module.css";
import type { Role, UserStatus } from "@/lib/apiClient";
import { useStores } from "@/stores/StoreProvider";

const UsersList = observer(function UsersList() {
  const { admin } = useStores();
  const [q, setQ] = useState(admin.filters.q);

  useEffect(() => {
    void admin.loadUsers();
  }, [admin, admin.filters, admin.page, admin.sort]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    admin.setFilters({ q });
  };

  const onReset = () => {
    setQ("");
    admin.resetList();
  };

  const page = admin.users;

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="users-title" style={{ maxWidth: 1100 }}>
      <div className={styles.headerRow}>
        <div>
          <h1 id="users-title" className={formStyles.title}>
            Users
          </h1>
          <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
            Invite, edit and deactivate users; assign managers from a user&apos;s page.
          </p>
        </div>
        <Link href="/admin/users/new" className={formStyles.button} data-testid="invite-user">
          Invite user
        </Link>
      </div>

      <form className={styles.toolbar} onSubmit={onSearch} role="search" aria-label="Filter users">
        <FormField
          id="users-q"
          label="Search"
          placeholder="Name or email"
          maxLength={100}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className={formStyles.field}>
          <label htmlFor="users-role" className={formStyles.label}>
            Role
          </label>
          <select
            id="users-role"
            className={styles.select}
            value={admin.filters.role}
            onChange={(e) => admin.setFilters({ role: e.target.value as Role | "" })}
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className={formStyles.field}>
          <label htmlFor="users-status" className={formStyles.label}>
            Status
          </label>
          <select
            id="users-status"
            className={styles.select}
            value={admin.filters.status}
            onChange={(e) => admin.setFilters({ status: e.target.value as UserStatus | "" })}
          >
            <option value="">All statuses</option>
            {USER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className={formStyles.field}>
          <label htmlFor="users-sort" className={formStyles.label}>
            Sort
          </label>
          <select id="users-sort" className={styles.select} value={admin.sort} onChange={(e) => admin.setSort(e.target.value)}>
            <option value="fullName,asc">Name A→Z</option>
            <option value="fullName,desc">Name Z→A</option>
            <option value="email,asc">Email A→Z</option>
            <option value="createdAt,desc">Newest first</option>
            <option value="createdAt,asc">Oldest first</option>
            <option value="startDate,asc">Start date ↑</option>
            <option value="startDate,desc">Start date ↓</option>
          </select>
        </div>
        <div className={styles.toolbarActions}>
          <button type="submit" className={formStyles.button}>
            Search
          </button>
          <button type="button" className={`${formStyles.button} ${formStyles.buttonSecondary}`} onClick={onReset}>
            Reset
          </button>
        </div>
      </form>

      {admin.listError && (
        <div className={formStyles.formError} role="alert">
          {admin.listError}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="users-table" aria-busy={admin.listLoading}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Department</th>
              <th>Start date</th>
            </tr>
          </thead>
          <tbody>
            {page && page.items.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  No users match the current filters.
                </td>
              </tr>
            )}
            {page?.items.map((u) => (
              <tr key={u.id} data-testid="user-row">
                <td>
                  <Link href={`/admin/users/${u.id}`} className={styles.rowLink}>
                    {u.fullName}
                  </Link>
                </td>
                <td>{u.email}</td>
                <td>{ROLE_LABELS[u.role]}</td>
                <td>
                  <StatusBadge status={u.status} />
                </td>
                <td>{u.department ?? <span className={styles.muted}>—</span>}</td>
                <td>{u.startDate ?? <span className={styles.muted}>—</span>}</td>
              </tr>
            ))}
            {!page && admin.listLoading && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} onPageChange={(p) => admin.setPage(p)} disabled={admin.listLoading} />
    </section>
  );
});

export default function AdminUsersPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <UsersList />
    </RequireRole>
  );
}
