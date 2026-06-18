import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { issuesApi } from "../api/issues";
import { TopBar } from "../components/TopBar";
import {
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  type ApiError,
  type IssueInput,
  type IssueSeverity,
  type IssueStatus,
} from "../api/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IssueFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== undefined;

  const [date, setDate] = useState(today());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IssueSeverity>("MEDIUM");
  const [statusValue, setStatusValue] = useState<IssueStatus>("OPEN");
  const [resolutionNotes, setResolutionNotes] = useState("");

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
        const issue = await issuesApi.get(Number(id));
        if (cancelled) return;
        setDate(issue.date);
        setTitle(issue.title);
        setDescription(issue.description ?? "");
        setSeverity(issue.severity);
        setStatusValue(issue.status);
        setResolutionNotes(issue.resolutionNotes ?? "");
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        setError(axiosError.response?.data?.message ?? "Unable to load issue.");
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
    const payload: IssueInput = {
      date,
      title,
      description: description.trim() ? description : null,
      severity,
      status: statusValue,
      resolutionNotes: resolutionNotes.trim() ? resolutionNotes : null,
    };
    try {
      const saved = isEdit
        ? await issuesApi.update(Number(id), payload)
        : await issuesApi.create(payload);
      navigate(`/issues/${saved.id}`);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to save issue.");
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <h1>{isEdit ? "Edit issue" : "New issue"}</h1>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <form className="card wide" onSubmit={handleSubmit} aria-label="Issue form">
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            <label htmlFor="title">Title</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />

            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

            <label htmlFor="severity">Severity</label>
            <select id="severity" value={severity} onChange={(e) => setSeverity(e.target.value as IssueSeverity)}>
              {ISSUE_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label htmlFor="status">Status</label>
            <select id="status" value={statusValue} onChange={(e) => setStatusValue(e.target.value as IssueStatus)}>
              {ISSUE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={5000}
            />

            <label htmlFor="resolutionNotes">Resolution notes</label>
            <textarea
              id="resolutionNotes"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
              maxLength={5000}
            />

            <div className="actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save issue"}
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
