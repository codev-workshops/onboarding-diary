'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Table from '@/components/ui/Table';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserRole,
  DashboardSummaryDto,
  RecruitOverviewDto,
  SystemOverviewDto,
  RecentEntryDto,
  RecentActivityDto,
} from '@/types';
import {
  getRecruitDashboard,
  getManagerDashboard,
  getSystemDashboard,
} from '@/services/dashboardApi';
import { formatDate, formatDateTime } from '@/utils/formatters';

const typeBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  Task: 'info',
  Issue: 'danger',
  Feedback: 'warning',
  Note: 'default',
};

const typeRouteMap: Record<string, string> = {
  Task: '/tasks',
  Issue: '/issues',
  Feedback: '/feedback',
  Note: '/notes',
};

function RecruitDashboardView({ data }: { data: DashboardSummaryDto }) {
  const router = useRouter();

  const recentColumns = [
    {
      key: 'type',
      header: 'Type',
      render: (item: Record<string, unknown>) => {
        const entry = item as unknown as RecentEntryDto;
        return (
          <Badge variant={typeBadgeVariant[entry.type] || 'default'}>
            {entry.type}
          </Badge>
        );
      },
    },
    {
      key: 'title',
      header: 'Title',
      render: (item: Record<string, unknown>) => {
        const entry = item as unknown as RecentEntryDto;
        return (
          <button
            className="text-blue-600 hover:underline text-left"
            onClick={() => router.push(typeRouteMap[entry.type] || '/dashboard')}
          >
            {entry.title}
          </button>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (item: Record<string, unknown>) => formatDate((item as unknown as RecentEntryDto).date),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Record<string, unknown>) => {
        const entry = item as unknown as RecentEntryDto;
        return entry.status ? (
          <Badge variant="default">{entry.status}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">
          Day {data.onboardingDaysElapsed} of your onboarding journey (started {formatDate(data.startDate)})
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <button onClick={() => router.push('/tasks')} className="text-left">
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{data.totalTasks}</p>
              <p className="text-sm text-gray-500 mt-1">Total Tasks</p>
            </div>
          </Card>
        </button>
        <button onClick={() => router.push('/tasks')} className="text-left">
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{data.completedTasks}</p>
              <p className="text-sm text-gray-500 mt-1">Completed ({data.taskCompletionPercentage}%)</p>
            </div>
          </Card>
        </button>
        <button onClick={() => router.push('/issues')} className="text-left">
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{data.openIssues}</p>
              <p className="text-sm text-gray-500 mt-1">Open Issues</p>
            </div>
          </Card>
        </button>
        <button onClick={() => router.push('/feedback')} className="text-left">
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{data.totalFeedback}</p>
              <p className="text-sm text-gray-500 mt-1">Feedback</p>
            </div>
          </Card>
        </button>
        <button onClick={() => router.push('/notes')} className="text-left">
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">{data.totalNotes}</p>
              <p className="text-sm text-gray-500 mt-1">Notes</p>
            </div>
          </Card>
        </button>
      </div>

      <Card title="Task Completion Progress">
        <ProgressBar
          value={data.completedTasks}
          max={data.totalTasks || 1}
          label="Tasks Completed"
          showPercentage
        />
      </Card>

      <Card title="Recent Entries">
        <Table
          columns={recentColumns}
          data={(data.recentEntries as unknown as Record<string, unknown>[]) || []}
          emptyMessage="No recent entries. Start by creating your first task entry."
        />
      </Card>
    </div>
  );
}

function ManagerDashboardView({ data }: { data: RecruitOverviewDto[] }) {
  const router = useRouter();

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (item: Record<string, unknown>) => {
        const recruit = item as unknown as RecruitOverviewDto;
        return (
          <button
            className="text-blue-600 hover:underline font-medium text-left"
            onClick={() => router.push(`/tasks?userId=${recruit.id}`)}
          >
            {recruit.name}
          </button>
        );
      },
    },
    { key: 'department', header: 'Department' },
    {
      key: 'daysElapsed',
      header: 'Days Elapsed',
      render: (item: Record<string, unknown>) => {
        const recruit = item as unknown as RecruitOverviewDto;
        return <span>{recruit.daysElapsed} days</span>;
      },
    },
    {
      key: 'tasks',
      header: 'Tasks',
      render: (item: Record<string, unknown>) => {
        const recruit = item as unknown as RecruitOverviewDto;
        return (
          <span>
            {recruit.tasksCompleted}/{recruit.totalTasks}
          </span>
        );
      },
    },
    {
      key: 'openIssues',
      header: 'Open Issues',
      render: (item: Record<string, unknown>) => {
        const recruit = item as unknown as RecruitOverviewDto;
        return recruit.openIssues > 0 ? (
          <Badge variant="danger">{recruit.openIssues}</Badge>
        ) : (
          <Badge variant="success">0</Badge>
        );
      },
    },
    {
      key: 'feedbackCount',
      header: 'Feedback',
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Assigned Recruits">
        <Table
          columns={columns}
          data={(data as unknown as Record<string, unknown>[]) || []}
          emptyMessage="No recruits assigned to you."
        />
      </Card>
    </div>
  );
}

function AdminDashboardView({ data }: { data: SystemOverviewDto }) {
  const userCountEntries = Object.entries(data.userCounts);
  const entryCountEntries = Object.entries(data.entryCounts);

  const activityColumns = [
    {
      key: 'userName',
      header: 'User',
    },
    {
      key: 'action',
      header: 'Action',
      render: (item: Record<string, unknown>) => {
        const activity = item as unknown as RecentActivityDto;
        return (
          <Badge variant={typeBadgeVariant[activity.action] || 'default'}>
            {activity.action}
          </Badge>
        );
      },
    },
    {
      key: 'title',
      header: 'Title',
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (item: Record<string, unknown>) =>
        formatDateTime((item as unknown as RecentActivityDto).timestamp),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Users by Role">
          <div className="space-y-3">
            {userCountEntries.map(([role, count]) => (
              <div key={role} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{role}</span>
                <span className="text-lg font-bold text-blue-600">{count}</span>
              </div>
            ))}
            {userCountEntries.length === 0 && (
              <p className="text-sm text-gray-500">No users found.</p>
            )}
          </div>
        </Card>
        <Card title="Entries by Category">
          <div className="space-y-3">
            {entryCountEntries.map(([category, count]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{category}</span>
                <span className="text-lg font-bold text-green-600">{count}</span>
              </div>
            ))}
            {entryCountEntries.length === 0 && (
              <p className="text-sm text-gray-500">No entries found.</p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Recent Activity">
        <Table
          columns={activityColumns}
          data={(data.recentActivity as unknown as Record<string, unknown>[]) || []}
          emptyMessage="No recent activity."
        />
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user, role } = useAuth();

  const [recruitData, setRecruitData] = useState<DashboardSummaryDto | null>(null);
  const [managerData, setManagerData] = useState<RecruitOverviewDto[] | null>(null);
  const [adminData, setAdminData] = useState<SystemOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const recruitResult = await getRecruitDashboard();
        if (!cancelled) setRecruitData(recruitResult);

        if (role === UserRole.Manager || role === UserRole.Admin) {
          const managerResult = await getManagerDashboard();
          if (!cancelled) setManagerData(managerResult);
        }

        if (role === UserRole.Admin) {
          const adminResult = await getSystemDashboard();
          if (!cancelled) setAdminData(adminResult);
        }
      } catch {
        if (!cancelled) setError('Failed to load dashboard data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s an overview of your onboarding progress.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading dashboard...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : (
          <>
            {recruitData && <RecruitDashboardView data={recruitData} />}

            {(role === UserRole.Manager || role === UserRole.Admin) && managerData && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Manager Overview</h2>
                <ManagerDashboardView data={managerData} />
              </div>
            )}

            {role === UserRole.Admin && adminData && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">System Overview</h2>
                <AdminDashboardView data={adminData} />
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
