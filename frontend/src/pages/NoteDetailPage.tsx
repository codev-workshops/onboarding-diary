import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { notesApi } from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { TopBar } from "../components/TopBar";
import type { ApiError, NoteResponse } from "../api/types";

export function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState<NoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await notesApi.get(Number(id));
        if (!cancelled) setNote(data);
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        if (!cancelled) setError(axiosError.response?.data?.message ?? "Note not found.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!note || !window.confirm("Delete this note?")) {
      return;
    }
    setDeleting(true);
    try {
      await notesApi.remove(note.id);
      navigate("/notes");
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to delete note.");
      setDeleting(false);
    }
  }

  const isOwner = note != null && user != null && note.ownerId === user.id;

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <p>
          <Link to="/notes">← Back to notes</Link>
        </p>

        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : note ? (
          <>
            <div className="page-head">
              <h1>{note.title}</h1>
              {isOwner && (
                <div className="actions">
                  <Link className="button" to={`/notes/${note.id}/edit`}>
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
              <dd>{note.date}</dd>
              <dt>Tags</dt>
              <dd>
                <span className="tag-list">
                  {note.tags.length === 0
                    ? "—"
                    : note.tags.map((tag) => (
                        <span key={tag} className="tag-chip">
                          {tag}
                        </span>
                      ))}
                </span>
              </dd>
            </dl>

            <h2>Content</h2>
            <p className="description">{note.content ?? "—"}</p>
          </>
        ) : null}
      </main>
    </div>
  );
}
