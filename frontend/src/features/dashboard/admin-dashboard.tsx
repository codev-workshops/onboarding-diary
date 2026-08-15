import { Grid, useTheme } from '@mui/material';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { getErrorMessage } from '../../shared/api/api-client';
import { useChartColors } from '../../shared/lib/chart-colors';
import { formatDate } from '../../shared/lib/format';
import { PageHeader } from '../../shared/ui/page-header';
import { ErrorState, LoadingState } from '../../shared/ui/states';
import { useAdminDashboard } from './api';
import { ChartCard, SummaryCard } from './dashboard-widgets';

export function AdminDashboard() {
  const theme = useTheme();
  const colors = useChartColors();
  const query = useAdminDashboard(true);

  if (query.isPending) {
    return <LoadingState />;
  }

  if (query.isError) {
    return <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  }

  const data = query.data;
  const tooltipStyle = {
    backgroundColor: colors.tooltipBackground,
    border: `1px solid ${colors.tooltipBorder}`,
    color: theme.palette.text.primary,
  };

  const activity = data.activityByWeek.map((week) => ({
    week: formatDate(week.weekStartDate),
    Tasks: week.tasks,
    Issues: week.issues,
    Feedback: week.feedback,
    Notes: week.notes,
  }));

  return (
    <>
      <PageHeader title="Organisation dashboard" subtitle={`Activity across ${data.userCount} users`} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard title="Users" value={data.userCount} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard title="Tasks" value={data.totals.tasks} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard title="Issues" value={data.totals.issues} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard title="Feedback" value={data.totals.feedback} caption={`${data.totals.notes} notes`} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={12}>
          <ChartCard title="Org-wide activity (last 8 weeks)" height={300}>
            <AreaChart data={activity}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="week" stroke={colors.axis} />
              <YAxis allowDecimals={false} stroke={colors.axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: colors.axis }} />
              {(['Tasks', 'Issues', 'Feedback', 'Notes'] as const).map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="activity"
                  stroke={colors.series[index]}
                  fill={colors.series[index]}
                  fillOpacity={0.35}
                />
              ))}
            </AreaChart>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <ChartCard title="Users by role" height={280}>
            <BarChart data={data.usersByRole}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="label" stroke={colors.axis} />
              <YAxis allowDecimals={false} stroke={colors.axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]}>
                {data.usersByRole.map((entry, index) => (
                  <Cell key={entry.label} fill={colors.series[index % colors.series.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <ChartCard title="Users by department" height={280}>
            <BarChart data={data.usersByDepartment} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke={colors.grid} horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke={colors.axis} />
              <YAxis type="category" dataKey="label" width={130} stroke={colors.axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Users" fill={colors.series[3]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartCard>
        </Grid>
      </Grid>
    </>
  );
}
