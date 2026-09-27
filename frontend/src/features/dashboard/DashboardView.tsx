"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import type { RecentEntryKind } from "@/lib/apiClient";
import { formatDateOnly } from "@/components/ui/labels";
import { TASK_STATUS_LABELS } from "@/features/tasks/labels";
import { ISSUE_SEVERITY_LABELS, IssueSeverityTag, IssueStatusTag } from "@/features/issues/labels";
import { FEEDBACK_TYPE_LABELS } from "@/features/feedback/labels";
import { entryHref, type DashboardView as DashboardViewModel } from "@/stores/DashboardStore";
import { useStores } from "@/stores/StoreProvider";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";
import entryStyles from "@/components/entries/entries.module.css";
import styles from "./dashboard.module.css";

const KIND_LABELS: Record<RecentEntryKind, string> = {
  TASK: "Task",
  ISSUE: "Issue",
  FEEDBACK: "Feedback",
  NOTE: "Note",
};

const KIND_CLASS: Record<RecentEntryKind, string> = {
  TASK: entryStyles.tagInProgress,
  ISSUE: entryStyles.tagBlocked,
  FEEDBACK: entryStyles.tagDone,
  NOTE: entryStyles.tagTodo,
};

interface SummaryProps {
  view: DashboardViewModel;
  /** Recruit's own dashboard: empty states offer "Create your first …" links. */
  canCreate: boolean;
  /** Set on the manager/admin tab so detail links carry `?recruitId=`. */
  recruitId?: string | null;
}

function CreateLink({ show, href, label }: { show: boolean; href: string; label: string }) {
  return show ? <Link href={href}>Create your first {label}</Link> : null;
}

/** Presentational dashboard for one loaded summary (count cards, completion, open issues, recent entries). */
export function DashboardSummaryView({ view, canCreate, recruitId }: SummaryProps) {
  const { tasks, issues, feedback, notes, recentEntries } = view;
  return (
    <div className={styles.stack} data-testid="dashboard">
      <div className={styles.cards}>
        <div className={styles.card} data-testid="dashboard-card-tasks">
          <div className={styles.cardHead}>
            <span className={styles.cardLabel}>Tasks</span>
            <span className={styles.cardValue} data-testid="dashboard-tasks-total">{tasks.total}</span>
          </div>
          {tasks.total === 0 ? (
            <p className={styles.cardEmpty} data-testid="dashboard-tasks-empty">
              No tasks yet. <CreateLink show={canCreate} href="/tasks/new" label="task" />
            </p>
          ) : (
            <ul className={styles.breakdown}>
              {tasks.byStatus.map((r) => (
                <li key={r.key} data-testid={`dashboard-task-${r.key}`}>
                  <span>{TASK_STATUS_LABELS[r.key]}</span>
                  <span className={styles.breakdownCount}>{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.card} data-testid="dashboard-card-issues">
          <div className={styles.cardHead}>
            <span className={styles.cardLabel}>Open issues</span>
            <span className={styles.cardValue} data-testid="dashboard-issues-open">{issues.open}</span>
          </div>
          {issues.total === 0 ? (
            <p className={styles.cardEmpty} data-testid="dashboard-issues-empty">
              No issues logged. <CreateLink show={canCreate} href="/issues/new" label="issue" />
            </p>
          ) : (
            <>
              <ul className={styles.breakdown}>
                {issues.bySeverity.map((r) => (
                  <li key={r.key} data-testid={`dashboard-issue-${r.key}`}>
                    <span>{ISSUE_SEVERITY_LABELS[r.key]}</span>
                    <span className={styles.breakdownCount}>{r.count}</span>
                  </li>
                ))}
              </ul>
              <span className={styles.cardEmpty} data-testid="dashboard-issues-total">
                {issues.total} total
              </span>
            </>
          )}
        </div>

        {feedback && (
          <div className={styles.card} data-testid="dashboard-card-feedback">
            <div className={styles.cardHead}>
              <span className={styles.cardLabel}>Feedback</span>
              <span className={styles.cardValue} data-testid="dashboard-feedback-total">{feedback.total}</span>
            </div>
            {feedback.total === 0 ? (
              <p className={styles.cardEmpty} data-testid="dashboard-feedback-empty">
                No feedback yet. <CreateLink show={canCreate} href="/feedback/new" label="feedback note" />
              </p>
            ) : (
              <ul className={styles.breakdown}>
                {feedback.byType.map((r) => (
                  <li key={r.key} data-testid={`dashboard-feedback-${r.key}`}>
                    <span>{FEEDBACK_TYPE_LABELS[r.key]}</span>
                    <span className={styles.breakdownCount}>{r.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={styles.card} data-testid="dashboard-card-notes">
          <div className={styles.cardHead}>
            <span className={styles.cardLabel}>Notes</span>
            <span className={styles.cardValue} data-testid="dashboard-notes-total">{notes.total}</span>
          </div>
          {notes.total === 0 && (
            <p className={styles.cardEmpty} data-testid="dashboard-notes-empty">
              No notes yet. <CreateLink show={canCreate} href="/notes/new" label="note" />
            </p>
          )}
        </div>
      </div>

      <div className={styles.progress} data-testid="dashboard-completion">
        <div className={styles.progressHead}>
          <span id="dashboard-completion-label">Task completion</span>
          <span data-testid="dashboard-completion-percent">{tasks.completionPercent}%</span>
        </div>
        <div
          className={styles.bar}
          role="progressbar"
          aria-labelledby="dashboard-completion-label"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={tasks.completionPercent}
        >
          <div className={styles.barFill} style={{ width: `${tasks.completionPercent}%` }} />
        </div>
      </div>

      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="dashboard-open-issues">
          <h2 id="dashboard-open-issues" className={styles.panelTitle}>
            Open issues
          </h2>
          {issues.recentOpen.length === 0 ? (
            <p className={styles.emptyText} data-testid="dashboard-open-issues-empty">
              No open issues.
            </p>
          ) : (
            <ul className={styles.list} data-testid="dashboard-open-issues">
              {issues.recentOpen.map((issue) => (
                <li key={issue.id}>
                  <Link href={entryHref("ISSUE", issue.id, recruitId)} className={styles.row}>
                    <IssueSeverityTag severity={issue.severity} />
                    <span className={styles.rowTitle}>{issue.title}</span>
                    <IssueStatusTag status={issue.status} />
                    <span className={styles.rowDate}>{formatDateOnly(issue.entryDate)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="dashboard-recent">
          <h2 id="dashboard-recent" className={styles.panelTitle}>
            Recent entries
          </h2>
          {recentEntries.length === 0 ? (
            <p className={styles.emptyText} data-testid="dashboard-recent-empty">
              Nothing logged yet{canCreate ? " — " : "."}
              {canCreate && <Link href="/tasks/new">create a task</Link>}
            </p>
          ) : (
            <ul className={styles.list} data-testid="dashboard-recent">
              {recentEntries.map((e) => (
                <li key={`${e.kind}-${e.id}`} data-testid="dashboard-recent-item">
                  <Link href={e.href} className={styles.row}>
                    <span className={`${entryStyles.tag} ${KIND_CLASS[e.kind]}`}>{KIND_LABELS[e.kind]}</span>
                    <span className={styles.rowTitle}>{e.title}</span>
                    <span className={styles.rowDate}>{formatDateOnly(e.entryDate)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Loads and renders the dashboard. Without `recruitId` it is the signed-in
 * recruit's own dashboard; with it, the read-only manager/admin tab.
 */
export const DashboardView = observer(function DashboardView({ recruitId = null }: { recruitId?: string | null }) {
  const { dashboard } = useStores();

  useEffect(() => {
    void dashboard.load(recruitId);
  }, [dashboard, recruitId]);

  const view = dashboard.view;
  return (
    <div aria-busy={dashboard.loading} className={styles.stack}>
      {dashboard.error && (
        <div className={`${formStyles.formError} ${styles.errorBanner}`} role="alert" data-testid="dashboard-error">
          <span>{dashboard.error}</span>
          {dashboard.retryable && (
            <button
              type="button"
              className={`${formStyles.button} ${formStyles.buttonSecondary} ${styles.retry}`}
              onClick={() => void dashboard.retry()}
              disabled={dashboard.loading}
              data-testid="dashboard-retry"
            >
              {dashboard.loading ? "Retrying…" : "Retry"}
            </button>
          )}
        </div>
      )}
      {!view && dashboard.loading && <p className={tableStyles.muted}>Loading…</p>}
      {view && <DashboardSummaryView view={view} canCreate={!recruitId} recruitId={recruitId} />}
    </div>
  );
});
