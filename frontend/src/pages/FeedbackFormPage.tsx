import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { feedbackApi } from "../api/feedback";
import { TopBar } from "../components/TopBar";
import {
  FEEDBACK_TYPES,
  type ApiError,
  type FeedbackInput,
  type FeedbackType,
} from "../api/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FeedbackFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== undefined;

  const [date, setDate] = useState(today());
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<FeedbackType>("POSITIVE");
  const [details, setDetails] = useState("");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const feedback = await feedbackApi.get(Number(id));
        if (cancelled) return;
        setDate(feedback.date);
        setSubject(feedback.subject);
        setType(feedback.type);
        setDetails(feedback.details ?? "");
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        setError(axiosError.response?.data?.message ?? "Unable to load feedback.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload: FeedbackInput = {
      date,
      subject,
      type,
      details: details.trim() ? details : null,
    };
    try {
      const saved = isEdit
        ? await feedbackApi.update(Number(id), payload)
        : await feedbackApi.create(payload);
      navigate(`/feedback/${saved.id}`);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to save feedback.");
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <h1>{isEdit ? "Edit feedback" : "New feedback"}</h1>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <form className="card wide" onSubmit={handleSubmit} aria-label="Feedback form">
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
            />

            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

            <label htmlFor="type">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as FeedbackType)}>
              {FEEDBACK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label htmlFor="details">Details</label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={5}
              maxLength={5000}
            />

            <div className="actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save feedback"}
              </button>
              <button type="button" className="link" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
