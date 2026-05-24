import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { IssueTrendsDto } from '@onboarding-diary/shared';
import { Card, CardContent } from '@/components/ui/Card';

interface Props {
  data: IssueTrendsDto;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function IssueTrendsChart({ data }: Props) {
  const chartData = data.daily.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  const avgText =
    data.summary.avg_resolution_time_hours !== null
      ? `${data.summary.avg_resolution_time_hours}h`
      : 'N/A';

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Issue Trends</h3>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>
              Open: <strong className="text-gray-900">{data.summary.open}</strong>
            </span>
            <span>
              Avg resolution: <strong className="text-gray-900">{avgText}</strong>
            </span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="open" stackId="a" fill="#fbbf24" name="Open" />
              <Bar dataKey="in_progress" stackId="a" fill="#60a5fa" name="In Progress" />
              <Bar dataKey="resolved" stackId="a" fill="#34d399" name="Resolved" />
              <Bar dataKey="closed" stackId="a" fill="#9ca3af" name="Closed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
