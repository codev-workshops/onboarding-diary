"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ConfirmDialog } from "@/components/entries/ConfirmDialog";
import { EntryForm } from "@/components/entries/EntryForm";
import { formatDateOnly, formatDateTime } from "@/components/ui/labels";
import { FeedbackTypeTag, FeedbackVisibilityNotice } from "@/features/feedback/labels";
import { feedbackFields, feedbackToFormValues, toUpdateRequest, validateFeedback } from "@/features/feedback/feedbackForm";
import { ApiError, type Feedback } from "@/lib/apiClient";
import { feedbackEtag } from "@/lib/api/feedback";
import { useStores } from "@/stores/StoreProvider";
import { feedbackErrorMessage } from "@/stores/FeedbackStore";
import entryStyles from "@/components/entries/entries.module.css";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const FeedbackDetail = observer(function FeedbackDetail({ note, backHref }: { note: Feedback; backHref: string }) {
  const { feedback, auth } = useStores();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isOwner = auth.role === "NEW_RECRUIT" && auth.user?.id === note.recruitId;
  const canDelete = isOwner || auth.role === "ADMIN";

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await feedback.remove(note.id);
      router.push(backHref);
    } catch (e) {
      setDeleteError(feedbackErrorMessage(e));
    }
  };

  if (editing) {
    return (
      <>
        <h1 className={formStyles.title}>Edit feedback</h1>
        <EntryForm
          idPrefix="feedback"
          fields={feedbackFields()}
          initialValues={feedbackToFormValues(note)}
          validate={validateFeedback}
          submitLabel="Save changes"
          busy={feedback.mutating}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            try {
              await feedback.update(note.id, toUpdateRequest(values), feedbackEtag(note));
            } catch (e) {
              if (e instanceof ApiError && e.code === "CONFLICT") {
                void feedback.loadOne(note.id);
                throw new Error(feedbackErrorMessage(e));
              }
              throw e;
            }
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
          <h1 className={entryStyles.detailTitle} data-testid="feedback-subject">
            {note.subject}
          </h1>
          <div className={entryStyles.itemMeta}>
            <FeedbackTypeTag type={note.type} />
          </div>
        </div>
        {(isOwner || canDelete) && (
          <div className={formStyles.actions}>
            {isOwner && (
              <button type="button" className={formStyles.button} onClick={() => setEditing(true)} data-testid="feedback-edit">
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className={`${formStyles.button} ${formStyles.buttonSecondary}`}
                onClick={() => setConfirmOpen(true)}
                data-testid="feedback-delete"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      <FeedbackVisibilityNotice audience={isOwner ? "recruit" : "viewer"} />
      <dl className={formStyles.dl}>
        <dt>Date</dt>
        <dd data-testid="feedback-date">{formatDateOnly(note.entryDate)}</dd>
        <dt>Details</dt>
        <dd className={entryStyles.description} data-testid="feedback-details">
          {note.details}
        </dd>
        <dt>Created</dt>
        <dd>{formatDateTime(note.createdAt)}</dd>
        <dt>Updated</dt>
        <dd>{formatDateTime(note.updatedAt)}</dd>
      </dl>
      {!isOwner && <p className={tableStyles.muted}>Read-only view — only the recruit can edit their feedback.</p>}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this feedback note?"
        confirmLabel="Delete"
        danger
        busy={feedback.mutating}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError(null);
        }}
      >
        “{note.subject}” will be permanently removed. This cannot be undone.
      </ConfirmDialog>
    </>
  );
});

const FeedbackPageContent = observer(function FeedbackPageContent() {
  const { feedback } = useStores();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const recruitId = search.get("recruitId");
  const backHref = recruitId ? `/recruits/${recruitId}?tab=feedback` : "/feedback";

  useEffect(() => {
    void feedback.loadOne(params.id);
    return () => feedback.clearCurrent();
  }, [feedback, params.id]);

  const note = feedback.current;

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-label="Feedback">
      <p className={tableStyles.muted}>
        <Link href={backHref} className={tableStyles.rowLink}>
          ← Back to feedback
        </Link>
      </p>
      {feedback.currentError && (
        <div className={formStyles.formError} role="alert" data-testid="feedback-error">
          {feedback.currentError}
        </div>
      )}
      {!note && feedback.currentLoading && <p className={tableStyles.muted}>Loading…</p>}
      {note && note.id === params.id && <FeedbackDetail note={note} backHref={backHref} />}
    </section>
  );
});

/** REQ-FUNC-051, 053, 054: feedback detail with edit / delete (owner) and the read-only manager/admin view (404 when not visible). */
export default function FeedbackDetailPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <FeedbackPageContent />
      </Suspense>
    </RequireAuth>
  );
}
