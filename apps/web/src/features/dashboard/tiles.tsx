import type { ReactNode } from 'react';

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}): ReactNode {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint === undefined ? null : <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

/** Task completion as an accessible progress bar (FR-D2). */
export function ProgressBar({
  label,
  completed,
  total,
  percent,
}: {
  label: string;
  completed: number;
  total: number;
  percent: number;
}): ReactNode {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-sm text-slate-600">
          {completed} of {total} done ({percent}%)
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
