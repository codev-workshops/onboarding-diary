"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/lib/protected-route";
import {
  listUsers,
  updateUserRole,
  deactivateUser,
  type UserListItemDto,
} from "@/lib/api";
import { DEPARTMENTS } from "@/lib/constants";
import styles from "./users.module.css";

const ROLES = ["Recruit", "Manager", "Admin"] as const;

function AdminUsersContent() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserListItemDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editRoleUser, setEditRoleUser] = useState<UserListItemDto | null>(null);
  const [newRole, setNewRole] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<UserListItemDto | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const deactivateDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editRoleUser && !deactivateTarget) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setEditRoleUser(null); setDeactivateTarget(null); }
    }
    document.addEventListener("keydown", onKeyDown);
    if (editRoleUser) dialogRef.current?.focus();
    if (deactivateTarget) deactivateDialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editRoleUser, deactivateTarget]);

  useEffect(() => {
    if (currentUser?.role !== "Admin") return;

    let cancelled = false;

    listUsers({
      page,
      limit: 20,
      search: search || undefined,
      role: roleFilter || undefined,
      department: deptFilter || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setUsers(res.users);
        setTotalPages(res.totalPages);
        setTotal(res.total);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, page, search, roleFilter, deptFilter, refreshKey]);

  if (currentUser?.role !== "Admin") {
    return (
      <div className={styles.container}>
        <p className={styles.error}>Access denied. Admin role required.</p>
        <button className={styles.backLink} onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  async function handleRoleSave() {
    if (!editRoleUser || !newRole) return;
    setError("");
    setSuccess("");
    try {
      await updateUserRole(editRoleUser.id, newRole);
      setSuccess(`Role for ${editRoleUser.name} updated to ${newRole}.`);
      setEditRoleUser(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
      setEditRoleUser(null);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setError("");
    setSuccess("");
    try {
      await deactivateUser(deactivateTarget.id);
      setSuccess(`User ${deactivateTarget.name} has been deactivated.`);
      setDeactivateTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate user.");
      setDeactivateTarget(null);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    setLoading(true);
  }

  function handleRoleFilterChange(value: string) {
    setRoleFilter(value);
    setPage(1);
    setLoading(true);
  }

  function handleDeptFilterChange(value: string) {
    setDeptFilter(value);
    setPage(1);
    setLoading(true);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>User Management</h1>
        <button className={styles.backLink} onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <div className={styles.filters} role="search" aria-label="Filter users">
        <input
          type="text"
          placeholder="Search by name or email..."
          aria-label="Search users"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select aria-label="Filter by role" value={roleFilter} onChange={(e) => handleRoleFilterChange(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select aria-label="Filter by department" value={deptFilter} onChange={(e) => handleDeptFilterChange(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Start Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#999" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.department}</td>
                  <td>{u.startDate ? new Date(u.startDate).toLocaleDateString() : "\u2014"}</td>
                  <td>
                    <span className={`${styles.badge} ${u.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => {
                          setEditRoleUser(u);
                          setNewRole(u.role);
                        }}
                      >
                        Edit Role
                      </button>
                      {u.isActive && u.id !== currentUser?.id && (
                        <button
                          className={styles.dangerBtn}
                          onClick={() => setDeactivateTarget(u)}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => { setPage((p) => p - 1); setLoading(true); }}>
            Previous
          </button>
          <span>Page {page} of {totalPages} ({total} users)</span>
          <button disabled={page >= totalPages} onClick={() => { setPage((p) => p + 1); setLoading(true); }}>
            Next
          </button>
        </div>
      )}

      {editRoleUser && (
        <div className={styles.overlay} onClick={() => setEditRoleUser(null)} role="presentation">
          <div ref={dialogRef} className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit Role" tabIndex={-1}>
            <h2>Edit Role</h2>
            <p>Change role for <strong>{editRoleUser.name}</strong></p>
            <div className={styles.dialogField}>
              <label htmlFor="newRole">Role</label>
              <select
                id="newRole"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setEditRoleUser(null)}>
                Cancel
              </button>
              <button className={styles.confirmBtn} onClick={handleRoleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivateTarget && (
        <div className={styles.overlay} onClick={() => setDeactivateTarget(null)} role="presentation">
          <div ref={deactivateDialogRef} className={styles.dialog} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label="Confirm Deactivation" tabIndex={-1}>
            <h2>Confirm Deactivation</h2>
            <p>
              Are you sure you want to deactivate <strong>{deactivateTarget.name}</strong> ({deactivateTarget.email})?
              This will prevent them from signing in.
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setDeactivateTarget(null)}>
                Cancel
              </button>
              <button className={styles.confirmDangerBtn} onClick={handleDeactivate}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute>
      <AdminUsersContent />
    </ProtectedRoute>
  );
}
