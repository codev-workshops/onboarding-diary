"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/lib/protected-route";
import {
  listIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  escalateIssue,
  type IssueDto,
  type CreateIssueRequest,
  type UpdateIssueRequest,
  type IssueListParams,
} from "@/lib/api";
import styles from "./issues.module.css";

const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
const STATUSES = ["Open", "InProgress", "Resolved", "Closed"] as const;

const STATUS_LABELS: Record<string, string> = {
  Open: "Open",
  InProgress: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

const SEVERITY_BADGE: Record<string, string> = {
  Low: styles.badgeSeverityLow,
  Medium: styles.badgeSeverityMedium,
  High: styles.badgeSeverityHigh,
  Critical: styles.badgeSeverityCritical,
};

const SEVERITY_RADIO: Record<string, string> = {
  Low: styles.sevLow,
  Medium: styles.sevMedium,
  High: styles.sevHigh,
  Critical: styles.sevCritical,
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface IssueFormData {
  date: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  resolutionNotes: string;
}

function emptyForm(): IssueFormData {
  return { date: todayStr(), title: "", description: "", severity: "Low", status: "Open", resolutionNotes: "" };
}

interface FormErrors {
  title?: string;
  description?: string;
  date?: string;
  resolutionNotes?: string;
}

function isResolvedOrClosed(status: string): boolean {
  return status === "Resolved" || status === "Closed";
}

function validateForm(data: IssueFormData, isEdit: boolean): FormErrors {
  const errs: FormErrors = {};
  if (!data.title.trim()) errs.title = "Title is required.";
  else if (data.title.trim().length < 3) errs.title = "Title must be at least 3 characters.";
  else if (data.title.trim().length > 150) errs.title = "Title must be at most 150 characters.";
  if (data.title !== data.title.trim()) errs.title = "Title must not have leading or trailing whitespace.";
  if (!data.description.trim()) errs.description = "Description is required.";
  else if (data.description.trim().length < 10) errs.description = "Description must be at least 10 characters.";
  else if (data.description.length > 3000) errs.description = "Description must be at most 3000 characters.";
  if (!isEdit) {
    if (!data.date) errs.date = "Date is required.";
    else if (data.date > todayStr()) errs.date = "Date must not be in the future.";
  }
  if (isResolvedOrClosed(data.status) && !data.resolutionNotes.trim()) {
    errs.resolutionNotes = "Resolution notes are required when status is Resolved or Closed.";
  }
  if (data.resolutionNotes.length > 2000) {
    errs.resolutionNotes = "Resolution notes must be at most 2000 characters.";
  }
  return errs;
}

function statusBadgeClass(status: string): string {
  if (status === "Resolved") return `${styles.badge} ${styles.badgeStatusResolved}`;
  if (status === "Closed") return `${styles.badge} ${styles.badgeStatusClosed}`;
  return `${styles.badge} ${styles.badgeStatus}`;
}

function isAlertSeverity(severity: string): boolean {
  return severity === "Critical" || severity === "High";
}

function IssuesContent() {
  const [issues, setIssues] = useState<IssueDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueDto | null>(null);
  const [formData, setFormData] = useState<IssueFormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [escalateModal, setEscalateModal] = useState<string | null>(null);
  const [escalateMessage, setEscalateMessage] = useState("");
  const [escalating, setEscalating] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: IssueListParams = { page, limit: 20 };
        if (filterStatus) params.status = filterStatus;
        if (filterSeverity) params.severity = filterSeverity;
        if (filterStartDate) params.startDate = filterStartDate;
        if (filterEndDate) params.endDate = filterEndDate;
        const res = await listIssues(params);
        if (!cancelled) {
          setIssues(res.issues);
          setTotalPages(res.totalPages);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : "Failed to load issues.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, filterStatus, filterSeverity, filterStartDate, filterEndDate, showToast, refreshKey]);

  function openCreate() {
    setEditingIssue(null);
    setFormData(emptyForm());
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(issue: IssueDto) {
    setEditingIssue(issue);
    setFormData({
      date: issue.date.slice(0, 10),
      title: issue.title,
      description: issue.description ?? "",
      severity: issue.severity,
      status: issue.status,
      resolutionNotes: issue.resolutionNotes ?? "",
    });
    setFormErrors({});
    setModalOpen(true);
  }

  async function handleSave() {
    const isEdit = !!editingIssue;
    const errs = validateForm(formData, isEdit);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (editingIssue) {
        const payload: UpdateIssueRequest = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          severity: formData.severity,
          status: formData.status,
          resolutionNotes: formData.resolutionNotes.trim() || null,
        };
        await updateIssue(editingIssue.id, payload);
        showToast("Issue updated successfully.", "success");
      } else {
        const payload: CreateIssueRequest = {
          date: new Date(formData.date).toISOString(),
          title: formData.title.trim(),
          description: formData.description.trim(),
          severity: formData.severity,
          status: formData.status,
          resolutionNotes: formData.resolutionNotes.trim() || null,
        };
        await createIssue(payload);
        showToast("Issue created successfully.", "success");
      }

      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save issue.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteIssue(id);
      showToast("Issue deleted.", "success");
      setDeleteConfirm(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete issue.", "error");
    }
  }

  async function handleEscalate() {
    if (!escalateModal || !escalateMessage.trim()) return;
    setEscalating(true);
    try {
      await escalateIssue(escalateModal, { message: escalateMessage.trim() });
      showToast("Issue escalated to manager.", "success");
      setEscalateModal(null);
      setEscalateMessage("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to escalate issue.", "error");
    } finally {
      setEscalating(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Issue Log</h1>
        <button className={styles.newBtn} onClick={openCreate}>
          + Log Issue
        </button>
      </div>

      <div className={styles.filters}>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}>
          <option value="">All Severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }} placeholder="Start date" />
        <input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }} placeholder="End date" />
      </div>

      {loading ? (
        <p className={styles.empty}>Loading issues...</p>
      ) : issues.length === 0 ? (
        <p className={styles.empty}>No issues found. Click &quot;+ Log Issue&quot; to create one.</p>
      ) : (
        <>
          <div className={styles.issueList}>
            {issues.map((issue) => (
              <div key={issue.id} className={`${styles.issueCard} ${isAlertSeverity(issue.severity) ? styles.issueCardAlert : ""}`}>
                <div className={styles.issueCardHeader}>
                  <div>
                    <span className={styles.issueTitle}>{issue.title}</span>
                    <span className={styles.issueDate}> &mdash; {new Date(issue.date).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEdit(issue)}>Edit</button>
                    {!issue.isEscalated && (
                      <button className={styles.escalateBtn} onClick={() => { setEscalateModal(issue.id); setEscalateMessage(""); }}>Escalate</button>
                    )}
                    {deleteConfirm === issue.id ? (
                      <>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(issue.id)}>Confirm</button>
                        <button className={styles.editBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(issue.id)}>Delete</button>
                    )}
                  </div>
                </div>
                <div className={styles.badges}>
                  <span className={`${styles.badge} ${SEVERITY_BADGE[issue.severity] ?? styles.badgeSeverityLow}`}>{issue.severity}</span>
                  <span className={statusBadgeClass(issue.status)}>{STATUS_LABELS[issue.status] ?? issue.status}</span>
                  {issue.isEscalated && <span className={`${styles.badge} ${styles.badgeEscalated}`}>Escalated</span>}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {totalPages} ({total} issues)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{editingIssue ? "Edit Issue" : "Log New Issue"}</h2>
            <div className={styles.form}>
              {!editingIssue && (
                <div className={styles.field}>
                  <label htmlFor="issueDate">Date</label>
                  <input id="issueDate" type="date" value={formData.date} max={todayStr()} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                  {formErrors.date && <p className={styles.fieldError}>{formErrors.date}</p>}
                </div>
              )}
              <div className={styles.field}>
                <label htmlFor="issueTitle">Title</label>
                <input id="issueTitle" type="text" maxLength={150} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Issue title (3-150 chars)" />
                {formErrors.title && <p className={styles.fieldError}>{formErrors.title}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="issueDesc">Description</label>
                <textarea id="issueDesc" maxLength={3000} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the issue (10-3000 chars)" />
                {formErrors.description && <p className={styles.fieldError}>{formErrors.description}</p>}
              </div>
              <div className={styles.field}>
                <label>Severity</label>
                <div className={styles.severityRadios}>
                  {SEVERITIES.map((s) => (
                    <label key={s} className={`${SEVERITY_RADIO[s]} ${formData.severity === s ? styles.selected : ""}`}>
                      <input
                        type="radio"
                        name="severity"
                        value={s}
                        checked={formData.severity === s}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="issueStatus">Status</label>
                <select id="issueStatus" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="issueResNotes">Resolution Notes</label>
                <textarea
                  id="issueResNotes"
                  maxLength={2000}
                  value={formData.resolutionNotes}
                  onChange={(e) => setFormData({ ...formData, resolutionNotes: e.target.value })}
                  placeholder={isResolvedOrClosed(formData.status) ? "Required for resolved/closed issues" : "Optional"}
                  disabled={!isResolvedOrClosed(formData.status)}
                />
                {formErrors.resolutionNotes && <p className={styles.fieldError}>{formErrors.resolutionNotes}</p>}
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className={styles.saveBtn} type="button" disabled={saving} onClick={handleSave}>
                  {saving ? "Saving..." : editingIssue ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {escalateModal && (
        <div className={styles.overlay} onClick={() => setEscalateModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Escalate to Manager</h2>
            <div className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="escalateMsg">Message</label>
                <textarea
                  id="escalateMsg"
                  maxLength={2000}
                  value={escalateMessage}
                  onChange={(e) => setEscalateMessage(e.target.value)}
                  placeholder="Describe why this issue needs escalation"
                />
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} type="button" onClick={() => setEscalateModal(null)}>Cancel</button>
                <button className={styles.saveBtn} type="button" disabled={escalating || !escalateMessage.trim()} onClick={handleEscalate}>
                  {escalating ? "Escalating..." : "Escalate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function IssuesPage() {
  return (
    <ProtectedRoute>
      <IssuesContent />
    </ProtectedRoute>
  );
}
