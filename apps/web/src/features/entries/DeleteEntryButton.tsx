import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '../../components/ui/Button.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import type { EntryResource } from '../../app/queryKeys.js';
import { ENTRY_LABELS } from './entryResources.js';
import { useDeleteEntry } from './useEntries.js';

/** Delete is always behind a confirmation because entries cannot be recovered (FR-X5). */
export function DeleteEntryButton({
  resource,
  id,
  title,
}: {
  resource: EntryResource;
  id: string;
  title: string;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const remove = useDeleteEntry(resource);
  const label = ENTRY_LABELS[resource].singular;

  return (
    <>
      <Button
        variant="secondary"
        aria-label={`Delete ${label} ${title}`}
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        title={`Delete this ${label}?`}
        description={`"${title}" will be permanently removed.`}
        isConfirming={remove.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          remove.mutate(id, { onSuccess: () => setOpen(false) });
        }}
      />
    </>
  );
}
