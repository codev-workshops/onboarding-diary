import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

/** Deliberate loading state (docs/PLAN.md — no screen ever looks broken). */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-12 text-danger"
      role="alert"
    >
      <AlertTriangle className="h-5 w-5" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
      <Inbox className="h-8 w-8" aria-hidden />
      <p className="font-medium text-foreground">{title}</p>
      {hint ? <p className="text-sm">{hint}</p> : null}
    </div>
  );
}
