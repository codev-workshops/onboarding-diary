import { Card, CardContent, Chip, Divider, Grid, List, ListItem, ListItemText, Typography } from '@mui/material';
import { getErrorMessage } from '../../shared/api/api-client';
import { formatDate, humanize } from '../../shared/lib/format';
import { PageHeader } from '../../shared/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';
import { useAuth } from '../auth/auth-context';
import { useRecruitContext } from '../recruits/recruit-context';
import { AdminDashboard } from './admin-dashboard';
import { useDashboardSummary } from './api';
import { SummaryCard } from './dashboard-widgets';
import { JourneyTimeline } from './journey-timeline';
import { ManagerDashboard } from './manager-dashboard';
import { OnboardingChecklist } from './onboarding-checklist';

function RecruitDashboard({ recruitId }: { recruitId: number | null }) {
  const summary = useDashboardSummary(recruitId);

  if (summary.isPending) {
    return <LoadingState />;
  }

  if (summary.isError) {
    return <ErrorState message={getErrorMessage(summary.error)} onRetry={() => summary.refetch()} />;
  }

  const data = summary.data;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Onboarding overview for ${data.recruitName}`} />

      <JourneyTimeline journey={data.journey} />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Tasks"
            value={data.taskCounts.total}
            caption={`${data.taskCounts.completed} completed, ${data.taskCounts.blocked} blocked`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Open issues"
            value={data.issueCounts.open}
            caption={`${data.issueCounts.total} logged in total`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Feedback"
            value={data.feedbackCounts.total}
            caption={`${data.feedbackCounts.concern} concerns raised`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard title="Notes" value={data.notesCount} />
        </Grid>
      </Grid>

      <OnboardingChecklist checklist={data.checklist} />

      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle1">Recent activity</Typography>
          <Divider sx={{ my: 1 }} />
          {data.recentActivity.length === 0 ? (
            <EmptyState title="Nothing logged yet" description="Entries you add will show up here." />
          ) : (
            <List dense>
              {data.recentActivity.map((activity) => (
                <ListItem key={`${activity.type}-${activity.id}`} disableGutters>
                  <ListItemText
                    primary={activity.title}
                    secondary={`${formatDate(activity.date)}${activity.status ? ` · ${humanize(activity.status)}` : ''}`}
                  />
                  <Chip size="small" label={activity.type} />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function DashboardPage() {
  const { recruitId } = useRecruitContext();
  const { user } = useAuth();

  if (recruitId === null && user?.role === 'Admin') {
    return <AdminDashboard />;
  }

  if (recruitId === null && user?.role === 'Manager') {
    return <ManagerDashboard />;
  }

  return <RecruitDashboard recruitId={recruitId} />;
}
