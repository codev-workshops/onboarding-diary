"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import { getFeedback, updateFeedback, type FeedbackDto, type UpdateFeedbackRequest } from "@/lib/api";
import styles from "../feedback.module.css";

const FEEDBACK_TYPES = ["Positive", "Suggestion", "Concern"] as const;

function typeIndicatorClass(type: string): string {
  if (type === "Positive") return `${styles.typeIndicator} ${styles.typePositive}`;
  if (type === "Suggestion") return `${styles.typeIndicator} ${styles.typeSuggestion}`;
  if (type === "Concern") return `${styles.typeIndicator} ${styles.typeConcern}`;
  return styles.typeIndicator;
}

interface FormErrors {
  subject?: string;
  details?: string;
}

function FeedbackDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [feedback, setFeedback] = useState<FeedbackDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [subject, setSubject] = useState("");
  const [type, setType] = useState("Positive");
  const [details, setDetails] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await getFeedback(id);
        setFeedback(res.feedback);
        setSubject(res.feedback.subject);
        setType(res.feedback.type);
        setDetails(res.feedback.details);
      } catch {
        showToast("Feedback not found.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, showToast]);

  async function handleSave() {
    const errs: FormErrors = {};
    if (!subject.trim()) errs.subject = "Subject is required.";
    else if (subject.trim().length < 3) errs.subject = "Subject must be at least 3 characters.";
    else if (subject.trim().length > 150) errs.subject = "Subject must be at most 150 characters.";
    if (subject !== subject.trim()) errs.subject = "Subject must not have leading or trailing whitespace.";
    if (!details.trim()) errs.details = "Details are required.";
    else if (details.trim().length < 20) errs.details = "Details must be at least 20 characters.";
    else if (details.trim().length > 5000) errs.details = "Details must be at most 5000 characters.";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: UpdateFeedbackRequest = {
        subject: subject.trim(),
        type,
        details,
      };
      await updateFeedback(id, payload);
      showToast("Feedback updated successfully.", "success");
      setTimeout(() => router.push("/feedback"), 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update feedback.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.container}><p className={styles.empty}>Loading...</p></div>;
  if (!feedback) return <div className={styles.container}><p className={styles.empty}>Feedback not found.</p></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Edit Feedback</h1>
        <button className={styles.cancelBtn} onClick={() => router.push("/feedback")}>Back to Feedback</button>
      </div>

      <div className={styles.modal} style={{ border: "none", maxWidth: "100%" }}>
        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="fbSubject">Subject</label>
            <input id="fbSubject" type="text" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
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
                    checked={type === t}
                    onChange={() => setType(t)}
                  />
                  <span className={typeIndicatorClass(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="fbDetails">Details</label>
            <textarea id="fbDetails" maxLength={5000} value={details} onChange={(e) => setDetails(e.target.value)} />
            {formErrors.details && <p className={styles.fieldError}>{formErrors.details}</p>}
          </div>
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} type="button" onClick={() => router.push("/feedback")}>Cancel</button>
            <button className={styles.saveBtn} type="button" disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function FeedbackDetailPage() {
  return (
    <ProtectedRoute>
      <FeedbackDetailContent />
    </ProtectedRoute>
  );
}
