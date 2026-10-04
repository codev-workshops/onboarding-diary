import { Alert, Box, Card, CardContent, Grid, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import FeedbackIcon from '@mui/icons-material/Feedback';
import NotesIcon from '@mui/icons-material/StickyNote2';
import type { ReactElement } from 'react';
import { useAuth } from '../auth/useAuth';
import { onboardingDay } from '../utils/dates';

interface PlaceholderStat {
  label: string;
  icon: ReactElement;
}

const STATS: PlaceholderStat[] = [
  { label: 'Tasks', icon: <AssignmentIcon color="primary" /> },
  { label: 'Open issues', icon: <ReportProblemIcon color="warning" /> },
  { label: 'Feedback', icon: <FeedbackIcon color="secondary" /> },
  { label: 'Notes', icon: <NotesIcon color="action" /> },
];

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  const day = onboardingDay(user.profile.startDate);

  return (
    <Box>
      <Typography variant="h5" component="h1" fontWeight={600}>
        Welcome, {user.profile.fullName.split(' ')[0]}
      </Typography>
      <Typography color="text.secondary" mb={3}>
        {day > 0
          ? `Day ${day} of onboarding`
          : `Your onboarding starts in ${1 - day} day${day === 0 ? '' : 's'}`}
      </Typography>
      <Grid container spacing={2}>
        {STATS.map((stat) => (
          <Grid item xs={6} md={3} key={stat.label}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  {stat.icon}
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={600} mt={1}>
                  0
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Alert severity="info" sx={{ mt: 3 }}>
        Summary counts and recent activity arrive in the next release. Until then, use the Tasks,
        Issues, Feedback and Notes pages in the menu to keep your diary.
      </Alert>
    </Box>
  );
}
