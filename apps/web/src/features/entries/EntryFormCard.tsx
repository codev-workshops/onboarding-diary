import type { ReactNode } from 'react';

import { Button } from '../../components/ui/Button.js';

/**
 * Frame shared by the four create/edit forms. The same form serves both modes; only the
 * heading and the submit label change (FR-T2).
 */
export function EntryFormCard({
  mode,
  noun,
  rootError,
  isSaving,
  onSubmit,
  onCancel,
  children,
}: {
  mode: 'create' | 'edit';
  noun: string;
  rootError?: string | undefined;
  isSaving: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  children: ReactNode;
}): ReactNode {
  const heading = mode === 'create' ? `New ${noun}` : `Edit ${noun}`;

  return (
    <form
      aria-label={heading}
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4"
      noValidate
      onSubmit={onSubmit}
    >
      <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      {rootError === undefined ? null : (
        <p className="text-sm text-red-800" role="alert">
          {rootError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" isLoading={isSaving}>
          {mode === 'create' ? `Add ${noun}` : 'Save changes'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
