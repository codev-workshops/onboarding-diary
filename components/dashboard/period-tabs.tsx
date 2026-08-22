import Link from 'next/link';

import { cn } from '@/lib/utils';
import { PERIOD_CHOICES } from '@/src/modules/dashboard/schemas';

const LABELS: Record<number, string> = { 7: '7 days', 30: '30 days', 90: '90 days', 365: '12 months' };

/** Server-rendered links rather than client state: the period is part of the URL, so a dashboard can be shared and reloaded. */
export function PeriodTabs({ basePath, days }: { basePath: string; days: number }) {
  return (
    <nav aria-label="Period" className="flex flex-wrap gap-1 text-sm">
      {PERIOD_CHOICES.map((choice) => (
        <Link
          key={choice}
          href={choice === 30 ? basePath : `${basePath}?days=${choice}`}
          prefetch={false}
          aria-current={choice === days ? 'page' : undefined}
          className={cn(
            'hover:bg-muted rounded-md border px-3 py-1.5 transition-colors',
            choice === days ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground'
          )}
        >
          {LABELS[choice]}
        </Link>
      ))}
    </nav>
  );
}
