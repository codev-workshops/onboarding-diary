"use client";

import { observer } from "mobx-react-lite";
import { useEffect, useState, type FormEvent } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge, formatDateTime } from "@/components/ui/labels";
import formStyles from "@/components/ui/forms.module.css";
import styles from "@/components/ui/table.module.css";
import type { UserDetail } from "@/lib/apiClient";
import type { AssignmentStore } from "@/stores/AssignmentStore";

interface AssignmentPanelProps {
  user: UserDetail;
  store: AssignmentStore;
  /** Called after a successful (re)assignment so the owner can refresh the user detail. */
  onAssigned?: () => void;
}

/**
 * Manager assignment panel on /admin/users/{id} for a NEW_RECRUIT: current
 * manager, reassign select, and the full assignment history (newest first).
 * Error copy for ASSIGNMENT_UNCHANGED / INVALID_ASSIGNMENT_PARTY / CONFLICT
 * comes from `AssignmentStore.assignError`.
 */
export const AssignmentPanel = observer(function AssignmentPanel({ user, store, onAssigned }: AssignmentPanelProps) {
  const [managerId, setManagerId] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    void store.loadHistory(user.id);
    void store.loadManagers();
  }, [store, user.id]);

  const current = store.currentAssignment ?? user.currentAssignment;
  const canAssign = user.role === "NEW_RECRUIT" && user.status === "ACTIVE";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!managerId) return;
    try {
      await store.assign({ recruitId: user.id, managerId, note: note.trim() || undefined });
      setManagerId("");
      setNote("");
      onAssigned?.();
    } catch {
      // surfaced through store.assignError
    }
  };

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="assignment-title" data-testid="assignment-panel">
      <h2 id="assignment-title" className={formStyles.title}>
        Manager assignment
      </h2>
      <p className={formStyles.subtitle} data-testid="current-manager">
        {current ? (
          <>
            Current manager: <strong>{current.manager.fullName}</strong> ({current.manager.email}) since{" "}
            {formatDateTime(current.assignedAt)}
          </>
        ) : (
          "No manager assigned yet."
        )}
      </p>

      {canAssign ? (
        <form className={formStyles.form} onSubmit={(e) => void onSubmit(e)} noValidate data-testid="assign-form">
          {store.assignError && (
            <div className={formStyles.formError} role="alert" data-testid="assign-error">
              {store.assignError}
            </div>
          )}
          {store.lastResult && !store.assignError && (
            <div className={formStyles.formSuccess} role="status" data-testid="assign-success">
              {store.lastResult.superseded
                ? `Reassigned from ${store.lastResult.superseded.manager.fullName} to ${store.lastResult.assignment.manager.fullName}.`
                : `Assigned to ${store.lastResult.assignment.manager.fullName}.`}
            </div>
          )}
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="assign-manager" className={formStyles.label}>
                {current ? "Reassign to" : "Assign manager"}
              </label>
              <select
                id="assign-manager"
                className={styles.select}
                value={managerId}
                onChange={(e) => {
                  setManagerId(e.target.value);
                  store.clearAssignFeedback();
                }}
                disabled={store.managersLoading}
                required
              >
                <option value="">Select a manager…</option>
                {store.managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.email}){current?.manager.id === m.id ? " — current" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="assign-note" className={formStyles.label}>
                Note (optional)
              </label>
              <input
                id="assign-note"
                className={formStyles.input}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <div className={formStyles.actions}>
            <button type="submit" className={formStyles.button} disabled={!managerId || store.assignSubmitting}>
              {store.assignSubmitting ? "Saving…" : current ? "Reassign" : "Assign"}
            </button>
          </div>
        </form>
      ) : (
        <p className={styles.muted} data-testid="assign-disabled">
          {user.role !== "NEW_RECRUIT"
            ? "Only new recruits can be assigned a manager."
            : "The recruit must be ACTIVE before a manager can be assigned."}
        </p>
      )}

      <h3 className={formStyles.label} style={{ marginTop: "1.25rem", marginBottom: "0.5rem" }}>
        History
      </h3>
      {store.historyError && (
        <div className={formStyles.formError} role="alert">
          {store.historyError}
        </div>
      )}
      {store.history && store.history.items.length === 0 && (
        <p className={styles.muted} data-testid="history-empty">
          No assignments yet.
        </p>
      )}
      {store.history && store.history.items.length > 0 && (
        <ol className={styles.historyList} data-testid="assignment-history">
          {store.history.items.map((a) => (
            <li key={a.id} className={styles.historyItem} data-testid="history-item">
              <div className={styles.historyHead}>
                <strong>{a.manager.fullName}</strong>
                <StatusBadge status={a.status} />
              </div>
              <span className={styles.muted}>
                {formatDateTime(a.assignedAt)} → {a.endedAt ? formatDateTime(a.endedAt) : "now"} · by {a.assignedBy.fullName}
              </span>
              {a.note && <span>{a.note}</span>}
            </li>
          ))}
        </ol>
      )}
      <Pagination
        page={store.history}
        onPageChange={(p) => void store.loadHistory(user.id, p)}
        disabled={store.historyLoading}
      />
    </section>
  );
});
