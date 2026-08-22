'use client';

import { PriorityLevel, TaskCategory, TaskStatus } from '@prisma/client';
import { useEffect, useRef, useState } from 'react';

import { labelize } from '@/components/tasks/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TaskDto } from '@/src/modules/tasks/dto';

const selectClass =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none';

type FieldErrors = Record<string, string>;

/**
 * Create and edit share one form: the fields are identical and an edit is a
 * PATCH of the same shape. The server's field-level validation errors are
 * rendered against their fields rather than collapsed into a banner, so a 422
 * tells the user which input to fix.
 */
export function TaskDialog({
  task,
  onClose,
  onSaved,
}: {
  task?: TaskDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(form: FormData) {
    setSaving(true);
    setMessage(null);
    setFieldErrors({});

    const body = {
      entry_date: String(form.get('entry_date') ?? ''),
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? '').trim() || null,
      category: String(form.get('category') ?? ''),
      status: String(form.get('status') ?? ''),
      priority: String(form.get('priority') ?? ''),
    };

    const response = await fetch(task ? `/api/v1/tasks/${task.id}` : '/api/v1/tasks', {
      method: task ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (response.ok) {
      onSaved();
      return;
    }

    const payload = await response.json().catch(() => null);
    const details: { field: string; message: string }[] = payload?.error?.details ?? [];
    setFieldErrors(Object.fromEntries(details.map((detail) => [detail.field, detail.message])));
    setMessage(payload?.error?.message ?? 'The task could not be saved.');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="bg-background max-h-full w-full max-w-lg overflow-y-auto rounded-t-lg border p-6 shadow-lg sm:rounded-lg"
      >
        <h2 id="task-dialog-title" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
          {task ? 'Edit task' : 'New task'}
        </h2>

        <form action={submit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-entry_date">Date</Label>
            <Input
              id="task-entry_date"
              name="entry_date"
              type="date"
              required
              defaultValue={task?.entry_date ?? new Date().toISOString().slice(0, 10)}
            />
            <FieldError message={fieldErrors.entry_date} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              name="title"
              required
              minLength={3}
              maxLength={140}
              defaultValue={task?.title}
            />
            <FieldError message={fieldErrors.title} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <textarea
              id="task-description"
              name="description"
              rows={4}
              maxLength={5000}
              defaultValue={task?.description ?? ''}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
            />
            <FieldError message={fieldErrors.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Choice
              name="category"
              label="Category"
              values={Object.values(TaskCategory)}
              current={task?.category ?? 'OTHER'}
            />
            <Choice
              name="status"
              label="Status"
              values={Object.values(TaskStatus)}
              current={task?.status ?? 'TODO'}
            />
            <Choice
              name="priority"
              label="Priority"
              values={Object.values(PriorityLevel)}
              current={task?.priority ?? 'MEDIUM'}
            />
          </div>

          {message ? (
            <p role="alert" className="text-destructive text-sm">
              {message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Choice({
  name,
  label,
  values,
  current,
}: {
  name: string;
  label: string;
  values: string[];
  current: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`task-${name}`}>{label}</Label>
      <select id={`task-${name}`} name={name} defaultValue={current} className={selectClass}>
        {values.map((value) => (
          <option key={value} value={value}>
            {labelize(value)}
          </option>
        ))}
      </select>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}
