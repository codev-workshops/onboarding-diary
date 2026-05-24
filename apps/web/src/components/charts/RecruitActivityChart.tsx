import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { RecruitActivityDto } from '@onboarding-diary/shared';
import { Card, CardContent } from '@/components/ui/Card';

interface Props {
  data: RecruitActivityDto;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecruitActivityChart({ data }: Props) {
  const chartData = data.daily.map((d) => ({
    ...d,
    date: formatDate(d.date),
    total: d.tasks + d.issues + d.notes + d.feedback,
  }));

  const mostActiveFormatted = data.summary.most_active_day
    ? formatDate(data.summary.most_active_day)
    : 'N/A';

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recruit Activity</h3>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>
              Total: <strong className="text-gray-900">{data.summary.total_entries}</strong>
            </span>
            <span>
              Peak: <strong className="text-gray-900">{mostActiveFormatted}</strong>
            </span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="tasks"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Tasks"
              />
              <Line
                type="monotone"
                dataKey="issues"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Issues"
              />
              <Line
                type="monotone"
                dataKey="notes"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Notes"
              />
              <Line
                type="monotone"
                dataKey="feedback"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Feedback"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
