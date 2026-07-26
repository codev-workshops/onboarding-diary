import type { ReactNode } from 'react';

import { AccessDenied } from '../../app/AccessDeniedPage.js';
import { ApiError } from '../../lib/apiClient.js';
import { Button } from './Button.js';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {description === undefined ? null : (
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      )}
      {action === undefined ? null : <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Retryable error state; the `requestId` is shown so support can find the server log. A 403 is
 * not retryable, so it renders the shared access-denied screen instead (TRD 6.4).
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}): ReactNode {
  const apiError = error instanceof ApiError ? error : null;
  if (apiError?.status === 403) {
    return <AccessDenied description={apiError.message} />;
  }
  const message =
    apiError?.message ?? (error instanceof Error ? error.message : 'Something went wrong');

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6" role="alert">
      <p className="text-sm font-medium text-red-900">{message}</p>
      {apiError?.requestId === null || apiError === null ? null : (
        <p className="mt-1 text-xs text-red-800">Reference: {apiError.requestId}</p>
      )}
      {onRetry === undefined ? null : (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }): ReactNode {
  return (
    <div
      aria-hidden="true"
      className={['animate-pulse rounded bg-slate-200', className ?? 'h-4 w-full'].join(' ')}
    />
  );
}
