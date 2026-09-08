import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusable(container: HTMLElement | null): HTMLElement[] {
  return container === null ? [] : [...container.querySelectorAll<HTMLElement>(focusableSelector)];
}

/**
 * Keeps Tab inside an open dialog, closes it on Escape and hands focus back to whatever opened it.
 * `onClose` is read through a ref so a new inline callback each render does not steal focus back
 * to the first field while the user is typing.
 */
function useDialogFocus(onClose?: () => void) {
  const container = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);

  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusable(container.current)[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close.current?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const items = focusable(container.current);
      if (items.length === 0) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = container.current !== null && !container.current.contains(active);

      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, []);

  return container;
}

export function Modal({
  title,
  titleId,
  onClose,
  children,
}: {
  title: string;
  titleId: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  const container = useDialogFocus(onClose);

  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-slate-900/40 sm:p-4">
      <div
        ref={container}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="min-h-full w-full bg-white p-4 shadow-lg sm:min-h-0 sm:max-w-lg sm:rounded-lg sm:p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

/** Prefers the per-field validation messages so the user learns which input the API rejected. */
export function serverMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) {
    return ['Something went wrong. Try again.'];
  }

  const fieldMessages = Object.values(error.fieldErrors);
  return fieldMessages.length > 0 ? fieldMessages : [error.message];
}

export function ServerErrors({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  return (
    <div role="alert" className="space-y-1 text-sm text-red-600">
      {serverMessages(error).map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}

export function ConfirmDelete({
  label,
  pending,
  onConfirm,
  onCancel,
}: {
  label: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const container = useDialogFocus(onCancel);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        ref={container}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm delete"
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
      >
        <p className="text-sm">Delete “{label}”? This cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={pending}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecruitOnlyNotice({ title }: { title: string }) {
  return (
    <section className="space-y-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-slate-600">
        Only recruits keep a diary.{' '}
        <Link className="underline" to="/team">
          Open the team view
        </Link>{' '}
        to read your recruits&apos; entries.
      </p>
    </section>
  );
}
