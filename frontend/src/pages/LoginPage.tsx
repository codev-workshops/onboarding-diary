import { Box, Card, CardContent, Typography } from '@mui/material';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #3F51B5 0%, #009688 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #3F51B5, #009688)',
            py: 3,
            px: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" fontWeight={700} color="#fff">
            Onboarding Diary
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
            Welcome back! Sign in to continue.
          </Typography>
        </Box>
        <CardContent sx={{ p: 4 }}>
          <LoginForm />
        </CardContent>
      </Card>
    </Box>
  );
}
