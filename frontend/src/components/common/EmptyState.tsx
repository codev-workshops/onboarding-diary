import { Box, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({ message = 'No data found' }: EmptyStateProps) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} sx={{ opacity: 0.6 }}>
      <InboxIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary' }} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
