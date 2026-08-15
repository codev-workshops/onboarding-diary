import {
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '../../shared/api/api-client';
import { formatDate, humanize } from '../../shared/lib/format';
import { PageHeader } from '../../shared/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';
import { useRecruitContext } from '../recruits/recruit-context';
import { useDashboardSummary } from './api';

function SummaryCard({ title, value, caption }: { title: string; value: number | string; caption?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        {caption ? (
          <Typography variant="body2" color="text.secondary">
            {caption}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { recruitId } = useRecruitContext();
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

      <Grid container spacing={2}>
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

      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle1">Task completion</Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 1, alignItems: 'center' }}>
            <LinearProgress
              variant="determinate"
              value={data.taskCompletionPercent}
              sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
            />
            <Typography variant="body2">{data.taskCompletionPercent}%</Typography>
          </Stack>
        </CardContent>
      </Card>

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
