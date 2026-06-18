import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { notesApi } from "../api/notes";
import { TopBar } from "../components/TopBar";
import type { ApiError, NoteFilters, NoteResponse } from "../api/types";

const emptyFilters: NoteFilters = {};

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

export function NotesPage() {
  const [items, setItems] = useState<NoteResponse[]>([]);
  const [filters, setFilters] = useState<NoteFilters>(emptyFilters);
  const [tagsText, setTagsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (active: NoteFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await notesApi.list(active);
      setItems(data.content);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to load notes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  function updateFilter<K extends keyof NoteFilters>(key: K, value: NoteFilters[K]) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  function applyTags(value: string) {
    setTagsText(value);
    const tags = parseTags(value);
    updateFilter("tags", tags.length > 0 ? tags : undefined);
  }

  function clearAll() {
    setTagsText("");
    setFilters(emptyFilters);
  }

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <div className="page-head">
          <h1>Notes</h1>
          <Link className="button" to="/notes/new">
            New note
          </Link>
        </div>

        <div className="filters" aria-label="Note filters">
          <label className="grow">
            Tags
            <input
              type="text"
              placeholder="comma separated"
              value={tagsText}
              onChange={(e) => applyTags(e.target.value)}
            />
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
              placeholder="title or content"
              value={filters.search ?? ""}
              onChange={(e) => updateFilter("search", e.target.value || undefined)}
            />
          </label>
          <button type="button" className="link" onClick={clearAll}>
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
          <p className="empty">No notes found.</p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>
                    <Link to={`/notes/${item.id}`}>{item.title}</Link>
                  </td>
                  <td>
                    <span className="tag-list">
                      {item.tags.length === 0
                        ? "—"
                        : item.tags.map((tag) => (
                            <span key={tag} className="tag-chip">
                              {tag}
                            </span>
                          ))}
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
