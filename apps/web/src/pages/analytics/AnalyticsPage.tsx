import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { TaskCompletionChart } from '@/components/charts/TaskCompletionChart';
import { IssueTrendsChart } from '@/components/charts/IssueTrendsChart';
import { FeedbackSentimentChart } from '@/components/charts/FeedbackSentimentChart';
import { RecruitActivityChart } from '@/components/charts/RecruitActivityChart';
import { StatCard } from '@/components/ui/Card';
import { analyticsApi } from '@/api/analytics.api';
import type { AnalyticsParams } from '@onboarding-diary/shared';

const RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AnalyticsPage() {
  const [rangeDays, setRangeDays] = useState(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const params: AnalyticsParams = useCustom && customFrom && customTo
    ? { from_date: customFrom, to_date: customTo }
    : (() => {
        const to = new Date();
        const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000);
        return { from_date: toDateStr(from), to_date: toDateStr(to) };
      })();

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'overview', params],
    queryFn: () => analyticsApi.getOverview(params),
  });

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="mt-1 text-gray-600">Track trends and activity across your onboarding.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => {
                    setRangeDays(opt.days);
                    setUseCustom(false);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    !useCustom && rangeDays === opt.days
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => {
                    setCustomFrom(e.target.value);
                    setUseCustom(true);
                  }}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => {
                    setCustomTo(e.target.value);
                    setUseCustom(true);
                  }}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {isLoading && <PageLoading />}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">Failed to load analytics data.</p>
            </div>
          )}

          {data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total Tasks"
                  value={data.task_trends.summary.total}
                  subtext={`${data.task_trends.summary.completion_rate}% completed`}
                />
                <StatCard
                  label="Open Issues"
                  value={data.issue_trends.summary.open}
                  subtext={`${data.issue_trends.summary.total} total`}
                />
                <StatCard
                  label="Feedback"
                  value={data.feedback_sentiment.total}
                  subtext={
                    data.feedback_sentiment.avg_rating !== null
                      ? `Avg rating: ${data.feedback_sentiment.avg_rating}`
                      : 'No ratings yet'
                  }
                />
                <StatCard
                  label="Activity"
                  value={data.recruit_activity.summary.total_entries}
                  subtext={`Avg ${data.recruit_activity.summary.avg_daily_entries}/day`}
                />
              </div>

              <TaskCompletionChart data={data.task_trends} />
              <IssueTrendsChart data={data.issue_trends} />
              <FeedbackSentimentChart data={data.feedback_sentiment} />
              <RecruitActivityChart data={data.recruit_activity} />
            </>
          )}
        </div>
      </ErrorBoundary>
    </PageLayout>
  );
}
