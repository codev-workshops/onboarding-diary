import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, Typography } from '@mui/material';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#2196F3',
  MEDIUM: '#FFC107',
  HIGH: '#FF9800',
  CRITICAL: '#F44336',
};

interface SeverityChartProps {
  data: Record<string, number>;
}

export default function SeverityChart({ data }: SeverityChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
    fill: SEVERITY_COLORS[name] || '#9E9E9E',
  }));

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Issues by Severity
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
