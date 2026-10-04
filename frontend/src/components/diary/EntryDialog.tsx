import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { FormEventHandler, ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

/** Create/edit form dialog; full screen on phones. */
export function EntryDialog({
  open,
  title,
  error,
  submitting,
  onClose,
  onSubmit,
  children,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <form noValidate onSubmit={onSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error">{error}</Alert>}
          {children}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
