"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ConfirmDialog } from "@/components/entries/ConfirmDialog";
import { EntryForm } from "@/components/entries/EntryForm";
import { formatDateOnly, formatDateTime } from "@/components/ui/labels";
import { TASK_CATEGORY_LABELS, TaskPriorityTag, TaskStatusTag } from "@/features/tasks/labels";
import { taskFields, taskToFormValues, toUpdateRequest, validateTask } from "@/features/tasks/taskForm";
import { ApiError, type Task } from "@/lib/apiClient";
import { taskEtag } from "@/lib/api/tasks";
import { useStores } from "@/stores/StoreProvider";
import { taskErrorMessage } from "@/stores/TaskStore";
import entryStyles from "@/components/entries/entries.module.css";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const TaskDetail = observer(function TaskDetail({ task, backHref }: { task: Task; backHref: string }) {
  const { tasks, auth } = useStores();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isOwner = auth.role === "NEW_RECRUIT" && auth.user?.id === task.recruitId;
  const canDelete = isOwner || auth.role === "ADMIN";

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await tasks.remove(task.id);
      router.push(backHref);
    } catch (e) {
      setDeleteError(taskErrorMessage(e));
    }
  };

  if (editing) {
    return (
      <>
        <h1 className={formStyles.title}>Edit task</h1>
        <EntryForm
          idPrefix="task"
          fields={taskFields("edit", task.status)}
          initialValues={taskToFormValues(task)}
          validate={validateTask}
          submitLabel="Save changes"
          busy={tasks.mutating}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            try {
              await tasks.update(task.id, toUpdateRequest(values), taskEtag(task));
            } catch (e) {
              if (e instanceof ApiError && e.code === "CONFLICT") {
                void tasks.loadOne(task.id);
                throw new Error(taskErrorMessage(e));
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
          <h1 className={entryStyles.detailTitle} data-testid="task-title">
            {task.title}
          </h1>
          <div className={entryStyles.itemMeta}>
            <TaskStatusTag status={task.status} />
            <TaskPriorityTag priority={task.priority} />
            <span className={entryStyles.tag}>{TASK_CATEGORY_LABELS[task.category]}</span>
          </div>
        </div>
        {(isOwner || canDelete) && (
          <div className={formStyles.actions}>
            {isOwner && (
              <button type="button" className={formStyles.button} onClick={() => setEditing(true)} data-testid="task-edit">
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className={`${formStyles.button} ${formStyles.buttonSecondary}`}
                onClick={() => setConfirmOpen(true)}
                data-testid="task-delete"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      <dl className={formStyles.dl}>
        <dt>Date</dt>
        <dd data-testid="task-date">{formatDateOnly(task.entryDate)}</dd>
        <dt>Description</dt>
        <dd className={entryStyles.description} data-testid="task-description">
          {task.description || <span className={tableStyles.muted}>No description</span>}
        </dd>
        <dt>Created</dt>
        <dd>{formatDateTime(task.createdAt)}</dd>
        <dt>Updated</dt>
        <dd>{formatDateTime(task.updatedAt)}</dd>
      </dl>
      {!isOwner && <p className={tableStyles.muted}>Read-only view — only the recruit can edit their tasks.</p>}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this task?"
        confirmLabel="Delete"
        danger
        busy={tasks.mutating}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError(null);
        }}
      >
        “{task.title}” will be permanently removed. This cannot be undone.
      </ConfirmDialog>
    </>
  );
});

const TaskPageContent = observer(function TaskPageContent() {
  const { tasks } = useStores();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const recruitId = search.get("recruitId");
  const backHref = recruitId ? `/recruits/${recruitId}?tab=tasks` : "/tasks";

  useEffect(() => {
    void tasks.loadOne(params.id);
    return () => tasks.clearCurrent();
  }, [tasks, params.id]);

  const task = tasks.current;

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-label="Task">
      <p className={tableStyles.muted}>
        <Link href={backHref} className={tableStyles.rowLink}>
          ← Back to tasks
        </Link>
      </p>
      {tasks.currentError && (
        <div className={formStyles.formError} role="alert" data-testid="task-error">
          {tasks.currentError}
        </div>
      )}
      {!task && tasks.currentLoading && <p className={tableStyles.muted}>Loading…</p>}
      {task && task.id === params.id && <TaskDetail task={task} backHref={backHref} />}
    </section>
  );
});

/** REQ-FUNC-031..033: task detail with edit / delete (owner) and the read-only manager/admin view. */
export default function TaskPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <TaskPageContent />
      </Suspense>
    </RequireAuth>
  );
}
