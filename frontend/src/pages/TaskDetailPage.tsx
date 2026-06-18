import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { tasksApi } from "../api/tasks";
import { useAuth } from "../auth/AuthContext";
import { TopBar } from "../components/TopBar";
import type { ApiError, TaskResponse } from "../api/types";

export function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await tasksApi.get(Number(id));
        if (!cancelled) setTask(data);
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        if (!cancelled) setError(axiosError.response?.data?.message ?? "Task not found.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!task || !window.confirm("Delete this task?")) {
      return;
    }
    setDeleting(true);
    try {
      await tasksApi.remove(task.id);
      navigate("/tasks");
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to delete task.");
      setDeleting(false);
    }
  }

  const isOwner = task != null && user != null && task.ownerId === user.id;

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <p>
          <Link to="/tasks">← Back to tasks</Link>
        </p>

        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : task ? (
          <>
            <div className="page-head">
              <h1>{task.title}</h1>
              {isOwner && (
                <div className="actions">
                  <Link className="button" to={`/tasks/${task.id}/edit`}>
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
              <dd>{task.date}</dd>
              <dt>Category</dt>
              <dd>{task.category}</dd>
              <dt>Status</dt>
              <dd>
                <span className={`badge status-${task.status.toLowerCase()}`}>{task.status}</span>
              </dd>
              <dt>Priority</dt>
              <dd>
                <span className={`badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
              </dd>
            </dl>

            <h2>Description</h2>
            <p className="description">{task.description ?? "—"}</p>
          </>
        ) : null}
      </main>
    </div>
  );
}
