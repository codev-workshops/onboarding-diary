import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, Typography } from '@mui/material';

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: '#9E9E9E',
  IN_PROGRESS: '#2196F3',
  COMPLETED: '#4CAF50',
  BLOCKED: '#FF9800',
};

interface StatusBarChartProps {
  data: Record<string, number>;
}

export default function StatusBarChart({ data }: StatusBarChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
    fill: STATUS_COLORS[name] || '#9E9E9E',
  }));

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tasks by Status
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
