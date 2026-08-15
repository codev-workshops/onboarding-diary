import { Card, CardContent, Grid, Typography, useTheme } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts';
import { getErrorMessage } from '../../shared/api/api-client';
import { useChartColors } from '../../shared/lib/chart-colors';
import { PageHeader } from '../../shared/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';
import type { ManagerDashboard as ManagerDashboardData } from '../../shared/types';
import { useManagerDashboard } from './api';
import { ChartCard, SummaryCard } from './dashboard-widgets';

function ManagerCharts({ data }: { data: ManagerDashboardData }) {
  const theme = useTheme();
  const colors = useChartColors();

  const tooltipStyle = {
    backgroundColor: colors.tooltipBackground,
    border: `1px solid ${colors.tooltipBorder}`,
    color: theme.palette.text.primary,
  };

  const completion = data.recruits.map((recruit) => ({
    name: recruit.recruitName,
    Completion: recruit.taskCompletionPercent,
  }));

  const severity = [
    { name: 'Low', value: data.openIssuesBySeverity.low, fill: colors.severity.low },
    { name: 'Medium', value: data.openIssuesBySeverity.medium, fill: colors.severity.medium },
    { name: 'High', value: data.openIssuesBySeverity.high, fill: colors.severity.high },
    { name: 'Critical', value: data.openIssuesBySeverity.critical, fill: colors.severity.critical },
  ];

  const feedback = [
    { name: 'Positive', value: data.feedbackCounts.positive, fill: colors.feedback.positive },
    { name: 'Suggestion', value: data.feedbackCounts.suggestion, fill: colors.feedback.suggestion },
    { name: 'Concern', value: data.feedbackCounts.concern, fill: colors.feedback.concern },
  ];

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid size={{ xs: 12, md: 7 }}>
        <ChartCard title="Task completion by recruit" height={40 + data.recruits.length * 44}>
          <BarChart data={completion} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke={colors.grid} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" stroke={colors.axis} />
            <YAxis type="category" dataKey="name" width={130} stroke={colors.axis} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} />
            <Bar dataKey="Completion" fill={colors.series[0]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <ChartCard title="Open issues by severity" height={280}>
          <BarChart data={severity}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="name" stroke={colors.axis} />
            <YAxis allowDecimals={false} stroke={colors.axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" name="Open issues" radius={[4, 4, 0, 0]}>
              {severity.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <ChartCard title="Feedback breakdown" height={280}>
          <PieChart>
            <Pie data={feedback} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
              {feedback.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ color: colors.axis }} />
          </PieChart>
        </ChartCard>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle1">Recruits</Typography>
            {data.recruits.map((recruit) => (
              <Typography key={recruit.recruitId} variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {`${recruit.recruitName}${recruit.department ? ` · ${recruit.department}` : ''} — ${recruit.taskCompleted}/${recruit.taskTotal} tasks, ${recruit.openIssues} open issues`}
              </Typography>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export function ManagerDashboard() {
  const query = useManagerDashboard(true);

  if (query.isPending) {
    return <LoadingState />;
  }

  if (query.isError) {
    return <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  }

  const data = query.data;

  return (
    <>
      <PageHeader title="Team dashboard" subtitle={`Progress across ${data.recruitCount} recruit(s) you oversee`} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard title="Recruits" value={data.recruitCount} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard title="Tasks" value={data.totals.tasks} caption={`${data.totals.completedTasks} completed`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard title="Open issues" value={data.totals.openIssues} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Feedback"
            value={data.feedbackCounts.total}
            caption={`${data.feedbackCounts.concern} concerns raised`}
          />
        </Grid>
      </Grid>

      {data.recruitCount === 0 ? (
        <EmptyState
          title="No recruits assigned yet"
          description="Once recruits report to you, their onboarding progress appears here."
        />
      ) : (
        <ManagerCharts data={data} />
      )}
    </>
  );
}
