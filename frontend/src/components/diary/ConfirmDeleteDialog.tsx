import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface Props {
  open: boolean;
  itemLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({ open, itemLabel, busy, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Delete entry?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          &ldquo;{itemLabel}&rdquo; will be permanently deleted. This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={busy}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
