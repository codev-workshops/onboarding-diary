import { Card, CardContent, Grid, Typography, useTheme } from '@mui/material';
import type { DashboardSummary } from '../../api/dashboard';
import { FEEDBACK_TYPES, ISSUE_SEVERITIES } from '../../api/diaryTypes';
import { enumLabel } from '../../utils/labels';
import { DonutChart } from '../charts/DonutChart';

interface Props {
  issues: DashboardSummary['issues'];
  feedback: DashboardSummary['feedback'];
}

/** Donut charts of open issues by severity and feedback by type. */
export function BreakdownCard({ issues, feedback }: Props) {
  const { palette } = useTheme();
  const severityColors: Record<string, string> = {
    LOW: palette.grey[400],
    MEDIUM: palette.info.main,
    HIGH: palette.warning.main,
    CRITICAL: palette.error.main,
  };
  const feedbackColors: Record<string, string> = {
    POSITIVE: palette.success.main,
    SUGGESTION: palette.info.main,
    CONCERN: palette.warning.main,
  };
  return (
    <Card>
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" component="h2" gutterBottom>
              Open issues by severity
            </Typography>
            <DonutChart
              title="Open issues by severity"
              segments={ISSUE_SEVERITIES.map((severity) => ({
                key: severity,
                label: enumLabel(severity),
                value: issues.openBySeverity[severity] ?? 0,
                color: severityColors[severity],
              }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" component="h2" gutterBottom>
              Feedback by type
            </Typography>
            <DonutChart
              title="Feedback by type"
              segments={FEEDBACK_TYPES.map((type) => ({
                key: type,
                label: enumLabel(type),
                value: feedback.byType[type] ?? 0,
                color: feedbackColors[type],
              }))}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
