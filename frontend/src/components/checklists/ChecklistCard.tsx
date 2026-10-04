import {
  Card,
  CardContent,
  Checkbox,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import type { ChecklistAssignment, ChecklistItem } from '../../api/checklists';
import { formatDate, formatDateTime } from '../../utils/labels';

interface Props {
  checklist: ChecklistAssignment;
  /** Omit for a read-only view. */
  onToggle?: (item: ChecklistItem, completed: boolean) => void;
  pendingItemId?: number | null;
}

/** A checklist with its progress bar and items; items can be ticked when {@code onToggle} is set. */
export function ChecklistCard({ checklist, onToggle, pendingItemId }: Props) {
  const complete = checklist.totalItems > 0 && checklist.completedItems === checklist.totalItems;
  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
          gap={1}
          flexWrap="wrap"
        >
          <Typography variant="h6" component="h2">
            {checklist.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {checklist.completedItems} of {checklist.totalItems} done
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={checklist.completionPct}
          color={complete ? 'success' : 'primary'}
          aria-label={`${checklist.name} progress`}
          sx={{ my: 1, height: 8, borderRadius: 4 }}
        />
        <List dense disablePadding>
          {checklist.items.map((item) => {
            const done = item.completedAt !== null;
            const details = [
              item.description,
              item.dueDate && `Due ${formatDate(item.dueDate)}`,
              done && `Done ${formatDateTime(item.completedAt)}`,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <ListItem
                key={item.id}
                disableGutters
                secondaryAction={
                  item.overdue ? <Chip size="small" color="error" label="Overdue" /> : undefined
                }
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Checkbox
                    edge="start"
                    checked={done}
                    disabled={!onToggle || pendingItemId === item.id}
                    onChange={(e) => onToggle?.(item, e.target.checked)}
                    inputProps={{ 'aria-label': item.title }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    sx: done ? { textDecoration: 'line-through', color: 'text.secondary' } : {},
                  }}
                  secondary={details || undefined}
                />
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}
