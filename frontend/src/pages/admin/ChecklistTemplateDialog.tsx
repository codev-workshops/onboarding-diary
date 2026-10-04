import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createTemplate, updateTemplate, type ChecklistTemplate } from '../../api/checklists';
import { getErrorMessage } from '../../api/errors';
import { EMPTY_ITEM, toTemplateRequest, type DraftItem } from './checklistDraft';

interface Props {
  template: ChecklistTemplate | null;
  onClose: () => void;
}

export function ChecklistTemplateDialog({ template, onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [items, setItems] = useState<DraftItem[]>(
    template?.items.map((item) => ({
      title: item.title,
      description: item.description ?? '',
      dueDayOffset: item.dueDayOffset === null ? '' : String(item.dueDayOffset),
    })) ?? [{ ...EMPTY_ITEM }],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const save = async () => {
    const request = toTemplateRequest(name, description, items);
    if (typeof request === 'string') {
      setError(request);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (template) {
        await updateTemplate(template.id, { ...request, version: template.version });
      } else {
        await createTemplate(request);
      }
      await queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the checklist'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{template ? 'Edit checklist template' : 'New checklist template'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {template && template.assignedCount > 0 && (
            <Alert severity="info">
              Changes apply to future assignments only. Recruits who already have this checklist
              keep their current items.
            </Alert>
          )}
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputProps={{ maxLength: 120 }}
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            inputProps={{ maxLength: 1000 }}
            multiline
          />
          <Typography variant="subtitle2">Items</Typography>
          {items.map((item, index) => (
            <Stack key={index} direction={{ xs: 'column', sm: 'row' }} gap={1}>
              <TextField
                label={`Item ${index + 1}`}
                value={item.title}
                onChange={(e) => updateItem(index, { title: e.target.value })}
                inputProps={{ maxLength: 200 }}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Details"
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                inputProps={{ maxLength: 1000 }}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Due (days after start)"
                value={item.dueDayOffset}
                onChange={(e) => updateItem(index, { dueDayOffset: e.target.value })}
                inputProps={{ inputMode: 'numeric' }}
                sx={{ flex: 1 }}
              />
              <IconButton
                aria-label={`Remove item ${index + 1}`}
                onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                disabled={items.length === 1}
              >
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM }])}
            disabled={items.length >= 50}
            sx={{ alignSelf: 'flex-start' }}
          >
            Add item
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
