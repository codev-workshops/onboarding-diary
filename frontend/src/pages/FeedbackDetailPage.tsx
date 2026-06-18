import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { feedbackApi } from "../api/feedback";
import { useAuth } from "../auth/AuthContext";
import { TopBar } from "../components/TopBar";
import type { ApiError, FeedbackResponse } from "../api/types";

export function FeedbackDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await feedbackApi.get(Number(id));
        if (!cancelled) setFeedback(data);
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        if (!cancelled) setError(axiosError.response?.data?.message ?? "Feedback not found.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!feedback || !window.confirm("Delete this feedback?")) {
      return;
    }
    setDeleting(true);
    try {
      await feedbackApi.remove(feedback.id);
      navigate("/feedback");
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to delete feedback.");
      setDeleting(false);
    }
  }

  const isOwner = feedback != null && user != null && feedback.ownerId === user.id;

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <p>
          <Link to="/feedback">← Back to feedback</Link>
        </p>

        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : feedback ? (
          <>
            <div className="page-head">
              <h1>{feedback.subject}</h1>
              {isOwner && (
                <div className="actions">
                  <Link className="button" to={`/feedback/${feedback.id}/edit`}>
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
              <dd>{feedback.date}</dd>
              <dt>Type</dt>
              <dd>
                <span className={`badge feedback-${feedback.type.toLowerCase()}`}>{feedback.type}</span>
              </dd>
            </dl>

            <h2>Details</h2>
            <p className="description">{feedback.details ?? "—"}</p>
          </>
        ) : null}
      </main>
    </div>
  );
}
