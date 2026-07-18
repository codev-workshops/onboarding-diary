import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { UserName } from '@/components/UserName';
import { useTeamOverview } from '@/hooks/data';
import type { TeamRecruitSummary } from '@/lib/types';

/** Manager landing page: overview of overseen recruits (docs/ASSUMPTIONS.md §15). */
export function TeamPage() {
  const { data, isLoading, isError, error } = useTeamOverview();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader title="Team" description="Onboarding progress for the recruits you oversee." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Recruits" value={data.totals.recruits} />
        <Stat label="Open issues" value={data.totals.openIssues} />
        <Stat label="Overdue tasks" value={data.totals.overdue} />
        <Stat label="Avg. completion" value={`${data.totals.completionRate}%`} />
      </div>

      <div className="mt-6">
        {data.recruits.length === 0 ? (
          <EmptyState title="No recruits assigned yet" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.recruits.map((recruit) => (
              <RecruitCard key={recruit.id} recruit={recruit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecruitCard({ recruit }: { recruit: TeamRecruitSummary }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">
              <UserName name={recruit.name} isActive={recruit.isActive} />
            </p>
            <p className="text-sm text-muted-foreground">{recruit.email}</p>
            {recruit.department ? (
              <Badge tone="neutral" className="mt-2">
                {recruit.department}
              </Badge>
            ) : null}
          </div>
          <Link
            to={`/reports?recruitId=${recruit.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Report
          </Link>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Task completion</span>
            <span className="font-medium">
              {recruit.taskCompleted}/{recruit.taskTotal} · {recruit.completionRate}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${recruit.completionRate}%` }}
              role="progressbar"
              aria-valuenow={recruit.completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {recruit.overdue > 0 ? (
            <Badge tone="danger">{recruit.overdue} overdue</Badge>
          ) : null}
          <span>
            <span className="font-medium text-foreground">{recruit.openIssues}</span> open issues
          </span>
          <span>
            <span className="font-medium text-foreground">{recruit.feedbackTotal}</span> feedback
          </span>
          <span>
            <span className="font-medium text-foreground">{recruit.noteTotal}</span> notes
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
