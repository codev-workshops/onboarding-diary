import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { getErrorMessage } from '../../api/errors';
import { fetchTeam } from '../../api/manager';
import { useAuth } from '../../auth/useAuth';
import { StatCard } from '../../components/dashboard/StatCard';
import { EnumChip } from '../../components/diary/EnumChip';
import { formatDate, formatDateTime } from '../../utils/labels';
import { RecruitStatusChip } from './RecruitStatusChip';

const HIDE_ON_PHONE = { display: { xs: 'none', md: 'table-cell' } };

export function TeamPage() {
  const { hasRole } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ['team'], queryFn: fetchTeam });
  const title = hasRole('ADMIN') ? 'All recruits' : 'My team';

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }
  if (error || !data) {
    return <Alert severity="error">{getErrorMessage(error, 'Could not load the team')}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h5" component="h1" fontWeight={600} mb={2}>
        {title}
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}>
          <StatCard
            label="Recruits"
            value={data.recruitCount}
            icon={<GroupsIcon color="primary" />}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label="Avg. completion"
            value={`${Math.round(data.averageCompletionPct)}%`}
            icon={<TrendingUpIcon color="success" />}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label="Open issues"
            value={data.openIssues}
            icon={<ReportProblemIcon color="warning" />}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label="At risk"
            value={data.atRiskCount}
            caption="Urgent issues or 5 working days idle"
            icon={<WarningIcon color="error" />}
          />
        </Grid>
      </Grid>

      {data.recruits.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No recruits are assigned to you yet. An admin can assign them.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small" aria-label="Recruits">
            <TableHead>
              <TableRow>
                <TableCell>Recruit</TableCell>
                <TableCell sx={HIDE_ON_PHONE}>Start date</TableCell>
                <TableCell width={180}>Completion</TableCell>
                <TableCell align="right">Open issues</TableCell>
                <TableCell sx={HIDE_ON_PHONE}>Last activity</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recruits.map((recruit) => (
                <TableRow key={recruit.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/team/${recruit.id}`} fontWeight={500}>
                      {recruit.fullName}
                    </Link>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {recruit.department}
                    </Typography>
                  </TableCell>
                  <TableCell sx={HIDE_ON_PHONE}>{formatDate(recruit.startDate)}</TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <LinearProgress
                        variant="determinate"
                        value={recruit.completionPct}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        aria-label={`${recruit.fullName} completion`}
                      />
                      <Typography variant="caption">
                        {Math.round(recruit.completionPct)}%
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{recruit.openIssues}</TableCell>
                  <TableCell sx={HIDE_ON_PHONE}>{formatDateTime(recruit.lastActivityAt)}</TableCell>
                  <TableCell>
                    <RecruitStatusChip recruit={recruit} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2">
            High and critical open issues
          </Typography>
          {data.highSeverityIssues.length === 0 ? (
            <Typography color="text.secondary" mt={1}>
              No urgent issues.
            </Typography>
          ) : (
            <List dense disablePadding>
              {data.highSeverityIssues.map(({ recruitId, recruitName, issue }) => (
                <ListItemButton
                  key={issue.id}
                  component={RouterLink}
                  to={`/team/${recruitId}/issues`}
                  disableGutters
                >
                  <ListItemText
                    primary={issue.title}
                    secondary={`${recruitName} · ${formatDate(issue.entryDate)}`}
                  />
                  <EnumChip value={issue.severity} />
                </ListItemButton>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
