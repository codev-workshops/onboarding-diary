import { Card, CardContent, Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface SummaryCardProps {
  icon: ReactNode;
  value: number;
  label: string;
  gradient: string;
}

export default function SummaryCard({ icon, value, label, gradient }: SummaryCardProps) {
  return (
    <Card
      sx={{
        background: gradient,
        color: '#fff',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h3" fontWeight={700}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {label}
            </Typography>
          </Box>
          <Box sx={{ opacity: 0.7, fontSize: 48 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}
