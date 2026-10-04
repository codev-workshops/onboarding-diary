import { Box, Card, CardContent, Typography } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  maxWidth?: number;
  children: ReactNode;
}

/** Centred card used by the login, signup and change-password screens. */
export function AuthCard({ title, subtitle, maxWidth = 420, children }: AuthCardProps) {
  return (
    <Box
      component="main"
      minHeight="100vh"
      display="flex"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="center"
      p={{ xs: 0, sm: 2 }}
    >
      <Card
        sx={{ width: '100%', maxWidth: { sm: maxWidth }, borderRadius: { xs: 0, sm: 3 } }}
        elevation={3}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box display="flex" alignItems="center" gap={1} mb={2} color="primary.main">
            <MenuBookIcon />
            <Typography variant="subtitle1" fontWeight={700}>
              Onboarding Diary
            </Typography>
          </Box>
          <Typography variant="h5" component="h1" fontWeight={600}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {subtitle}
            </Typography>
          )}
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
