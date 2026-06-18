import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { notesApi } from "../api/notes";
import { TopBar } from "../components/TopBar";
import type { ApiError, NoteInput } from "../api/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseTags(value: string): string[] {
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const cleaned = part.trim().toLowerCase();
    if (cleaned) {
      seen.add(cleaned);
    }
  }
  return [...seen];
}

export function NoteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== undefined;

  const [date, setDate] = useState(today());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsText, setTagsText] = useState("");

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
        const note = await notesApi.get(Number(id));
        if (cancelled) return;
        setDate(note.date);
        setTitle(note.title);
        setContent(note.content ?? "");
        setTagsText(note.tags.join(", "));
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        setError(axiosError.response?.data?.message ?? "Unable to load note.");
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
    const payload: NoteInput = {
      date,
      title,
      content: content.trim() ? content : null,
      tags: parseTags(tagsText),
    };
    try {
      const saved = isEdit
        ? await notesApi.update(Number(id), payload)
        : await notesApi.create(payload);
      navigate(`/notes/${saved.id}`);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to save note.");
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <h1>{isEdit ? "Edit note" : "New note"}</h1>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <form className="card wide" onSubmit={handleSubmit} aria-label="Note form">
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

            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="comma separated"
            />

            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              maxLength={10000}
            />

            <div className="actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save note"}
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
