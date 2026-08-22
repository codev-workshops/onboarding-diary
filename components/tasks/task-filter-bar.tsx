'use client';

import { PriorityLevel, TaskCategory, TaskStatus } from '@prisma/client';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { labelize } from '@/components/tasks/labels';

const selectClass =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none';

/**
 * Filters are written to the query string rather than to component state, so
 * back/forward and a copied link all behave, and the server does the filtering.
 */
export function TaskFilterBar({ canFilterByOwner }: { canFilterByOwner: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function apply(form: FormData) {
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && value.trim().length > 0) next.set(key, value.trim());
    }
    router.push(next.size > 0 ? `/tasks?${next}` : '/tasks');
  }

  const current = (key: string) => searchParams.get(key) ?? '';

  return (
    <form
      action={apply}
      aria-label="Filter tasks"
      className="bg-card grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Field label="Search" htmlFor="q">
        <Input id="q" name="q" defaultValue={current('q')} placeholder="Title or description" />
      </Field>

      <Field label="Status" htmlFor="status">
        <select id="status" name="status" defaultValue={current('status')} className={selectClass}>
          <option value="">Any status</option>
          {Object.values(TaskStatus).map((value) => (
            <option key={value} value={value}>
              {labelize(value)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Category" htmlFor="category">
        <select id="category" name="category" defaultValue={current('category')} className={selectClass}>
          <option value="">Any category</option>
          {Object.values(TaskCategory).map((value) => (
            <option key={value} value={value}>
              {labelize(value)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Priority" htmlFor="priority">
        <select id="priority" name="priority" defaultValue={current('priority')} className={selectClass}>
          <option value="">Any priority</option>
          {Object.values(PriorityLevel).map((value) => (
            <option key={value} value={value}>
              {labelize(value)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="From" htmlFor="date_from">
        <Input id="date_from" name="date_from" type="date" defaultValue={current('date_from')} />
      </Field>

      <Field label="To" htmlFor="date_to">
        <Input id="date_to" name="date_to" type="date" defaultValue={current('date_to')} />
      </Field>

      {canFilterByOwner ? (
        <Field label="Owner ID" htmlFor="owner_id">
          {/*
            A manager may narrow to one report. An id outside their scope is
            refused by the API with 403 rather than quietly ignored, which is
            why this is a filter and not a hidden default.
          */}
          <Input id="owner_id" name="owner_id" defaultValue={current('owner_id')} placeholder="Optional" />
        </Field>
      ) : null}

      <div className="flex items-end gap-2">
        <Button type="submit">Apply</Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/tasks')}>
          Reset
        </Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
