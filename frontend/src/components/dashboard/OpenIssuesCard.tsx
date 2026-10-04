import {
  Card,
  CardContent,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { DashboardSummary } from '../../api/dashboard';
import { formatDate } from '../../utils/labels';
import { EnumChip } from '../diary/EnumChip';

interface Props {
  issues: DashboardSummary['issues'];
  topOpenIssues: DashboardSummary['topOpenIssues'];
  issuesLink: string;
}

export function OpenIssuesCard({ issues, topOpenIssues, issuesLink }: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="h6" component="h2">
            Open issues
          </Typography>
          <Link component={RouterLink} to={`${issuesLink}?status=OPEN,IN_PROGRESS`}>
            View all ({issues.open})
          </Link>
        </Stack>
        {topOpenIssues.length === 0 ? (
          <Typography color="text.secondary" mt={2}>
            No open issues. Nice!
          </Typography>
        ) : (
          <List dense disablePadding>
            {topOpenIssues.map((issue) => (
              <ListItem key={issue.id} disableGutters>
                <ListItemText
                  primary={issue.title}
                  secondary={`${formatDate(issue.entryDate)} · ${issue.status === 'OPEN' ? 'Open' : 'In progress'}`}
                />
                <EnumChip value={issue.severity} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
