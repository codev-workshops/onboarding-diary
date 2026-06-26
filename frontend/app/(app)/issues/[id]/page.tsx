"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import { getIssue, updateIssue, escalateIssue, type IssueDto, type UpdateIssueRequest } from "@/lib/api";
import styles from "../issues.module.css";

const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
const STATUSES = ["Open", "InProgress", "Resolved", "Closed"] as const;

const STATUS_LABELS: Record<string, string> = {
  Open: "Open",
  InProgress: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

const SEVERITY_RADIO: Record<string, string> = {
  Low: styles.sevLow,
  Medium: styles.sevMedium,
  High: styles.sevHigh,
  Critical: styles.sevCritical,
};

function isResolvedOrClosed(status: string): boolean {
  return status === "Resolved" || status === "Closed";
}

interface FormErrors {
  title?: string;
  description?: string;
  resolutionNotes?: string;
}

function IssueDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [issue, setIssue] = useState<IssueDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Low");
  const [status, setStatus] = useState("Open");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateMessage, setEscalateMessage] = useState("");
  const [escalating, setEscalating] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await getIssue(id);
        setIssue(res.issue);
        setTitle(res.issue.title);
        setDescription(res.issue.description ?? "");
        setSeverity(res.issue.severity);
        setStatus(res.issue.status);
        setResolutionNotes(res.issue.resolutionNotes ?? "");
      } catch {
        showToast("Issue not found.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, showToast]);

  async function handleSave() {
    const errs: FormErrors = {};
    if (!title.trim()) errs.title = "Title is required.";
    else if (title.trim().length < 3) errs.title = "Title must be at least 3 characters.";
    else if (title.trim().length > 150) errs.title = "Title must be at most 150 characters.";
    else if (title !== title.trim()) errs.title = "Title must not have leading or trailing whitespace.";
    if (!description.trim()) errs.description = "Description is required.";
    else if (description.trim().length < 10) errs.description = "Description must be at least 10 characters.";
    else if (description.length > 3000) errs.description = "Description must be at most 3000 characters.";
    if (isResolvedOrClosed(status) && !resolutionNotes.trim()) {
      errs.resolutionNotes = "Resolution notes are required when status is Resolved or Closed.";
    }
    if (resolutionNotes.length > 2000) errs.resolutionNotes = "Resolution notes must be at most 2000 characters.";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: UpdateIssueRequest = {
        title: title.trim(),
        description: description.trim(),
        severity,
        status,
        resolutionNotes: isResolvedOrClosed(status) ? (resolutionNotes.trim() || null) : null,
      };
      await updateIssue(id, payload);
      showToast("Issue updated successfully.", "success");
      setTimeout(() => router.push("/issues"), 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update issue.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleEscalate() {
    if (!escalateMessage.trim()) return;
    setEscalating(true);
    try {
      await escalateIssue(id, { message: escalateMessage.trim() });
      showToast("Issue escalated to manager.", "success");
      setEscalateOpen(false);
      setEscalateMessage("");
      const res = await getIssue(id);
      setIssue(res.issue);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to escalate issue.", "error");
    } finally {
      setEscalating(false);
    }
  }

  if (loading) return <div className={styles.container}><p className={styles.empty}>Loading...</p></div>;
  if (!issue) return <div className={styles.container}><p className={styles.empty}>Issue not found.</p></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Edit Issue</h1>
        <div className={styles.actions}>
          {!issue.isEscalated && (
            <button className={styles.escalateBtn} onClick={() => { setEscalateOpen(true); setEscalateMessage(""); }}>
              Escalate to Manager
            </button>
          )}
          <button className={styles.cancelBtn} onClick={() => router.push("/issues")}>Back to Issues</button>
        </div>
      </div>

      <div className={styles.modal} style={{ border: "none", maxWidth: "100%" }}>
        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="issueTitle">Title</label>
            <input id="issueTitle" type="text" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
            {formErrors.title && <p className={styles.fieldError}>{formErrors.title}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="issueDesc">Description</label>
            <textarea id="issueDesc" maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} />
            {formErrors.description && <p className={styles.fieldError}>{formErrors.description}</p>}
          </div>
          <div className={styles.field}>
            <label>Severity</label>
            <div className={styles.severityRadios}>
              {SEVERITIES.map((s) => (
                <label key={s} className={`${SEVERITY_RADIO[s]} ${severity === s ? styles.selected : ""}`}>
                  <input
                    type="radio"
                    name="severity"
                    value={s}
                    checked={severity === s}
                    onChange={(e) => setSeverity(e.target.value)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="issueStatus">Status</label>
            <select id="issueStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="issueResNotes">Resolution Notes</label>
            <textarea
              id="issueResNotes"
              maxLength={2000}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder={isResolvedOrClosed(status) ? "Required for resolved/closed issues" : "Optional"}
              disabled={!isResolvedOrClosed(status)}
            />
            {formErrors.resolutionNotes && <p className={styles.fieldError}>{formErrors.resolutionNotes}</p>}
          </div>
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} type="button" onClick={() => router.push("/issues")}>Cancel</button>
            <button className={styles.saveBtn} type="button" disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </div>
      </div>

      {/* Escalate Modal */}
      {escalateOpen && (
        <div className={styles.overlay} onClick={() => setEscalateOpen(false)}>
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
                <button className={styles.cancelBtn} type="button" onClick={() => setEscalateOpen(false)}>Cancel</button>
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

export default function IssueDetailPage() {
  return (
    <ProtectedRoute>
      <IssueDetailContent />
    </ProtectedRoute>
  );
}
