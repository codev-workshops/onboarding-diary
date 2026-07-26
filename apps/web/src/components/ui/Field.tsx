import { useId } from 'react';
import type { ReactNode } from 'react';

import { cx } from './styles.js';

export type FieldProps = {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  /** Receives the ids the control must carry so the label and error stay associated. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** Wraps a control with its label, hint, and inline error message (FR-X6). */
export function Field({ label, error, hint, required = false, children }: FieldProps): ReactNode {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    cx(hint === undefined ? undefined : hintId, error === undefined ? undefined : errorId) ||
    undefined;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-800" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {hint === undefined ? null : (
        <p className="text-xs text-slate-500" id={hintId}>
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: error !== undefined })}
      {error === undefined ? null : (
        <p className="text-xs font-medium text-red-700" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
