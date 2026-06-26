"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/lib/auth-context";
import {
  listFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  type FeedbackListItemDto,
  type CreateFeedbackRequest,
  type UpdateFeedbackRequest,
  type FeedbackListParams,
} from "@/lib/api";
import styles from "./feedback.module.css";

const FEEDBACK_TYPES = ["Positive", "Suggestion", "Concern"] as const;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FeedbackFormData {
  date: string;
  subject: string;
  type: string;
  details: string;
}

function emptyForm(): FeedbackFormData {
  return { date: todayStr(), subject: "", type: "Positive", details: "" };
}

interface FormErrors {
  date?: string;
  subject?: string;
  type?: string;
  details?: string;
}

function validateForm(data: FeedbackFormData): FormErrors {
  const errs: FormErrors = {};
  if (!data.date) errs.date = "Date is required.";
  else if (data.date > todayStr()) errs.date = "Date must not be in the future.";
  if (!data.subject.trim()) errs.subject = "Subject is required.";
  else if (data.subject.trim().length < 3) errs.subject = "Subject must be at least 3 characters.";
  else if (data.subject.trim().length > 150) errs.subject = "Subject must be at most 150 characters.";
  if (data.subject !== data.subject.trim()) errs.subject = "Subject must not have leading or trailing whitespace.";
  if (!data.details.trim()) errs.details = "Details are required.";
  else if (data.details.trim().length < 20) errs.details = "Details must be at least 20 characters.";
  else if (data.details.trim().length > 5000) errs.details = "Details must be at most 5000 characters.";
  return errs;
}

function typeBadgeClass(type: string): string {
  if (type === "Positive") return `${styles.badge} ${styles.badgePositive}`;
  if (type === "Suggestion") return `${styles.badge} ${styles.badgeSuggestion}`;
  if (type === "Concern") return `${styles.badge} ${styles.badgeConcern}`;
  return styles.badge;
}

function typeIndicatorClass(type: string): string {
  if (type === "Positive") return `${styles.typeIndicator} ${styles.typePositive}`;
  if (type === "Suggestion") return `${styles.typeIndicator} ${styles.typeSuggestion}`;
  if (type === "Concern") return `${styles.typeIndicator} ${styles.typeConcern}`;
  return styles.typeIndicator;
}

function FeedbackContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [feedbackItems, setFeedbackItems] = useState<FeedbackListItemDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackListItemDto | null>(null);
  const [formData, setFormData] = useState<FeedbackFormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    modalRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: FeedbackListParams = { page, limit: 20 };
        if (filterType) params.type = filterType;
        if (filterStartDate) params.startDate = filterStartDate;
        if (filterEndDate) params.endDate = filterEndDate;
        if (filterDepartment && isAdmin) params.department = filterDepartment;
        const res = await listFeedback(params);
        if (!cancelled) {
          setFeedbackItems(res.feedback);
          setTotalPages(res.totalPages);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : "Failed to load feedback.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, filterType, filterStartDate, filterEndDate, filterDepartment, isAdmin, showToast, refreshKey]);

  function openCreate() {
    setEditingFeedback(null);
    setFormData(emptyForm());
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(fb: FeedbackListItemDto) {
    setEditingFeedback(fb);
    setFormData({
      date: fb.date.slice(0, 10),
      subject: fb.subject,
      type: fb.type,
      details: fb.details,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  async function handleSave() {
    const errs = validateForm(formData);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (editingFeedback) {
        const payload: UpdateFeedbackRequest = {
          subject: formData.subject.trim(),
          type: formData.type,
          details: formData.details,
        };
        await updateFeedback(editingFeedback.id, payload);
        showToast("Feedback updated successfully.", "success");
      } else {
        const payload: CreateFeedbackRequest = {
          date: new Date(formData.date).toISOString(),
          subject: formData.subject.trim(),
          type: formData.type,
          details: formData.details,
        };
        await createFeedback(payload);
        showToast("Feedback created successfully.", "success");
      }

      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save feedback.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFeedback(id);
      showToast("Feedback deleted.", "success");
      setDeleteConfirm(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete feedback.", "error");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Feedback</h1>
        <button className={styles.newBtn} onClick={openCreate}>
          + New Feedback
        </button>
      </div>

      <div className={styles.filters} role="search" aria-label="Filter feedback">
        <select aria-label="Filter by type" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          {FEEDBACK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input aria-label="Start date filter" type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }} />
        <input aria-label="End date filter" type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }} />
        {isAdmin && (
          <input
            type="text"
            value={filterDepartment}
            onChange={(e) => { setFilterDepartment(e.target.value); setPage(1); }}
            placeholder="Filter by department"
            style={{ minWidth: "150px" }}
          />
        )}
      </div>

      {loading ? (
        <p className={styles.empty}>Loading feedback...</p>
      ) : feedbackItems.length === 0 ? (
        <p className={styles.empty}>No feedback found. Click &quot;+ New Feedback&quot; to create one.</p>
      ) : (
        <>
          <div className={styles.feedbackList}>
            {feedbackItems.map((fb) => (
              <div key={fb.id} className={styles.feedbackCard}>
                <div className={styles.feedbackCardHeader}>
                  <div>
                    <span className={typeIndicatorClass(fb.type)} />
                    {" "}
                    <span className={styles.feedbackSubject}>{fb.subject}</span>
                    <span className={styles.feedbackDate}> &mdash; {new Date(fb.date).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.actions}>
                    {fb.userId === user?.id && (
                      <button className={styles.editBtn} onClick={() => openEdit(fb)} aria-label={`Edit feedback: ${fb.subject}`}>Edit</button>
                    )}
                    {deleteConfirm === fb.id ? (
                      <>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(fb.id)} aria-label={`Confirm delete: ${fb.subject}`}>Confirm</button>
                        <button className={styles.editBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      </>
                    ) : (
                      (fb.userId === user?.id || isAdmin) && (
                        <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(fb.id)} aria-label={`Delete feedback: ${fb.subject}`}>Delete</button>
                      )
                    )}
                  </div>
                </div>
                <div className={styles.badges}>
                  <span className={typeBadgeClass(fb.type)}>{fb.type}</span>
                </div>
                <p className={styles.feedbackDetails}>{fb.details}</p>
                {isAdmin && fb.authorName && (
                  <p className={styles.authorInfo}>{fb.authorName} &mdash; {fb.authorDepartment}</p>
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {totalPages} ({total} items)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)} role="presentation">
          <div ref={modalRef} className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editingFeedback ? "Edit Feedback" : "New Feedback"} tabIndex={-1}>
            <h2>{editingFeedback ? "Edit Feedback" : "New Feedback"}</h2>
            <div className={styles.form}>
              {!editingFeedback && (
                <div className={styles.field}>
                  <label htmlFor="fbDate">Date</label>
                  <input id="fbDate" type="date" value={formData.date} max={todayStr()} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                  {formErrors.date && <p className={styles.fieldError}>{formErrors.date}</p>}
                </div>
              )}
              <div className={styles.field}>
                <label htmlFor="fbSubject">Subject</label>
                <input id="fbSubject" type="text" maxLength={150} value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Subject (3-150 chars)" />
                {formErrors.subject && <p className={styles.fieldError}>{formErrors.subject}</p>}
              </div>
              <div className={styles.field}>
                <label>Type</label>
                <div className={styles.radioGroup}>
                  {FEEDBACK_TYPES.map((t) => (
                    <label key={t} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="feedbackType"
                        value={t}
                        checked={formData.type === t}
                        onChange={() => setFormData({ ...formData, type: t })}
                      />
                      <span className={typeIndicatorClass(t)} />
                      {t}
                    </label>
                  ))}
                </div>
                {formErrors.type && <p className={styles.fieldError}>{formErrors.type}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="fbDetails">Details</label>
                <textarea
                  id="fbDetails"
                  maxLength={5000}
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder="Details (min 20 chars, max 5000 chars)"
                />
                {formErrors.details && <p className={styles.fieldError}>{formErrors.details}</p>}
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className={styles.saveBtn} type="button" disabled={saving} onClick={handleSave}>
                  {saving ? "Saving..." : editingFeedback ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="alert" aria-live="polite" className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <ProtectedRoute>
      <FeedbackContent />
    </ProtectedRoute>
  );
}
