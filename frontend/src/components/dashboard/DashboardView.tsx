import { Alert, Box, CircularProgress, Grid } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FeedbackIcon from '@mui/icons-material/Feedback';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import NotesIcon from '@mui/icons-material/StickyNote2';
import { useQuery } from '@tanstack/react-query';
import {
  fetchDashboardSummary,
  fetchRecentEntries,
  type DashboardSource,
} from '../../api/dashboard';
import { getErrorMessage } from '../../api/errors';
import { BreakdownCard } from './BreakdownCard';
import { OpenIssuesCard } from './OpenIssuesCard';
import { RecentActivityCard } from './RecentActivityCard';
import { StatCard } from './StatCard';
import { TaskProgressCard } from './TaskProgressCard';

interface Props {
  source: DashboardSource;
  /** Identifies whose dashboard this is, for caching. */
  cacheKey: (string | number)[];
  /** Prefix of the log pages the cards link to: "" for own logs, "/team/7" for a recruit. */
  linkBase: string;
  notesLabel?: string;
}

/** Stat cards, task progress, open issues and recent activity for one diary. */
export function DashboardView({ source, cacheKey, linkBase, notesLabel = 'Notes' }: Props) {
  const summary = useQuery({
    queryKey: ['dashboard', ...cacheKey, 'summary'],
    queryFn: () => fetchDashboardSummary(source),
  });
  const recent = useQuery({
    queryKey: ['dashboard', ...cacheKey, 'recent'],
    queryFn: () => fetchRecentEntries(source, 5),
  });

  if (summary.isLoading || recent.isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }
  if (summary.error || recent.error || !summary.data || !recent.data) {
    return (
      <Alert severity="error">
        {getErrorMessage(summary.error ?? recent.error, 'Could not load the dashboard')}
      </Alert>
    );
  }

  const data = summary.data;
  const completed = data.tasks.byStatus.COMPLETED ?? 0;
  const highOpen =
    (data.issues.openBySeverity.HIGH ?? 0) + (data.issues.openBySeverity.CRITICAL ?? 0);
  return (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <StatCard
          label="Tasks"
          value={data.tasks.total}
          caption={`${completed} completed`}
          icon={<AssignmentIcon color="primary" />}
          to={`${linkBase}/tasks`}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <StatCard
          label="Open issues"
          value={data.issues.open}
          caption={highOpen > 0 ? `${highOpen} high or critical` : 'None urgent'}
          icon={<ReportProblemIcon color="warning" />}
          to={`${linkBase}/issues?status=OPEN,IN_PROGRESS`}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <StatCard
          label="Feedback"
          value={data.feedback.total}
          caption={`${data.feedback.byType.POSITIVE ?? 0} positive`}
          icon={<FeedbackIcon color="secondary" />}
          to={`${linkBase}/feedback`}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <StatCard
          label={notesLabel}
          value={data.notes.total}
          icon={<NotesIcon color="action" />}
          to={`${linkBase}/notes`}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TaskProgressCard tasks={data.tasks} trend={data.weeklyCompletedTrend} />
      </Grid>
      <Grid item xs={12} md={6}>
        <OpenIssuesCard
          issues={data.issues}
          topOpenIssues={data.topOpenIssues}
          issuesLink={`${linkBase}/issues`}
        />
      </Grid>
      <Grid item xs={12}>
        <BreakdownCard issues={data.issues} feedback={data.feedback} />
      </Grid>
      <Grid item xs={12}>
        <RecentActivityCard entries={recent.data} linkBase={linkBase} />
      </Grid>
    </Grid>
  );
}
