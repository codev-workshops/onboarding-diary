import type { ReactNode } from 'react';
import { ApiError } from '../api/client';

/** The three states every list screen shows, so they read and behave the same everywhere. */
export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" className="text-sm text-slate-600">
      {label}
    </p>
  );
}

export function ErrorState({
  error,
  fallback,
  onRetry,
}: {
  error: unknown;
  fallback: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="space-y-2 text-sm text-red-600">
      <p>{error instanceof ApiError ? error.message : fallback}</p>
      <button
        type="button"
        className="rounded-md border border-slate-300 px-3 py-1 text-slate-700"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}

export function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
      <p className="text-sm text-slate-600">{message}</p>
      {children}
    </div>
  );
}
