import type { ReactNode } from 'react';

import { Button } from './Button.js';

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps): ReactNode {
  const lastPage = pageCount(total, pageSize);
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 py-3">
      <p className="text-xs text-slate-600" role="status">
        {total === 0 ? 'No results' : `${first}–${last} of ${total}`}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
