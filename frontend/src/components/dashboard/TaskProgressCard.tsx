import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import type { DashboardSummary } from '../../api/dashboard';
import { TASK_STATUSES } from '../../api/diaryTypes';
import { enumLabel } from '../../utils/labels';
import { WeeklyTrendChart } from '../charts/WeeklyTrendChart';
import { EnumChip } from '../diary/EnumChip';

interface Props {
  tasks: DashboardSummary['tasks'];
  trend: DashboardSummary['weeklyCompletedTrend'];
}

export function TaskProgressCard({ tasks, trend }: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Task completion
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
          <Box position="relative" display="inline-flex">
            <CircularProgress
              variant="determinate"
              value={100}
              size={120}
              thickness={5}
              sx={{ color: 'grey.200', position: 'absolute' }}
            />
            <CircularProgress
              variant="determinate"
              value={tasks.completionPct}
              size={120}
              thickness={5}
              aria-label="Task completion"
            />
            <Box
              position="absolute"
              sx={{ inset: 0 }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
            >
              <Typography variant="h5" fontWeight={600}>
                {Math.round(tasks.completionPct)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                complete
              </Typography>
            </Box>
          </Box>
          <Stack spacing={1} flexGrow={1} width="100%">
            {TASK_STATUSES.map((status) => (
              <Stack key={status} direction="row" justifyContent="space-between">
                <EnumChip value={status} />
                <Typography variant="body2" aria-label={`${enumLabel(status)} tasks`}>
                  {tasks.byStatus[status] ?? 0}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
        <Typography variant="subtitle2" mt={3} mb={1}>
          Completed per week
        </Typography>
        <WeeklyTrendChart trend={trend} />
      </CardContent>
    </Card>
  );
}
