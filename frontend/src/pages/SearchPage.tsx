import { useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { TopBar } from "../components/TopBar";
import {
  searchApi,
  type SearchEntityType,
  type SearchResponse,
  type SearchResult,
  type SearchSort,
} from "../api/search";
import type { ApiError } from "../api/types";

const ENTITY_TYPES: { value: SearchEntityType; label: string }[] = [
  { value: "TASK", label: "Tasks" },
  { value: "ISSUE", label: "Issues" },
  { value: "FEEDBACK", label: "Feedback" },
  { value: "NOTE", label: "Notes" },
];

const TYPE_PATH: Record<SearchEntityType, string> = {
  TASK: "/tasks",
  ISSUE: "/issues",
  FEEDBACK: "/feedback",
  NOTE: "/notes",
};

const TYPE_LABEL: Record<SearchEntityType, string> = {
  TASK: "Task",
  ISSUE: "Issue",
  FEEDBACK: "Feedback",
  NOTE: "Note",
};

function resultLink(result: SearchResult): string {
  return `${TYPE_PATH[result.type]}/${result.id}`;
}

export function SearchPage() {
  const [term, setTerm] = useState("");
  const [types, setTypes] = useState<SearchEntityType[]>([]);
  const [sort, setSort] = useState<SearchSort>("RELEVANCE");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleType(type: SearchEntityType) {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    if (term.trim().length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchApi.query({
        q: term.trim(),
        types: types.length > 0 ? types : undefined,
        sort,
      });
      setResponse(data);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Search failed.");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <h1>Search</h1>

        <form className="card search-form" onSubmit={runSearch}>
          <div className="search-bar">
            <input
              type="search"
              aria-label="Search query"
              placeholder="Search tasks, issues, feedback and notes…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <button type="submit" className="button" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          <div className="search-options">
            <fieldset className="entity-filters">
              <legend>Filter by type</legend>
              {ENTITY_TYPES.map((t) => (
                <label key={t.value} className="checkbox">
                  <input
                    type="checkbox"
                    checked={types.includes(t.value)}
                    onChange={() => toggleType(t.value)}
                  />
                  {t.label}
                </label>
              ))}
            </fieldset>

            <label className="sort-select">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SearchSort)}
                aria-label="Sort by"
              >
                <option value="RELEVANCE">Relevance</option>
                <option value="DATE">Date</option>
              </select>
            </label>
          </div>
        </form>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        {response && (
          <section aria-label="Search results">
            <p className="metric-sub">
              {response.total} result{response.total === 1 ? "" : "s"} for “{response.query}”
            </p>
            {response.results.length === 0 ? (
              <p className="empty">No matches found.</p>
            ) : (
              <ul className="result-list">
                {response.results.map((result) => (
                  <li key={`${result.type}-${result.id}`} className="result-item">
                    <div className="result-head">
                      <span className="badge">{TYPE_LABEL[result.type]}</span>
                      <Link to={resultLink(result)}>{result.title}</Link>
                      <span className="result-date">{result.date}</span>
                    </div>
                    <p className="result-snippet">{result.snippet}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
