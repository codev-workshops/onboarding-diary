import { Box, Card, CardContent, Typography } from '@mui/material';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2E7D32 0%, #00897B 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #2E7D32, #00897B)',
            py: 3,
            px: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" fontWeight={700} color="#fff">
            Create Account
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
            Start your onboarding journey
          </Typography>
        </Box>
        <CardContent sx={{ p: 4 }}>
          <RegisterForm />
        </CardContent>
      </Card>
    </Box>
  );
}
