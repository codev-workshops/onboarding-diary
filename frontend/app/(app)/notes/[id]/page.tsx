"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import { getNote, updateNote, type NoteDto, type UpdateNoteRequest } from "@/lib/api";
import styles from "../notes.module.css";

function simpleMarkdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*<\/li>)/, "<ul>$1</ul>");
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  html = html.replace(/<p><(h[123]|ul|blockquote)/g, "<$1");
  html = html.replace(/<\/(h[123]|ul|blockquote)><\/p>/g, "</$1>");

  return html;
}

function NoteDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [note, setNote] = useState<NoteDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [mdTab, setMdTab] = useState<"write" | "preview">("write");

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await getNote(id);
        setNote(res.note);
        setTitle(res.note.title);
        setContent(res.note.content);
        setTags([...res.note.tags]);
        setIsPinned(res.note.isPinned);
      } catch {
        showToast("Note not found.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, showToast]);

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || tags.includes(tag)) {
      setTagInput("");
      return;
    }
    setTags([...tags, tag]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required.";
    else if (title.trim().length < 3) errs.title = "Title must be at least 3 characters.";
    else if (title.trim().length > 200) errs.title = "Title must be at most 200 characters.";
    if (title !== title.trim()) errs.title = "Title must not have leading or trailing whitespace.";
    if (!content.trim()) errs.content = "Content is required.";
    else if (content.length > 10000) errs.content = "Content must be at most 10000 characters.";
    if (tags.length > 10) errs.tags = "Maximum 10 tags allowed.";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: UpdateNoteRequest = {
        title: title.trim(),
        content,
        tags,
        isPinned,
      };
      await updateNote(id, payload);
      showToast("Note updated successfully.", "success");
      setTimeout(() => router.push("/notes"), 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update note.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.container}><p className={styles.empty}>Loading...</p></div>;
  if (!note) return <div className={styles.container}><p className={styles.empty}>Note not found.</p></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Edit Note</h1>
        <button className={styles.cancelBtn} onClick={() => router.push("/notes")}>Back to Notes</button>
      </div>

      <div className={styles.modal} style={{ border: "none", maxWidth: "100%" }}>
        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="noteTitle">Title</label>
            <input id="noteTitle" type="text" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
            {formErrors.title && <p className={styles.fieldError}>{formErrors.title}</p>}
          </div>
          <div className={styles.field}>
            <label>Content (Markdown)</label>
            <div className={styles.mdTabs}>
              <button type="button" className={`${styles.mdTab} ${mdTab === "write" ? styles.mdTabActive : ""}`} onClick={() => setMdTab("write")}>Write</button>
              <button type="button" className={`${styles.mdTab} ${mdTab === "preview" ? styles.mdTabActive : ""}`} onClick={() => setMdTab("preview")}>Preview</button>
            </div>
            {mdTab === "write" ? (
              <textarea maxLength={10000} value={content} onChange={(e) => setContent(e.target.value)} />
            ) : (
              <div className={styles.mdPreview} dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(content) }} />
            )}
            {formErrors.content && <p className={styles.fieldError}>{formErrors.content}</p>}
          </div>
          <div className={styles.field}>
            <label>Tags</label>
            <div className={styles.tagsInput}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tagItem}>
                  {tag}
                  <span className={styles.tagRemove} onClick={() => removeTag(tag)}>&times;</span>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                placeholder={tags.length < 10 ? "Add tag..." : ""}
                disabled={tags.length >= 10}
              />
            </div>
            {formErrors.tags && <p className={styles.fieldError}>{formErrors.tags}</p>}
          </div>
          <div className={styles.field}>
            <div className={styles.pinToggle}>
              <input id="notePin" type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
              <label htmlFor="notePin">Pin this note</label>
            </div>
          </div>
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} type="button" onClick={() => router.push("/notes")}>Cancel</button>
            <button className={styles.saveBtn} type="button" disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function NoteDetailPage() {
  return (
    <ProtectedRoute>
      <NoteDetailContent />
    </ProtectedRoute>
  );
}
