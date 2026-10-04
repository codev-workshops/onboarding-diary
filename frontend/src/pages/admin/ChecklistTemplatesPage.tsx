import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { deleteTemplate, listTemplates, type ChecklistTemplate } from '../../api/checklists';
import { getErrorMessage } from '../../api/errors';
import { AssignChecklistDialog } from './AssignChecklistDialog';
import { ChecklistTemplateDialog } from './ChecklistTemplateDialog';

export function ChecklistTemplatesPage() {
  const queryClient = useQueryClient();
  const templates = useQuery({ queryKey: ['checklist-templates'], queryFn: listTemplates });
  const [editing, setEditing] = useState<ChecklistTemplate | 'new' | null>(null);
  const [assigning, setAssigning] = useState<ChecklistTemplate | null>(null);
  const [deleting, setDeleting] = useState<ChecklistTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteTemplate(deleting.id);
      await queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      setDeleting(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the checklist'));
      setDeleting(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={1}>
        <Typography variant="h5" component="h1" fontWeight={600}>
          Checklist templates
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
          New template
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {templates.isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress aria-label="Loading" />
        </Box>
      ) : templates.error ? (
        <Alert severity="error">
          {getErrorMessage(templates.error, 'Could not load checklist templates')}
        </Alert>
      ) : !templates.data?.length ? (
        <Typography color="text.secondary">
          No templates yet. Create one, for example “Engineering week 1”, then assign it to
          recruits.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {templates.data.map((template) => (
            <Grid item xs={12} md={6} key={template.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2">
                    {template.name}
                  </Typography>
                  {template.description && (
                    <Typography color="text.secondary" mb={1}>
                      {template.description}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    {template.items.length} item(s) · assigned to {template.assignedCount}
                  </Typography>
                  <Box component="ol" sx={{ pl: 2.5, mb: 0 }}>
                    {template.items.slice(0, 5).map((item, index) => (
                      <li key={index}>
                        <Typography variant="body2">
                          {item.title}
                          {item.dueDayOffset !== null && ` (day ${item.dueDayOffset})`}
                        </Typography>
                      </li>
                    ))}
                  </Box>
                  {template.items.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      and {template.items.length - 5} more
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button onClick={() => setAssigning(template)}>Assign</Button>
                  <Button onClick={() => setEditing(template)}>Edit</Button>
                  <Button color="error" onClick={() => setDeleting(template)}>
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {editing && (
        <ChecklistTemplateDialog
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {assigning && (
        <AssignChecklistDialog template={assigning} onClose={() => setAssigning(null)} />
      )}
      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete “{deleting?.name}”?</DialogTitle>
        <DialogContent>
          <Typography>
            Recruits who already have this checklist keep it. It just can’t be assigned again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
