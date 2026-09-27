"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ConfirmDialog } from "@/components/entries/ConfirmDialog";
import { formatDateOnly, formatDateTime } from "@/components/ui/labels";
import { TagList } from "@/features/notes/labels";
import { NoteForm } from "@/features/notes/NoteForm";
import { noteToFormValues, toUpdateRequest } from "@/features/notes/noteForm";
import { ApiError, noteEtag, type Note } from "@/lib/apiClient";
import { useStores } from "@/stores/StoreProvider";
import { noteErrorMessage } from "@/stores/NoteStore";
import entryStyles from "@/components/entries/entries.module.css";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";
import styles from "@/features/notes/notes.module.css";

const NoteDetail = observer(function NoteDetail({ note, backHref, tagHref }: { note: Note; backHref: string; tagHref: (tag: string) => string }) {
  const { notes, auth } = useStores();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [formGeneration, setFormGeneration] = useState(0);

  const isOwner = auth.role === "NEW_RECRUIT" && auth.user?.id === note.recruitId;
  const canDelete = isOwner || auth.role === "ADMIN";

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await notes.remove(note.id);
      router.push(backHref);
    } catch (e) {
      setDeleteError(noteErrorMessage(e));
    }
  };

  if (editing) {
    return (
      <>
        <h1 className={formStyles.title}>Edit note</h1>
        {conflictMessage && (
          <div className={formStyles.formError} role="alert" data-testid="note-conflict">
            {conflictMessage}
          </div>
        )}
        <NoteForm
          // Bumped only after a 409: the note is reloaded and the form re-seeds from
          // the server state instead of retrying a stale draft over newer edits.
          key={formGeneration}
          idPrefix="note"
          initialValues={noteToFormValues(note)}
          submitLabel="Save changes"
          busy={notes.mutating}
          onCancel={() => {
            setConflictMessage(null);
            setEditing(false);
          }}
          onSubmit={async (values) => {
            try {
              await notes.update(note.id, toUpdateRequest(values), noteEtag(note));
            } catch (e) {
              if (e instanceof ApiError && e.code === "CONFLICT") {
                await notes.loadOne(note.id);
                setFormGeneration((g) => g + 1);
                setConflictMessage(`${noteErrorMessage(e)} The latest version has been loaded — re-apply your changes and save again.`);
                return;
              }
              throw e;
            }
            setConflictMessage(null);
            setEditing(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className={entryStyles.detailHeader}>
        <div>
          <h1 className={entryStyles.detailTitle} data-testid="note-title">
            {note.title}
          </h1>
          <div className={entryStyles.itemMeta}>
            <TagList tags={note.tags} hrefFor={tagHref} />
            {note.tags.length === 0 && <span className={tableStyles.muted}>No tags</span>}
          </div>
        </div>
        {(isOwner || canDelete) && (
          <div className={formStyles.actions}>
            {isOwner && (
              <button type="button" className={formStyles.button} onClick={() => setEditing(true)} data-testid="note-edit">
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className={`${formStyles.button} ${formStyles.buttonSecondary}`}
                onClick={() => setConfirmOpen(true)}
                data-testid="note-delete"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      <dl className={formStyles.dl}>
        <dt>Date</dt>
        <dd data-testid="note-date">{formatDateOnly(note.entryDate)}</dd>
        <dt>Content</dt>
        <dd className={styles.content} data-testid="note-content">
          {note.content}
        </dd>
        <dt>Created</dt>
        <dd>{formatDateTime(note.createdAt)}</dd>
        <dt>Updated</dt>
        <dd>{formatDateTime(note.updatedAt)}</dd>
      </dl>
      {!isOwner && <p className={tableStyles.muted}>Read-only view — only the recruit can edit their notes.</p>}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this note?"
        confirmLabel="Delete"
        danger
        busy={notes.mutating}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError(null);
        }}
      >
        “{note.title}” will be permanently removed. This cannot be undone.
      </ConfirmDialog>
    </>
  );
});

const NotePageContent = observer(function NotePageContent() {
  const { notes } = useStores();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const recruitId = search.get("recruitId");
  const backHref = recruitId ? `/recruits/${recruitId}?tab=notes` : "/notes";
  const tagHref = (tag: string) => `${backHref}${backHref.includes("?") ? "&" : "?"}tag=${encodeURIComponent(tag)}`;

  useEffect(() => {
    void notes.loadOne(params.id);
    return () => notes.clearCurrent();
  }, [notes, params.id]);

  const note = notes.current;

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-label="Note">
      <p className={tableStyles.muted}>
        <Link href={backHref} className={tableStyles.rowLink}>
          ← Back to notes
        </Link>
      </p>
      {notes.currentError && (
        <div className={formStyles.formError} role="alert" data-testid="note-error">
          {notes.currentError}
        </div>
      )}
      {!note && notes.currentLoading && <p className={tableStyles.muted}>Loading…</p>}
      {note && note.id === params.id && <NoteDetail note={note} backHref={backHref} tagHref={tagHref} />}
    </section>
  );
});

/** REQ-FUNC-062/063: note detail with edit / delete (owner) and the read-only manager/admin view. */
export default function NotePage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <NotePageContent />
      </Suspense>
    </RequireAuth>
  );
}
