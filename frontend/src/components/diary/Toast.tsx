import { Snackbar } from '@mui/material';

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  return (
    <Snackbar
      open={!!message}
      autoHideDuration={3000}
      onClose={onClose}
      message={message}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
  );
}
