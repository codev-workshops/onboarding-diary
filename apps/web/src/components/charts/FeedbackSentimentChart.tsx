import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { FeedbackSentimentDto } from '@onboarding-diary/shared';
import { Card, CardContent } from '@/components/ui/Card';

interface Props {
  data: FeedbackSentimentDto;
}

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: '#22c55e',
  NEUTRAL: '#3b82f6',
  CONSTRUCTIVE: '#f59e0b',
};

const SENTIMENT_LABELS: Record<string, string> = {
  POSITIVE: 'Positive',
  NEUTRAL: 'Neutral',
  CONSTRUCTIVE: 'Constructive',
};

export function FeedbackSentimentChart({ data }: Props) {
  const pieData = data.breakdown.map((b) => ({
    name: SENTIMENT_LABELS[b.type] ?? b.type,
    value: b.count,
    color: SENTIMENT_COLORS[b.type] ?? '#9ca3af',
  }));

  const ratingData = data.rating_distribution.map((r) => ({
    rating: `${r.rating} star${r.rating !== 1 ? 's' : ''}`,
    count: r.count,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Feedback Sentiment</h3>
            <span className="text-sm text-gray-500">
              Total: <strong className="text-gray-900">{data.total}</strong>
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={(props: { name?: string; percent?: number }) =>
                    `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Rating Distribution</h3>
            <span className="text-sm text-gray-500">
              Avg:{' '}
              <strong className="text-gray-900">
                {data.avg_rating !== null ? data.avg_rating : 'N/A'}
              </strong>
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="rating" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
