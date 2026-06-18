import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { feedbackApi } from "../api/feedback";
import { TopBar } from "../components/TopBar";
import {
  FEEDBACK_TYPES,
  type ApiError,
  type FeedbackFilters,
  type FeedbackResponse,
  type FeedbackType,
} from "../api/types";

const emptyFilters: FeedbackFilters = {};

export function FeedbackPage() {
  const [items, setItems] = useState<FeedbackResponse[]>([]);
  const [filters, setFilters] = useState<FeedbackFilters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (active: FeedbackFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackApi.list(active);
      setItems(data.content);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to load feedback.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  function updateFilter<K extends keyof FeedbackFilters>(key: K, value: FeedbackFilters[K]) {
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
          <h1>Feedback notes</h1>
          <Link className="button" to="/feedback/new">
            New feedback
          </Link>
        </div>

        <div className="filters" aria-label="Feedback filters">
          <label>
            Type
            <select
              value={filters.type ?? ""}
              onChange={(e) => updateFilter("type", (e.target.value || undefined) as FeedbackType | undefined)}
            >
              <option value="">All</option>
              {FEEDBACK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
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
              placeholder="subject or details"
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
        ) : items.length === 0 ? (
          <p className="empty">No feedback found.</p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>
                    <Link to={`/feedback/${item.id}`}>{item.subject}</Link>
                  </td>
                  <td>
                    <span className={`badge feedback-${item.type.toLowerCase()}`}>{item.type}</span>
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
