import { PageLayout } from '@/components/layout/PageLayout';
import { useAuth } from '@/context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.first_name}!</h1>
          <p className="mt-1 text-gray-600">Here&apos;s your onboarding overview.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Diary Entries</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Milestones Completed</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">0 / 0</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Average Mood</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">--</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Days Since Start</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
          <p className="mt-2 text-gray-600">
            This is your onboarding diary. Start by creating your first diary entry to document your
            onboarding journey. Your mentor will be able to see your entries and provide feedback.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
