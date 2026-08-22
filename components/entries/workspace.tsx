'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { EntryFilterBar, type SelectFilter } from '@/components/entries/filter-bar';
import type { EntryPage } from '@/components/entries/list-chrome';
import { Button } from '@/components/ui/button';

export type WorkspaceRenderArgs<T> = {
  items: T[];
  busy: boolean;
  filtered: boolean;
  page: EntryPage;
  onCreate: () => void;
  onEdit: (entry: T) => void;
  onDelete: (entry: T) => void;
};

/**
 * Owns the client state that a server page cannot: which dialog is open and
 * whether a mutation is in flight. Everything else — filters, pagination, the
 * rows themselves — is server state addressed by the URL, refreshed with
 * `router.refresh()` after a write so the list re-renders through the same
 * scoped query rather than being patched locally.
 */
export function EntryWorkspace<T extends { id: string }>({
  heading,
  countNoun,
  createLabel,
  basePath,
  endpoint,
  searchPlaceholder,
  selects,
  extraFilter,
  canFilterByOwner,
  confirmDelete,
  page,
  items,
  renderList,
  renderDialog,
}: {
  heading: string;
  countNoun: [singular: string, plural: string];
  createLabel: string;
  basePath: string;
  endpoint: string;
  searchPlaceholder: string;
  selects: SelectFilter[];
  extraFilter?: { name: string; label: string; placeholder: string };
  canFilterByOwner: boolean;
  confirmDelete: (entry: T) => string;
  page: EntryPage;
  items: T[];
  renderList: (args: WorkspaceRenderArgs<T>) => React.ReactNode;
  renderDialog: (args: { entry?: T; onClose: () => void; onSaved: () => void }) => React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = Array.from(searchParams.keys()).some((key) => key !== 'page');

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function remove(entry: T) {
    setError(null);
    if (!confirm(confirmDelete(entry))) return;

    const response = await fetch(`${endpoint}/${entry.id}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? 'The entry could not be deleted.');
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-muted-foreground text-sm">
            {page.total} {page.total === 1 ? countNoun[0] : countNoun[1]}
            {filtered ? ' matching your filters' : ' in your diary'}.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>{createLabel}</Button>
      </div>

      <EntryFilterBar
        basePath={basePath}
        legend={`Filter ${countNoun[1]}`}
        canFilterByOwner={canFilterByOwner}
        searchPlaceholder={searchPlaceholder}
        selects={selects}
        extra={extraFilter}
      />

      {error ? (
        <p
          role="alert"
          className="border-destructive/40 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      {renderList({
        items,
        busy: pending,
        filtered,
        page,
        onCreate: () => setCreating(true),
        onEdit: setEditing,
        onDelete: remove,
      })}

      {creating
        ? renderDialog({
            onClose: () => setCreating(false),
            onSaved: () => {
              setCreating(false);
              refresh();
            },
          })
        : null}

      {editing
        ? renderDialog({
            entry: editing,
            onClose: () => setEditing(null),
            onSaved: () => {
              setEditing(null);
              refresh();
            },
          })
        : null}
    </div>
  );
}
