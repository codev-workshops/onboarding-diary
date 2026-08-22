'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { TaskDialog } from '@/components/tasks/task-dialog';
import { TaskFilterBar } from '@/components/tasks/task-filter-bar';
import { TaskList } from '@/components/tasks/task-list';
import { Button } from '@/components/ui/button';
import type { TaskDto } from '@/src/modules/tasks/dto';

export type TaskPage = { page: number; page_size: number; total: number; total_pages: number };

/**
 * Owns the client state that the server page cannot: which dialog is open and
 * whether a mutation is in flight. Everything else — filters, pagination, the
 * rows themselves — is server state addressed by the URL, refreshed with
 * `router.refresh()` after a write so the list re-renders through the same
 * scoped query rather than being patched locally.
 */
export function TaskWorkspace({
  actorId,
  canFilterByOwner,
  page,
  tasks,
}: {
  actorId: string;
  canFilterByOwner: boolean;
  page: TaskPage;
  tasks: TaskDto[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [editing, setEditing] = useState<TaskDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = Array.from(searchParams.keys()).some((key) => key !== 'page');

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function remove(task: TaskDto) {
    setError(null);
    const response = await fetch(`/api/v1/tasks/${task.id}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? 'The task could not be deleted.');
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            {page.total} {page.total === 1 ? 'task' : 'tasks'}
            {filtered ? ' matching your filters' : ' in your diary'}.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New task</Button>
      </div>

      <TaskFilterBar canFilterByOwner={canFilterByOwner} />

      {error ? (
        <p
          role="alert"
          className="border-destructive/40 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <TaskList
        actorId={actorId}
        busy={pending}
        filtered={filtered}
        onCreate={() => setCreating(true)}
        onDelete={remove}
        onEdit={setEditing}
        page={page}
        tasks={tasks}
      />

      {creating ? (
        <TaskDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refresh();
          }}
        />
      ) : null}

      {editing ? (
        <TaskDialog
          task={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
