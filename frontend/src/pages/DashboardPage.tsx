import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink } from 'react-router-dom';
import { OWN_DASHBOARD } from '../api/dashboard';
import { useAuth } from '../auth/useAuth';
import { DashboardView } from '../components/dashboard/DashboardView';
import { onboardingDay } from '../utils/dates';

const QUICK_ADD = [
  { label: 'Task', path: '/tasks' },
  { label: 'Issue', path: '/issues' },
  { label: 'Feedback', path: '/feedback' },
  { label: 'Note', path: '/notes' },
];

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  const day = onboardingDay(user.profile.startDate);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'flex-end' }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" component="h1" fontWeight={600}>
            Welcome, {user.profile.fullName.split(' ')[0]}
          </Typography>
          <Typography color="text.secondary">
            {day > 0
              ? `Day ${day} of onboarding`
              : `Your onboarding starts in ${1 - day} day${day === 0 ? '' : 's'}`}
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" aria-label="Quick add">
          {QUICK_ADD.map((item) => (
            <Button
              key={item.path}
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              component={RouterLink}
              to={`${item.path}?new=1`}
            >
              {item.label}
            </Button>
          ))}
        </Stack>
      </Stack>
      <DashboardView source={OWN_DASHBOARD} cacheKey={[user.id]} linkBase="" />
    </Box>
  );
}
