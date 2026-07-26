import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { Button } from './Button.js';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Modal confirmation used before destructive actions (FR-X5). Focus moves to the confirm
 * button on open, Tab is trapped inside the dialog, and Escape cancels.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactNode {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;

    const first = confirmRef.current;
    const last = cancelRef.current;
    if (first === null || last === null) return;

    const forwardFromLast = !event.shiftKey && document.activeElement === last;
    const backwardFromFirst = event.shiftKey && document.activeElement === first;
    if (forwardFromLast) {
      event.preventDefault();
      first.focus();
    } else if (backwardFromFirst) {
      event.preventDefault();
      last.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onKeyDown={onKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg"
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description === undefined ? null : (
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button ref={confirmRef} variant="danger" isLoading={isConfirming} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
