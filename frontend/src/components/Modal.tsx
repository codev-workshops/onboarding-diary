import type { ReactNode } from 'react';
import { ApiError } from '../api/client';

export function Modal({
  title,
  titleId,
  children,
}: {
  title: string;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg"
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
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
      <div
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
        Only recruits keep a diary. Read-only access to your recruits&apos; entries arrives with the
        team view.
      </p>
    </section>
  );
}
