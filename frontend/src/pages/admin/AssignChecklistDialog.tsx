import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RemoveIcon from '@mui/icons-material/PersonRemove';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  assignTemplate,
  fetchTemplateAssignments,
  unassignChecklist,
  type ChecklistTemplate,
} from '../../api/checklists';
import { getErrorMessage } from '../../api/errors';
import { fetchRecruits, type RecruitSummary } from '../../api/manager';

interface Props {
  template: ChecklistTemplate;
  onClose: () => void;
}

export function AssignChecklistDialog({ template, onClose }: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<RecruitSummary[]>([]);
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const recruits = useQuery({ queryKey: ['manager-recruits'], queryFn: fetchRecruits });
  const assignmentsKey = ['checklist-assignments', template.id];
  const assignments = useQuery({
    queryKey: assignmentsKey,
    queryFn: () => fetchTemplateAssignments(template.id),
  });

  const assignedIds = new Set((assignments.data ?? []).map((a) => a.recruitId));
  const options = (recruits.data ?? []).filter((r) => !assignedIds.has(r.id));

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: assignmentsKey }),
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] }),
    ]);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      setMessage({ severity: 'success', text: await action() });
      await refresh();
    } catch (err) {
      setMessage({ severity: 'error', text: getErrorMessage(err, 'Something went wrong') });
    } finally {
      setBusy(false);
    }
  };

  const assign = () =>
    run(async () => {
      const result = await assignTemplate(
        template.id,
        selected.map((r) => r.id),
      );
      setSelected([]);
      return `Assigned to ${result.assigned.length} recruit(s)`;
    });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Assign “{template.name}”</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Autocomplete
            multiple
            options={options}
            value={selected}
            onChange={(_, value) => setSelected(value)}
            getOptionLabel={(r) => `${r.fullName} (${r.email})`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            loading={recruits.isLoading}
            renderInput={(params) => <TextField {...params} label="Recruits" />}
          />
          {message && <Alert severity={message.severity}>{message.text}</Alert>}
          <Typography variant="subtitle2">Assigned to ({assignments.data?.length ?? 0})</Typography>
          {assignments.data?.length ? (
            <List dense disablePadding>
              {assignments.data.map((assignment) => (
                <ListItem
                  key={assignment.id}
                  disableGutters
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label={`Unassign ${assignment.recruitName}`}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await unassignChecklist(assignment.id);
                          return `Removed from ${assignment.recruitName}`;
                        })
                      }
                    >
                      <RemoveIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={assignment.recruitName}
                    secondary={`${assignment.completedItems} of ${assignment.totalItems} done`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nobody yet.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={assign} disabled={busy || selected.length === 0}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}
