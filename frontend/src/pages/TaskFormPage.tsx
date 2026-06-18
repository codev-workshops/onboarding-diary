import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { tasksApi } from "../api/tasks";
import { TopBar } from "../components/TopBar";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ApiError,
  type TaskCategory,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
} from "../api/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TaskFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== undefined;

  const [date, setDate] = useState(today());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>("LEARNING");
  const [statusValue, setStatusValue] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");

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
        const task = await tasksApi.get(Number(id));
        if (cancelled) return;
        setDate(task.date);
        setTitle(task.title);
        setDescription(task.description ?? "");
        setCategory(task.category);
        setStatusValue(task.status);
        setPriority(task.priority);
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        setError(axiosError.response?.data?.message ?? "Unable to load task.");
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
    const payload: TaskInput = {
      date,
      title,
      description: description.trim() ? description : null,
      category,
      status: statusValue,
      priority,
    };
    try {
      const saved = isEdit
        ? await tasksApi.update(Number(id), payload)
        : await tasksApi.create(payload);
      navigate(`/tasks/${saved.id}`);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to save task.");
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <h1>{isEdit ? "Edit task" : "New task"}</h1>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <form className="card wide" onSubmit={handleSubmit} aria-label="Task form">
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

            <label htmlFor="category">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label htmlFor="status">Status</label>
            <select id="status" value={statusValue} onChange={(e) => setStatusValue(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label htmlFor="priority">Priority</label>
            <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
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

            <div className="actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save task"}
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
