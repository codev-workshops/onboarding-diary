import { cn } from '@/lib/utils';
import { PERIOD_CHOICES } from '@/src/modules/dashboard/schemas';

const LABELS: Record<number, string> = { 7: '7 days', 30: '30 days', 90: '90 days', 365: '12 months' };

/**
 * The period is part of the URL, so a dashboard can be shared and reloaded. These are plain anchors
 * rather than `next/link`: the tabs differ from the page they sit on only by query string, and the
 * client router drops such a navigation when it already holds a prefetched entry for the same path,
 * leaving the address bar and the rendered period disagreeing. A dashboard is server-rendered in one
 * request anyway, so a full navigation costs a round trip that the RSC fetch was making regardless.
 */
export function PeriodTabs({ basePath, days }: { basePath: string; days: number }) {
  return (
    <nav aria-label="Period" className="flex flex-wrap gap-1 text-sm">
      {PERIOD_CHOICES.map((choice) => (
        <a
          key={choice}
          href={`${basePath}?days=${choice}`}
          aria-current={choice === days ? 'page' : undefined}
          className={cn(
            'hover:bg-muted rounded-md border px-3 py-1.5 transition-colors',
            choice === days ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground'
          )}
        >
          {LABELS[choice]}
        </a>
      ))}
    </nav>
  );
}
