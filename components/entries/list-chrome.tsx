'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';

export type EntryPage = { page: number; page_size: number; total: number; total_pages: number };

export function EntryEmptyState({
  filtered,
  emptyTitle,
  emptyHint,
  filteredTitle,
  createLabel,
  onCreate,
}: {
  filtered: boolean;
  emptyTitle: string;
  emptyHint: string;
  filteredTitle: string;
  createLabel: string;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">{filtered ? filteredTitle : emptyTitle}</p>
      <p className="text-muted-foreground mt-1 text-sm">
        {filtered ? 'Try widening the date range or clearing a filter.' : emptyHint}
      </p>
      {filtered ? null : (
        <Button className="mt-4" onClick={onCreate}>
          {createLabel}
        </Button>
      )}
    </div>
  );
}

/** Paging keeps the current filters; only `page` is rewritten. */
export function EntryPagination({ basePath, page }: { basePath: string; page: EntryPage }) {
  const searchParams = useSearchParams();

  const href = (target: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(target));
    return `${basePath}?${next}`;
  };

  if (page.total_pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {page.page} of {page.total_pages}
      </span>
      <div className="flex gap-2">
        {page.page > 1 ? (
          <Link className="hover:bg-muted rounded-md border px-3 py-1.5" href={href(page.page - 1)}>
            Previous
          </Link>
        ) : null}
        {page.page < page.total_pages ? (
          <Link className="hover:bg-muted rounded-md border px-3 py-1.5" href={href(page.page + 1)}>
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

/**
 * Buttons are hidden for entries the actor does not own — presentation only.
 * The API refuses the same operations regardless of what was rendered (S3).
 * They are disabled while the list is refreshing, so an action is never sent
 * for a row the server has already replaced.
 */
export function EntryRowActions({
  owned,
  busy = false,
  editable = true,
  onEdit,
  onDelete,
}: {
  owned: boolean;
  busy?: boolean;
  editable?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!owned) return <span className="text-muted-foreground text-xs">Read only</span>;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {editable ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={onEdit}>
          Edit
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" disabled={busy} onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
