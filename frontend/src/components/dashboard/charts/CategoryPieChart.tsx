import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, Typography } from '@mui/material';

const COLORS = ['#3F51B5', '#009688', '#FF9800', '#F44336', '#9C27B0', '#2196F3', '#4CAF50'];

interface CategoryPieChartProps {
  data: Record<string, number>;
}

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tasks by Category
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
