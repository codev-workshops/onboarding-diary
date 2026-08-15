import { useTheme } from '@mui/material';
import { useMemo } from 'react';

export interface ChartColors {
  axis: string;
  grid: string;
  tooltipBackground: string;
  tooltipBorder: string;
  series: string[];
  status: { completed: string; inProgress: string; blocked: string; pending: string };
  severity: { low: string; medium: string; high: string; critical: string };
  feedback: { positive: string; suggestion: string; concern: string };
}

/** Single source of chart colours so every visualisation follows the active theme. */
export function useChartColors(): ChartColors {
  const theme = useTheme();

  return useMemo(
    () => ({
      axis: theme.palette.text.secondary,
      grid: theme.palette.divider,
      tooltipBackground: theme.palette.background.paper,
      tooltipBorder: theme.palette.divider,
      series: [
        theme.palette.primary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.info.main,
        theme.palette.error.main,
        theme.palette.secondary.main,
      ],
      status: {
        completed: theme.palette.success.main,
        inProgress: theme.palette.info.main,
        blocked: theme.palette.error.main,
        pending: theme.palette.text.disabled,
      },
      severity: {
        low: theme.palette.success.main,
        medium: theme.palette.info.main,
        high: theme.palette.warning.main,
        critical: theme.palette.error.main,
      },
      feedback: {
        positive: theme.palette.success.main,
        suggestion: theme.palette.info.main,
        concern: theme.palette.warning.main,
      },
    }),
    [theme],
  );
}
