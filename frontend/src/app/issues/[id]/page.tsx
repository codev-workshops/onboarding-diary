"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ConfirmDialog } from "@/components/entries/ConfirmDialog";
import { EntryForm } from "@/components/entries/EntryForm";
import { formatDateOnly, formatDateTime } from "@/components/ui/labels";
import { IssueSeverityTag, IssueStatusTag } from "@/features/issues/labels";
import { issueFields, issueToFormValues, toUpdateRequest, validateIssue } from "@/features/issues/issueForm";
import { ApiError, type Issue } from "@/lib/apiClient";
import { issueEtag } from "@/lib/api/issues";
import { useStores } from "@/stores/StoreProvider";
import { issueErrorMessage } from "@/stores/IssueStore";
import entryStyles from "@/components/entries/entries.module.css";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const IssueDetail = observer(function IssueDetail({ issue, backHref }: { issue: Issue; backHref: string }) {
  const { issues, auth } = useStores();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isOwner = auth.role === "NEW_RECRUIT" && auth.user?.id === issue.recruitId;
  const canDelete = isOwner || auth.role === "ADMIN";

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await issues.remove(issue.id);
      router.push(backHref);
    } catch (e) {
      setDeleteError(issueErrorMessage(e));
    }
  };

  if (editing) {
    return (
      <>
        <h1 className={formStyles.title}>Edit issue</h1>
        <EntryForm
          idPrefix="issue"
          fields={issueFields("edit", issue.status)}
          initialValues={issueToFormValues(issue)}
          validate={validateIssue}
          submitLabel="Save changes"
          busy={issues.mutating}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            try {
              await issues.update(issue.id, toUpdateRequest(values), issueEtag(issue));
            } catch (e) {
              if (e instanceof ApiError && e.code === "CONFLICT") {
                void issues.loadOne(issue.id);
                throw new Error(issueErrorMessage(e));
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
          <h1 className={entryStyles.detailTitle} data-testid="issue-title">
            {issue.title}
          </h1>
          <div className={entryStyles.itemMeta}>
            <IssueStatusTag status={issue.status} />
            <IssueSeverityTag severity={issue.severity} />
          </div>
        </div>
        {(isOwner || canDelete) && (
          <div className={formStyles.actions}>
            {isOwner && (
              <button type="button" className={formStyles.button} onClick={() => setEditing(true)} data-testid="issue-edit">
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className={`${formStyles.button} ${formStyles.buttonSecondary}`}
                onClick={() => setConfirmOpen(true)}
                data-testid="issue-delete"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      <dl className={formStyles.dl}>
        <dt>Date</dt>
        <dd data-testid="issue-date">{formatDateOnly(issue.entryDate)}</dd>
        <dt>Description</dt>
        <dd className={entryStyles.description} data-testid="issue-description">
          {issue.description || <span className={tableStyles.muted}>No description</span>}
        </dd>
        <dt>Resolution notes</dt>
        <dd className={entryStyles.description} data-testid="issue-resolution-notes">
          {issue.resolutionNotes || <span className={tableStyles.muted}>No resolution notes yet</span>}
        </dd>
        <dt>Created</dt>
        <dd>{formatDateTime(issue.createdAt)}</dd>
        <dt>Updated</dt>
        <dd>{formatDateTime(issue.updatedAt)}</dd>
      </dl>
      {!isOwner && <p className={tableStyles.muted}>Read-only view — only the recruit can edit their issues.</p>}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this issue?"
        confirmLabel="Delete"
        danger
        busy={issues.mutating}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError(null);
        }}
      >
        “{issue.title}” will be permanently removed. This cannot be undone.
      </ConfirmDialog>
    </>
  );
});

const IssuePageContent = observer(function IssuePageContent() {
  const { issues } = useStores();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const recruitId = search.get("recruitId");
  const backHref = recruitId ? `/recruits/${recruitId}?tab=issues` : "/issues";

  useEffect(() => {
    void issues.loadOne(params.id);
    return () => issues.clearCurrent();
  }, [issues, params.id]);

  const issue = issues.current;

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-label="Issue">
      <p className={tableStyles.muted}>
        <Link href={backHref} className={tableStyles.rowLink}>
          ← Back to issues
        </Link>
      </p>
      {issues.currentError && (
        <div className={formStyles.formError} role="alert" data-testid="issue-error">
          {issues.currentError}
        </div>
      )}
      {!issue && issues.currentLoading && <p className={tableStyles.muted}>Loading…</p>}
      {issue && issue.id === params.id && <IssueDetail issue={issue} backHref={backHref} />}
    </section>
  );
});

/** REQ-FUNC-041..043, 046: issue detail with edit / delete (owner) and the read-only manager/admin view. */
export default function IssuePage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <IssuePageContent />
      </Suspense>
    </RequireAuth>
  );
}
