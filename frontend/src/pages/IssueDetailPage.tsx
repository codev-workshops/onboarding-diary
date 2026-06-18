import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { issuesApi } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { TopBar } from "../components/TopBar";
import type { ApiError, IssueResponse } from "../api/types";

export function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [issue, setIssue] = useState<IssueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await issuesApi.get(Number(id));
        if (!cancelled) setIssue(data);
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        if (!cancelled) setError(axiosError.response?.data?.message ?? "Issue not found.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!issue || !window.confirm("Delete this issue?")) {
      return;
    }
    setDeleting(true);
    try {
      await issuesApi.remove(issue.id);
      navigate("/issues");
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to delete issue.");
      setDeleting(false);
    }
  }

  const isOwner = issue != null && user != null && issue.ownerId === user.id;

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <p>
          <Link to="/issues">← Back to issues</Link>
        </p>

        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : issue ? (
          <>
            <div className="page-head">
              <h1>{issue.title}</h1>
              {isOwner && (
                <div className="actions">
                  <Link className="button" to={`/issues/${issue.id}/edit`}>
                    Edit
                  </Link>
                  <button type="button" className="danger" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              )}
            </div>

            <dl className="readonly-grid">
              <dt>Date</dt>
              <dd>{issue.date}</dd>
              <dt>Severity</dt>
              <dd>
                <span className={`badge severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span>
              </dd>
              <dt>Status</dt>
              <dd>
                <span className={`badge status-${issue.status.toLowerCase()}`}>{issue.status}</span>
              </dd>
            </dl>

            <h2>Description</h2>
            <p className="description">{issue.description ?? "—"}</p>

            <h2>Resolution notes</h2>
            <p className="description">{issue.resolutionNotes ?? "—"}</p>
          </>
        ) : null}
      </main>
    </div>
  );
}
