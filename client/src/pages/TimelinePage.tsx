import { useQuery } from '@tanstack/react-query';
import { CheckSquare, AlertTriangle, MessageSquare, StickyNote } from 'lucide-react';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import api from '../services/api';

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'indigo' | 'orange' | 'purple';

interface TimelineEntry {
  id: string;
  type: 'task' | 'issue' | 'feedback' | 'note';
  title: string;
  subtitle: string;
  date: string;
  createdAt: string;
  metadata: Record<string, string>;
}

const typeConfig: Record<string, { icon: typeof CheckSquare; color: string; darkColor: string; label: string }> = {
  task: { icon: CheckSquare, color: 'bg-blue-100 text-blue-600', darkColor: 'dark:bg-blue-900 dark:text-blue-300', label: 'Task' },
  issue: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-600', darkColor: 'dark:bg-orange-900 dark:text-orange-300', label: 'Issue' },
  feedback: { icon: MessageSquare, color: 'bg-green-100 text-green-600', darkColor: 'dark:bg-green-900 dark:text-green-300', label: 'Feedback' },
  note: { icon: StickyNote, color: 'bg-purple-100 text-purple-600', darkColor: 'dark:bg-purple-900 dark:text-purple-300', label: 'Note' },
};

function groupByDate(entries: TimelineEntry[]): Record<string, TimelineEntry[]> {
  const groups: Record<string, TimelineEntry[]> = {};
  for (const entry of entries) {
    const dateKey = new Date(entry.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(entry);
  }
  return groups;
}

function getMetadataBadges(entry: TimelineEntry): { label: string; variant: BadgeVariant }[] {
  const badges: { label: string; variant: BadgeVariant }[] = [];
  const meta = entry.metadata;

  if (meta.category) badges.push({ label: meta.category, variant: 'blue' });
  if (meta.status) {
    const variant: BadgeVariant = meta.status === 'COMPLETED' || meta.status === 'RESOLVED' ? 'green'
      : meta.status === 'BLOCKED' || meta.status === 'CRITICAL' ? 'red'
      : 'gray';
    badges.push({ label: meta.status.replace('_', ' '), variant });
  }
  if (meta.priority) {
    const variant: BadgeVariant = meta.priority === 'URGENT' ? 'red' : meta.priority === 'HIGH' ? 'orange' : 'yellow';
    badges.push({ label: meta.priority, variant });
  }
  if (meta.severity) {
    const variant: BadgeVariant = meta.severity === 'CRITICAL' ? 'red' : meta.severity === 'HIGH' ? 'orange' : 'yellow';
    badges.push({ label: meta.severity, variant });
  }
  if (meta.type) {
    const variant: BadgeVariant = meta.type === 'POSITIVE' ? 'green' : meta.type === 'CONCERN' ? 'red' : 'blue';
    badges.push({ label: meta.type, variant });
  }
  if (meta.tags) {
    for (const tag of meta.tags.split(', ').filter(Boolean)) {
      badges.push({ label: tag, variant: 'indigo' });
    }
  }

  return badges;
}

export default function TimelinePage() {
  const { data: entries, isLoading } = useQuery<TimelineEntry[]>({
    queryKey: ['timeline'],
    queryFn: () => api.get('/timeline?limit=50').then((r) => r.data),
  });

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Loading timeline...</div>;
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Timeline</h1>
        <EmptyState message="No activity yet. Start by creating tasks, issues, or notes." />
      </div>
    );
  }

  const grouped = groupByDate(entries);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Timeline</h1>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {Object.entries(grouped).map(([dateLabel, dayEntries]) => (
          <div key={dateLabel} className="mb-8">
            <div className="relative flex items-center mb-4">
              <div className="w-3 h-3 bg-indigo-500 rounded-full ml-[18px] z-10" />
              <h2 className="ml-4 text-sm font-semibold text-gray-500 dark:text-gray-400">{dateLabel}</h2>
            </div>

            <div className="space-y-3 ml-12">
              {dayEntries.map((entry) => {
                const config = typeConfig[entry.type];
                const Icon = config.icon;
                const badges = getMetadataBadges(entry);

                return (
                  <div
                    key={`${entry.type}-${entry.id}`}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.color} ${config.darkColor}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400 uppercase">{config.label}</span>
                          <span className="text-xs text-gray-300 dark:text-gray-600">
                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-white mt-0.5">{entry.title}</h3>
                        {entry.subtitle && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{entry.subtitle}</p>
                        )}
                        {badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {badges.map((b, i) => (
                              <Badge key={i} variant={b.variant}>{b.label}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
