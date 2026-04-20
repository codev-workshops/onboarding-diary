import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 3,
      }}
    >
      <Typography variant="h1" fontWeight={700} color="primary" sx={{ fontSize: '8rem' }}>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </Box>
  );
}
