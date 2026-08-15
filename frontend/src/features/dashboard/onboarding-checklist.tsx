import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useChartColors } from '../../shared/lib/chart-colors';
import { formatDate, humanize } from '../../shared/lib/format';
import { EmptyState } from '../../shared/ui/states';
import type { Checklist, ChecklistItem } from '../../shared/types';

const groups: { state: ChecklistItem['state']; label: string }[] = [
  { state: 'InProgress', label: 'In progress' },
  { state: 'Pending', label: 'Pending' },
  { state: 'Completed', label: 'Completed' },
];

function ItemIcon({ item, colors }: { item: ChecklistItem; colors: ReturnType<typeof useChartColors> }) {
  if (item.isBlocked) {
    return <BlockIcon sx={{ color: colors.status.blocked }} />;
  }
  if (item.state === 'Completed') {
    return <CheckCircleIcon sx={{ color: colors.status.completed }} />;
  }
  if (item.state === 'InProgress') {
    return <TimelapseIcon sx={{ color: colors.status.inProgress }} />;
  }
  return <RadioButtonUncheckedIcon sx={{ color: colors.status.pending }} />;
}

export function OnboardingChecklist({ checklist }: { checklist: Checklist }) {
  const colors = useChartColors();

  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Typography variant="subtitle1">Onboarding checklist</Typography>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`${checklist.completed} completed`} sx={{ color: colors.status.completed }} />
            <Chip size="small" label={`${checklist.inProgress} in progress`} sx={{ color: colors.status.inProgress }} />
            <Chip size="small" label={`${checklist.pending} pending`} />
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: 'center' }}>
          <LinearProgress
            variant="determinate"
            value={checklist.progressPercent}
            aria-label="Overall checklist progress"
            sx={{ flexGrow: 1, height: 12, borderRadius: 6 }}
          />
          <Typography variant="body2">{`${checklist.progressPercent}%`}</Typography>
        </Stack>

        {checklist.total === 0 ? (
          <Box sx={{ mt: 2 }}>
            <EmptyState
              title="No checklist items yet"
              description="Tasks you log become checklist items grouped by their status."
            />
          </Box>
        ) : (
          groups.map((group) => {
            const items = checklist.items.filter((item) => item.state === group.state);
            if (items.length === 0) {
              return null;
            }
            return (
              <Box key={group.state} sx={{ mt: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {group.label}
                </Typography>
                <List dense disablePadding>
                  {items.map((item) => (
                    <ListItem key={item.id} disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ItemIcon item={item} colors={colors} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        secondary={`${humanize(item.category)} · ${formatDate(item.date)}`}
                        sx={item.state === 'Completed' ? { textDecoration: 'line-through' } : undefined}
                      />
                      {item.isBlocked ? <Chip size="small" color="error" label="Blocked" /> : null}
                    </ListItem>
                  ))}
                </List>
              </Box>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
