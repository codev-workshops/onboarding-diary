import type { ReactNode } from 'react';

import { Button } from '../../components/ui/Button.js';

export function EntryPageHeader({
  title,
  addLabel,
  onAdd,
}: {
  title: string;
  addLabel?: string;
  onAdd?: () => void;
}): ReactNode {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {onAdd === undefined || addLabel === undefined ? null : (
        <Button onClick={onAdd}>{addLabel}</Button>
      )}
    </div>
  );
}
