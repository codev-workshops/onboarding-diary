import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { issuesApi } from "../api/issues";
import { TopBar } from "../components/TopBar";
import {
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  type ApiError,
  type IssueFilters,
  type IssueResponse,
  type IssueSeverity,
  type IssueStatus,
} from "../api/types";

const emptyFilters: IssueFilters = {};

export function IssuesPage() {
  const [issues, setIssues] = useState<IssueResponse[]>([]);
  const [filters, setFilters] = useState<IssueFilters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (active: IssueFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await issuesApi.list(active);
      setIssues(data.content);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to load issues.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  function updateFilter<K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) {
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
          <h1>Issue log</h1>
          <Link className="button" to="/issues/new">
            New issue
          </Link>
        </div>

        <div className="filters" aria-label="Issue filters">
          <label>
            Status
            <select
              value={filters.status ?? ""}
              onChange={(e) => updateFilter("status", (e.target.value || undefined) as IssueStatus | undefined)}
            >
              <option value="">All</option>
              {ISSUE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select
              value={filters.severity ?? ""}
              onChange={(e) =>
                updateFilter("severity", (e.target.value || undefined) as IssueSeverity | undefined)
              }
            >
              <option value="">All</option>
              {ISSUE_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
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
              placeholder="title, description or notes"
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
        ) : issues.length === 0 ? (
          <p className="empty">No issues found.</p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td>{issue.date}</td>
                  <td>
                    <Link to={`/issues/${issue.id}`}>{issue.title}</Link>
                  </td>
                  <td>
                    <span className={`badge severity-${issue.severity.toLowerCase()}`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`badge status-${issue.status.toLowerCase()}`}>{issue.status}</span>
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
