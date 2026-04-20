import { Box, CircularProgress } from '@mui/material';

export default function LoadingSpinner() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
      <CircularProgress />
    </Box>
  );
}
