import type { ReactNode } from 'react';

export function FullPageSpinner({ label }: { label: string }): ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-600" role="status">
        {label}
      </p>
    </div>
  );
}
