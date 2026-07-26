import type { ReactNode } from 'react';

import { Button } from '../../components/ui/Button.js';

/**
 * Layout for a filter row: the controls, a live result count, and one reset action that
 * clears every filter at once (FR-T5).
 */
export function FilterBar({
  children,
  total,
  activeCount,
  onReset,
}: {
  children: ReactNode;
  total: number | undefined;
  activeCount: number;
  onReset: () => void;
}): ReactNode {
  return (
    <section
      aria-label="Filters"
      className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600" role="status">
          {total === undefined
            ? 'Loading results'
            : `${total} matching ${total === 1 ? 'entry' : 'entries'}`}
        </p>
        <Button variant="secondary" disabled={activeCount === 0} onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </section>
  );
}
