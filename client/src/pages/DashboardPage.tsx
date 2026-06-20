import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardSummary, RecentEntries, TaskStatus } from '@onboarding-diary/shared';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CheckSquare, AlertTriangle, MessageSquare, StickyNote, ListChecks } from 'lucide-react';
import Badge from '../components/Badge';
import api from '../services/api';

export default function DashboardPage() {
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
  });

  const { data: recent } = useQuery<RecentEntries>({
    queryKey: ['dashboard-recent'],
    queryFn: () => api.get('/dashboard/recent').then((r) => r.data),
  });

  const completionPct = summary && summary.totalTasks > 0
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  const taskStatusData = recent?.tasks
    ? Object.values(TaskStatus).map((status) => ({
        name: status.replace('_', ' '),
        value: recent.tasks.filter((t) => t.status === status).length,
      })).filter((d) => d.value > 0)
    : [];

  const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];

  const cards = [
    { label: 'Total Tasks', value: summary?.totalTasks ?? 0, icon: ListChecks, color: 'bg-indigo-100 text-indigo-600' },
    { label: 'Completed Tasks', value: summary?.completedTasks ?? 0, icon: CheckSquare, color: 'bg-green-100 text-green-600' },
    { label: 'Open Issues', value: summary?.openIssues ?? 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
    { label: 'Feedback Count', value: summary?.feedbackCount ?? 0, icon: MessageSquare, color: 'bg-blue-100 text-blue-600' },
    { label: 'Notes Count', value: summary?.notesCount ?? 0, icon: StickyNote, color: 'bg-yellow-100 text-yellow-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Completion</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{summary?.completedTasks ?? 0} of {summary?.totalTasks ?? 0} completed</span>
              <span>{completionPct}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Status Distribution</h2>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {taskStatusData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No task data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Entries</h2>
        <RecentTabs recent={recent} />
      </div>
    </div>
  );
}

function RecentTabs({ recent }: { recent?: RecentEntries }) {
  const tabs = ['Tasks', 'Issues', 'Feedback', 'Notes'] as const;
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Tasks');

  return (
    <div>
      <div className="flex gap-1 border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Tasks' && (
        <div className="space-y-2">
          {recent?.tasks?.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{t.title}</p>
                <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
              </div>
              <Badge variant={t.status === 'COMPLETED' ? 'green' : t.status === 'BLOCKED' ? 'red' : 'blue'}>
                {t.status.replace('_', ' ')}
              </Badge>
            </div>
          )) || <p className="text-sm text-gray-400">No tasks yet</p>}
        </div>
      )}

      {activeTab === 'Issues' && (
        <div className="space-y-2">
          {recent?.issues?.slice(0, 5).map((i) => (
            <div key={i.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{i.title}</p>
                <p className="text-xs text-gray-500">{new Date(i.date).toLocaleDateString()}</p>
              </div>
              <Badge variant={i.severity === 'CRITICAL' ? 'red' : i.severity === 'HIGH' ? 'orange' : 'yellow'}>
                {i.severity}
              </Badge>
            </div>
          )) || <p className="text-sm text-gray-400">No issues yet</p>}
        </div>
      )}

      {activeTab === 'Feedback' && (
        <div className="space-y-2">
          {recent?.feedback?.slice(0, 5).map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{f.subject}</p>
                <p className="text-xs text-gray-500">{new Date(f.date).toLocaleDateString()}</p>
              </div>
              <Badge variant={f.type === 'POSITIVE' ? 'green' : f.type === 'SUGGESTION' ? 'blue' : 'orange'}>
                {f.type}
              </Badge>
            </div>
          )) || <p className="text-sm text-gray-400">No feedback yet</p>}
        </div>
      )}

      {activeTab === 'Notes' && (
        <div className="space-y-2">
          {recent?.notes?.slice(0, 5).map((n) => (
            <div key={n.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500">{new Date(n.date).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1">
                {n.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="gray">{tag}</Badge>
                ))}
              </div>
            </div>
          )) || <p className="text-sm text-gray-400">No notes yet</p>}
        </div>
      )}
    </div>
  );
}
