"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/lib/protected-route";
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  type NoteDto,
  type CreateNoteRequest,
  type UpdateNoteRequest,
  type NoteListParams,
} from "@/lib/api";
import styles from "./notes.module.css";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface NoteFormData {
  date: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
}

function emptyForm(): NoteFormData {
  return { date: todayStr(), title: "", content: "", tags: [], isPinned: false };
}

interface FormErrors {
  title?: string;
  content?: string;
  date?: string;
  tags?: string;
  pin?: string;
}

function validateForm(data: NoteFormData): FormErrors {
  const errs: FormErrors = {};
  if (!data.title.trim()) errs.title = "Title is required.";
  else if (data.title.trim().length < 3) errs.title = "Title must be at least 3 characters.";
  else if (data.title.trim().length > 200) errs.title = "Title must be at most 200 characters.";
  if (data.title !== data.title.trim()) errs.title = "Title must not have leading or trailing whitespace.";
  if (!data.content.trim()) errs.content = "Content is required.";
  else if (data.content.length > 10000) errs.content = "Content must be at most 10000 characters.";
  if (!data.date) errs.date = "Date is required.";
  if (data.tags.length > 10) errs.tags = "Maximum 10 tags allowed.";
  else if (data.tags.some((t) => t.length < 1 || t.length > 30)) errs.tags = "Each tag must be 1-30 characters.";
  else if (data.tags.some((t) => !/^[a-zA-Z0-9-]+$/.test(t))) errs.tags = "Tags: alphanumeric and hyphens only.";
  return errs;
}

function highlightText(text: string, search: string): React.ReactNode {
  if (!search.trim()) return text;
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className={styles.highlight}>{part}</span>
    ) : (
      part
    )
  );
}

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

function NotesContent() {
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [allTags, setAllTags] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteDto | null>(null);
  const [formData, setFormData] = useState<NoteFormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [mdTab, setMdTab] = useState<"write" | "preview">("write");
  const [pinnedCount, setPinnedCount] = useState(0);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: NoteListParams = { page, limit: 20 };
        if (activeSearch) params.search = activeSearch;
        if (filterTags.length > 0) params.tags = filterTags.join(",");
        if (filterStartDate) params.startDate = filterStartDate;
        if (filterEndDate) params.endDate = filterEndDate;
        const res = await listNotes(params);
        if (!cancelled) {
          setNotes(res.notes);
          setTotalPages(res.totalPages);
          setTotal(res.total);

          const tags = new Set<string>();
          let pinned = 0;
          res.notes.forEach((n) => {
            n.tags.forEach((t) => tags.add(t));
            if (n.isPinned) pinned++;
          });
          setAllTags((prev) => {
            const merged = new Set([...prev, ...tags]);
            return Array.from(merged).sort();
          });
          setPinnedCount(pinned);
        }
      } catch (err) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : "Failed to load notes.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, activeSearch, filterTags, filterStartDate, filterEndDate, showToast, refreshKey]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      setActiveSearch(searchTerm);
      setPage(1);
    }
  }

  function toggleTagFilter(tag: string) {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  }

  function openCreate() {
    setEditingNote(null);
    setFormData(emptyForm());
    setFormErrors({});
    setTagInput("");
    setMdTab("write");
    setModalOpen(true);
  }

  function openEdit(note: NoteDto) {
    setEditingNote(note);
    setFormData({
      date: note.date.slice(0, 10),
      title: note.title,
      content: note.content,
      tags: [...note.tags],
      isPinned: note.isPinned,
    });
    setFormErrors({});
    setTagInput("");
    setMdTab("write");
    setModalOpen(true);
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;
    if (formData.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    setFormData({ ...formData, tags: [...formData.tags, tag] });
    setTagInput("");
  }

  function removeTag(tag: string) {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && formData.tags.length > 0) {
      removeTag(formData.tags[formData.tags.length - 1]);
    }
  }

  async function handleSave() {
    const errs = validateForm(formData);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (editingNote) {
        const payload: UpdateNoteRequest = {
          title: formData.title.trim(),
          content: formData.content,
          tags: formData.tags,
          isPinned: formData.isPinned,
        };
        await updateNote(editingNote.id, payload);
        showToast("Note updated successfully.", "success");
      } else {
        const payload: CreateNoteRequest = {
          date: new Date(formData.date).toISOString(),
          title: formData.title.trim(),
          content: formData.content,
          tags: formData.tags,
          isPinned: formData.isPinned,
        };
        await createNote(payload);
        showToast("Note created successfully.", "success");
      }

      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save note.";
      if (msg.toLowerCase().includes("pinned")) {
        setFormErrors((prev) => ({ ...prev, pin: msg }));
      }
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNote(id);
      showToast("Note deleted.", "success");
      setDeleteConfirm(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete note.", "error");
    }
  }

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Notes</h1>
        <button className={styles.newBtn} onClick={openCreate}>
          + New Note
        </button>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search notes (title, content, tags)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }} />
        <input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }} />
      </div>

      {allTags.length > 0 && (
        <div className={styles.tagChips}>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`${styles.tagChip} ${filterTags.includes(tag) ? styles.tagChipActive : ""}`}
              onClick={() => toggleTagFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className={styles.empty}>Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className={styles.empty}>No notes found. Click &quot;+ New Note&quot; to create one.</p>
      ) : (
        <>
          {pinnedNotes.length > 0 && (
            <div className={styles.pinnedSection}>
              <h2>Pinned</h2>
              <div className={styles.noteList}>
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    search={activeSearch}
                    onEdit={() => openEdit(note)}
                    onDelete={handleDelete}
                    deleteConfirm={deleteConfirm}
                    setDeleteConfirm={setDeleteConfirm}
                  />
                ))}
              </div>
            </div>
          )}

          {unpinnedNotes.length > 0 && (
            <div className={styles.noteList}>
              {unpinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  search={activeSearch}
                  onEdit={() => openEdit(note)}
                  onDelete={handleDelete}
                  deleteConfirm={deleteConfirm}
                  setDeleteConfirm={setDeleteConfirm}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {totalPages} ({total} notes)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{editingNote ? "Edit Note" : "New Note"}</h2>
            <div className={styles.form}>
              {!editingNote && (
                <div className={styles.field}>
                  <label htmlFor="noteDate">Date</label>
                  <input id="noteDate" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                  {formErrors.date && <p className={styles.fieldError}>{formErrors.date}</p>}
                </div>
              )}
              <div className={styles.field}>
                <label htmlFor="noteTitle">Title</label>
                <input id="noteTitle" type="text" maxLength={200} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Note title (3-200 chars)" />
                {formErrors.title && <p className={styles.fieldError}>{formErrors.title}</p>}
              </div>
              <div className={styles.field}>
                <label>Content (Markdown)</label>
                <div className={styles.mdTabs}>
                  <button
                    type="button"
                    className={`${styles.mdTab} ${mdTab === "write" ? styles.mdTabActive : ""}`}
                    onClick={() => setMdTab("write")}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    className={`${styles.mdTab} ${mdTab === "preview" ? styles.mdTabActive : ""}`}
                    onClick={() => setMdTab("preview")}
                  >
                    Preview
                  </button>
                </div>
                {mdTab === "write" ? (
                  <textarea
                    maxLength={10000}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your note in Markdown..."
                  />
                ) : (
                  <div
                    className={styles.mdPreview}
                    dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(formData.content) }}
                  />
                )}
                {formErrors.content && <p className={styles.fieldError}>{formErrors.content}</p>}
              </div>
              <div className={styles.field}>
                <label>Tags</label>
                <div className={styles.tagsInput}>
                  {formData.tags.map((tag) => (
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
                    placeholder={formData.tags.length < 10 ? "Add tag..." : ""}
                    disabled={formData.tags.length >= 10}
                  />
                </div>
                {formErrors.tags && <p className={styles.fieldError}>{formErrors.tags}</p>}
              </div>
              <div className={styles.field}>
                <div className={styles.pinToggle}>
                  <input
                    id="notePin"
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  />
                  <label htmlFor="notePin">Pin this note</label>
                </div>
                {formErrors.pin && <p className={styles.fieldError}>{formErrors.pin}</p>}
                {!formData.isPinned && pinnedCount >= 5 && (
                  <p className={styles.pinWarning}>5 notes already pinned — unpin one to pin another.</p>
                )}
                {formData.isPinned && pinnedCount >= 5 && !editingNote?.isPinned && (
                  <p className={styles.pinWarning}>You already have 5 pinned notes. This will be rejected by the server.</p>
                )}
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className={styles.saveBtn} type="button" disabled={saving} onClick={handleSave}>
                  {saving ? "Saving..." : editingNote ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  search,
  onEdit,
  onDelete,
  deleteConfirm,
  setDeleteConfirm,
}: {
  note: NoteDto;
  search: string;
  onEdit: () => void;
  onDelete: (id: string) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
}) {
  const preview = note.content.length > 150 ? note.content.slice(0, 150) + "..." : note.content;

  return (
    <div className={`${styles.noteCard} ${note.isPinned ? styles.noteCardPinned : ""}`}>
      <div className={styles.noteCardHeader}>
        <div>
          <span className={styles.noteTitle}>{highlightText(note.title, search)}</span>
          <span className={styles.noteDate}> &mdash; {new Date(note.date).toLocaleDateString()}</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.editBtn} onClick={onEdit}>Edit</button>
          {deleteConfirm === note.id ? (
            <>
              <button className={styles.deleteBtn} onClick={() => onDelete(note.id)}>Confirm</button>
              <button className={styles.editBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
            </>
          ) : (
            <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(note.id)}>Delete</button>
          )}
        </div>
      </div>
      <div className={styles.notePreview}>{highlightText(preview, search)}</div>
      <div className={styles.badges}>
        {note.isPinned && <span className={`${styles.badge} ${styles.badgePin}`}>Pinned</span>}
        {note.tags.map((tag) => (
          <span key={tag} className={`${styles.badge} ${styles.badgeTag}`}>{highlightText(tag, search)}</span>
        ))}
      </div>
    </div>
  );
}

export default function NotesPage() {
  return (
    <ProtectedRoute>
      <NotesContent />
    </ProtectedRoute>
  );
}
