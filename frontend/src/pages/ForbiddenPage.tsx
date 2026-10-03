import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <Box textAlign="center" mt={8}>
      <Typography variant="h4" fontWeight={600}>
        Access denied
      </Typography>
      <Typography color="text.secondary" my={2}>
        You do not have permission to view this page.
      </Typography>
      <Button component={RouterLink} to="/dashboard" variant="contained">
        Back to dashboard
      </Button>
    </Box>
  );
}
