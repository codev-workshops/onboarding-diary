import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type { WeeklyCount } from '../../api/dashboard';
import { formatDate } from '../../utils/labels';

/** Column chart of tasks completed per week. */
export function WeeklyTrendChart({
  trend,
  height = 80,
}: {
  trend: WeeklyCount[];
  height?: number;
}) {
  if (trend.length === 0) {
    return <Typography color="text.secondary">No data yet.</Typography>;
  }
  const maxWeek = Math.max(1, ...trend.map((week) => week.completed));
  return (
    <Stack direction="row" spacing={0.75} alignItems="flex-end" height={height}>
      {trend.map((week) => (
        <Tooltip
          key={week.weekStart}
          title={`Week of ${formatDate(week.weekStart)}: ${week.completed} completed`}
        >
          <Box
            flex={1}
            minHeight={4}
            height={`${(week.completed / maxWeek) * 100}%`}
            bgcolor={week.completed > 0 ? 'primary.main' : 'grey.300'}
            borderRadius={0.5}
            data-testid="trend-bar"
          />
        </Tooltip>
      ))}
    </Stack>
  );
}
