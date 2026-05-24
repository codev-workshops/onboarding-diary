import type { PaginationMeta } from '@onboarding-diary/shared';
import { Button } from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.total_pages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-2 py-3">
      <p className="text-sm text-gray-500">
        Page {meta.page} of {meta.total_pages} ({meta.total_count} total)
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.has_prev}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.has_next}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
