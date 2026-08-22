'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EntryFilterBar, type SelectFilter } from '@/components/entries/filter-bar';
import type { SavedEntry } from '@/components/entries/form';
import type { EntryPage } from '@/components/entries/list-chrome';
import { Button } from '@/components/ui/button';

type PendingWrite = { id: string; version?: number; deleted?: boolean };

/** Whether the rows the server just sent already carry the write we made. */
function reflects<T extends { id: string; version: number }>(items: T[], write: PendingWrite): boolean {
  const row = items.find((item) => item.id === write.id);
  if (write.deleted) return row === undefined;
  return row !== undefined && row.version >= (write.version ?? 0);
}

export type WorkspaceRenderArgs<T> = {
  items: T[];
  busy: boolean;
  filtered: boolean;
  page: EntryPage;
  onCreate: () => void;
  onEdit: (entry: T) => void;
  onDelete: (entry: T) => void;
};

const REFRESH_ATTEMPTS = 5;
const REFRESH_RETRY_MS = 300;

/**
 * Owns the client state that a server page cannot: which dialog is open and
 * whether a mutation is in flight. Everything else — filters, pagination, the
 * rows themselves — is server state addressed by the URL, refreshed with
 * `router.refresh()` after a write so the list re-renders through the same
 * scoped query rather than being patched locally.
 *
 * A refresh can be dropped before it is applied: the router aborts an
 * in-flight payload when a render or navigation overtakes it, which would
 * leave the list showing a row the server has already changed. Each write
 * reports the id and version it produced, so the refresh is re-issued until
 * the list carries that write. The retries are bounded because an entry can
 * legitimately land outside the current page or filter, where no refresh will
 * ever show it. Actions stay disabled until the write settles, so a second
 * write cannot race the first.
 */
export function EntryWorkspace<T extends { id: string; version: number }>({
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
  renderDialog: (args: {
    entry?: T;
    onClose: () => void;
    onSaved: (saved: SavedEntry | null) => void;
  }) => React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [write, setWrite] = useState<PendingWrite | null>(null);

  const pending = write !== null;
  const filtered = Array.from(searchParams.keys()).some((key) => key !== 'page');

  useEffect(() => {
    if (!write) return;

    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;

    const askServer = () => {
      attempt += 1;
      router.refresh();
      timer =
        attempt < REFRESH_ATTEMPTS
          ? setTimeout(askServer, REFRESH_RETRY_MS)
          : setTimeout(() => setWrite(null), REFRESH_RETRY_MS);
    };

    askServer();
    return () => clearTimeout(timer);
  }, [write, router]);

  useEffect(() => {
    if (write && reflects(items, write)) setWrite(null);
  }, [write, items]);

  function refresh(saved: PendingWrite | null) {
    setWrite(saved ?? { id: '', version: 0 });
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
    refresh({ id: entry.id, deleted: true });
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
        <Button disabled={pending} onClick={() => setCreating(true)}>
          {createLabel}
        </Button>
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
            onSaved: (saved) => {
              setCreating(false);
              refresh(saved);
            },
          })
        : null}

      {editing
        ? renderDialog({
            entry: editing,
            onClose: () => setEditing(null),
            onSaved: (saved) => {
              setEditing(null);
              refresh(saved);
            },
          })
        : null}
    </div>
  );
}
