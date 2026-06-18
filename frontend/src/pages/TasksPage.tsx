import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { tasksApi } from "../api/tasks";
import { TopBar } from "../components/TopBar";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ApiError,
  type TaskCategory,
  type TaskFilters,
  type TaskPriority,
  type TaskResponse,
  type TaskStatus,
} from "../api/types";

const emptyFilters: TaskFilters = {};

export function TasksPage() {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (active: TaskFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.list(active);
      setTasks(data.content);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  function updateFilter<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <div className="page-head">
          <h1>Task log</h1>
          <Link className="button" to="/tasks/new">
            New task
          </Link>
        </div>

        <div className="filters" aria-label="Task filters">
          <label>
            Status
            <select
              value={filters.status ?? ""}
              onChange={(e) => updateFilter("status", (e.target.value || undefined) as TaskStatus | undefined)}
            >
              <option value="">All</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={filters.category ?? ""}
              onChange={(e) =>
                updateFilter("category", (e.target.value || undefined) as TaskCategory | undefined)
              }
            >
              <option value="">All</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={filters.priority ?? ""}
              onChange={(e) =>
                updateFilter("priority", (e.target.value || undefined) as TaskPriority | undefined)
              }
            >
              <option value="">All</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => updateFilter("dateFrom", e.target.value || undefined)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => updateFilter("dateTo", e.target.value || undefined)}
            />
          </label>
          <label className="grow">
            Search
            <input
              type="search"
              placeholder="title or description"
              value={filters.search ?? ""}
              onChange={(e) => updateFilter("search", e.target.value || undefined)}
            />
          </label>
          <button type="button" className="link" onClick={() => setFilters(emptyFilters)}>
            Clear
          </button>
        </div>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="empty">No tasks found.</p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.date}</td>
                  <td>
                    <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                  </td>
                  <td>{task.category}</td>
                  <td>
                    <span className={`badge status-${task.status.toLowerCase()}`}>{task.status}</span>
                  </td>
                  <td>
                    <span className={`badge priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
