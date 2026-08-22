import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSummary } from '@/src/modules/dashboard/dto';

export function CompletionBar({ pct }: { pct: number }) {
  return (
    <div
      className="bg-muted h-2 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-label="Task completion"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

/**
 * `notes` is rendered only when the viewer is the owner or an admin. That is a
 * presentation choice on top of a server guarantee, not instead of one: a
 * manager's payload carries 0 because the rows are outside their scope, and a
 * zero would read as "this recruit writes no notes" rather than "you cannot
 * see them".
 */
export function SummaryCards({
  summary,
  showNotes,
  daysSinceStart,
}: {
  summary: DashboardSummary;
  showNotes: boolean;
  daysSinceStart?: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Tasks"
        value={String(summary.tasks_total)}
        hint={`${summary.tasks_done} done · ${summary.tasks_cancelled} cancelled`}
      />
      <Stat
        label="Completion"
        value={`${summary.task_completion_pct}%`}
        hint="Done ÷ tasks excluding cancelled"
      />
      <Stat
        label="Open issues"
        value={String(summary.issues_open)}
        hint={`${summary.issues_critical_open} critical`}
      />
      {showNotes ? (
        <Stat
          label="Feedback & notes"
          value={`${summary.feedback_total} · ${summary.notes_total}`}
          hint="Feedback shared · private notes"
        />
      ) : (
        <Stat
          label="Feedback"
          value={String(summary.feedback_total)}
          hint={daysSinceStart === undefined ? 'Shared with you' : `Day ${daysSinceStart} of onboarding`}
        />
      )}
    </div>
  );
}
