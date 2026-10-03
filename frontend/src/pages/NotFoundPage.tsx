import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Box textAlign="center" mt={8}>
      <Typography variant="h4" fontWeight={600}>
        Page not found
      </Typography>
      <Typography color="text.secondary" my={2}>
        The page you are looking for does not exist.
      </Typography>
      <Button component={RouterLink} to="/dashboard" variant="contained">
        Back to dashboard
      </Button>
    </Box>
  );
}
