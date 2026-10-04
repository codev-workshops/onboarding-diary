import {
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FeedbackIcon from '@mui/icons-material/Feedback';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import NotesIcon from '@mui/icons-material/StickyNote2';
import type { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { RecentEntry, RecentEntryType } from '../../api/dashboard';
import { enumLabel, formatDate } from '../../utils/labels';

const TYPES: Record<RecentEntryType, { icon: ReactElement; label: string; path: string }> = {
  TASK: { icon: <AssignmentIcon color="primary" />, label: 'Task', path: 'tasks' },
  ISSUE: { icon: <ReportProblemIcon color="warning" />, label: 'Issue', path: 'issues' },
  FEEDBACK: { icon: <FeedbackIcon color="secondary" />, label: 'Feedback', path: 'feedback' },
  NOTE: { icon: <NotesIcon color="action" />, label: 'Note', path: 'notes' },
};

interface Props {
  entries: RecentEntry[];
  /** Prefix of the log pages, e.g. "" for the user's own logs or "/team/7". */
  linkBase: string;
}

export function RecentActivityCard({ entries, linkBase }: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="h2">
          Recent activity
        </Typography>
        {entries.length === 0 ? (
          <Typography color="text.secondary" mt={2}>
            Nothing logged yet.
          </Typography>
        ) : (
          <List dense disablePadding aria-label="Recent activity">
            {entries.map((entry) => {
              const type = TYPES[entry.type];
              return (
                <ListItemButton
                  key={`${entry.type}-${entry.id}`}
                  component={RouterLink}
                  to={`${linkBase}/${type.path}`}
                  disableGutters
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{type.icon}</ListItemIcon>
                  <ListItemText
                    primary={entry.title}
                    secondary={[
                      type.label,
                      formatDate(entry.entryDate),
                      entry.status && enumLabel(entry.status),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
