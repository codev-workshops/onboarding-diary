import { Box, Card, CardContent, Chip, Stack, Typography, useTheme } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartColors } from '../../shared/lib/chart-colors';
import { formatDate, humanize } from '../../shared/lib/format';
import { EmptyState } from '../../shared/ui/states';
import type { DashboardSummary, JourneyStageStatus } from '../../shared/types';

function statusColor(status: JourneyStageStatus, colors: ReturnType<typeof useChartColors>): string {
  switch (status) {
    case 'Completed':
      return colors.status.completed;
    case 'Blocked':
      return colors.status.blocked;
    case 'InProgress':
      return colors.status.inProgress;
    default:
      return colors.status.pending;
  }
}

export function JourneyTimeline({ journey }: { journey: DashboardSummary['journey'] }) {
  const theme = useTheme();
  const colors = useChartColors();

  const chartData = journey.stages.map((stage) => ({
    label: stage.label,
    Completed: stage.completed,
    'In progress': stage.inProgress,
    Blocked: stage.blocked,
    'Not started': stage.notStarted,
  }));

  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="subtitle1">Candidate journey</Typography>
        <Typography variant="body2" color="text.secondary">
          {`Day ${journey.daysSinceStart} since ${formatDate(journey.startDate)}`}
        </Typography>

        {journey.stages.length === 0 ? (
          <EmptyState
            title="The journey starts with your first task"
            description="Log a task and the stages of your onboarding will appear here."
          />
        ) : (
          <>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={0}
              sx={{ mt: 3, alignItems: { xs: 'flex-start', md: 'stretch' } }}
            >
              {journey.stages.map((stage, index) => (
                <Stack
                  key={stage.key}
                  direction={{ xs: 'row', md: 'column' }}
                  spacing={1}
                  sx={{ flex: 1, alignItems: 'center', minWidth: 0 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        flex: 1,
                        height: 2,
                        bgcolor: index === 0 ? 'transparent' : 'divider',
                      }}
                    />
                    <Box
                      aria-hidden
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        flexShrink: 0,
                        bgcolor: statusColor(stage.status, colors),
                        border: `3px solid ${theme.palette.background.paper}`,
                        boxShadow: `0 0 0 2px ${statusColor(stage.status, colors)}`,
                      }}
                    />
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        flex: 1,
                        height: 2,
                        bgcolor: index === journey.stages.length - 1 ? 'transparent' : 'divider',
                      }}
                    />
                  </Box>
                  <Stack spacing={0.5} sx={{ alignItems: { xs: 'flex-start', md: 'center' }, textAlign: 'center' }}>
                    <Typography variant="subtitle2">{stage.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {`Day ${stage.dayOffset} · ${stage.completionPercent}% complete`}
                    </Typography>
                    <Chip
                      size="small"
                      label={humanize(stage.status)}
                      sx={{
                        bgcolor: statusColor(stage.status, colors),
                        color: theme.palette.getContrastText(statusColor(stage.status, colors)),
                      }}
                    />
                  </Stack>
                </Stack>
              ))}
            </Stack>

            <Box sx={{ height: 60 + journey.stages.length * 40, mt: 3 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid stroke={colors.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} stroke={colors.axis} />
                  <YAxis type="category" dataKey="label" width={110} stroke={colors.axis} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBackground,
                      border: `1px solid ${colors.tooltipBorder}`,
                      color: theme.palette.text.primary,
                    }}
                  />
                  <Legend wrapperStyle={{ color: colors.axis }} />
                  <Bar dataKey="Completed" stackId="stage" fill={colors.status.completed} />
                  <Bar dataKey="In progress" stackId="stage" fill={colors.status.inProgress} />
                  <Bar dataKey="Blocked" stackId="stage" fill={colors.status.blocked} />
                  <Bar dataKey="Not started" stackId="stage" fill={colors.status.pending} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
