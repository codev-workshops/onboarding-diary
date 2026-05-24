import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { TaskCompletionTrendsDto } from '@onboarding-diary/shared';
import { Card, CardContent } from '@/components/ui/Card';

interface Props {
  data: TaskCompletionTrendsDto;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TaskCompletionChart({ data }: Props) {
  const chartData = data.daily.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Task Completion Trends</h3>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>
              Rate: <strong className="text-gray-900">{data.summary.completion_rate}%</strong>
            </span>
            <span>
              Avg/day: <strong className="text-gray-900">{data.summary.avg_daily_completed}</strong>
            </span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="completed"
                stackId="1"
                stroke="#22c55e"
                fill="#dcfce7"
                name="Completed"
              />
              <Area
                type="monotone"
                dataKey="in_progress"
                stackId="1"
                stroke="#3b82f6"
                fill="#dbeafe"
                name="In Progress"
              />
              <Area
                type="monotone"
                dataKey="pending"
                stackId="1"
                stroke="#f59e0b"
                fill="#fef3c7"
                name="Pending"
              />
              <Area
                type="monotone"
                dataKey="blocked"
                stackId="1"
                stroke="#ef4444"
                fill="#fee2e2"
                name="Blocked"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
