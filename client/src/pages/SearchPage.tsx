import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckSquare, AlertTriangle, MessageSquare, StickyNote } from 'lucide-react';
import { TaskEntry, IssueEntry, FeedbackEntry, NoteEntry } from '@onboarding-diary/shared';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import api from '../services/api';

interface SearchResults {
  tasks: (TaskEntry & { _type: 'task' })[];
  issues: (IssueEntry & { _type: 'issue' })[];
  feedback: (FeedbackEntry & { _type: 'feedback' })[];
  notes: (NoteEntry & { _type: 'note' })[];
  total: number;
}

type TabKey = 'all' | 'tasks' | 'issues' | 'feedback' | 'notes';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setDebouncedQuery(value), 300);
    setDebounceTimer(timer);
  };

  const { data, isLoading } = useQuery<SearchResults>({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.data),
    enabled: debouncedQuery.length >= 2,
  });

  const tabs: { key: TabKey; label: string; count: number; icon: typeof Search }[] = [
    { key: 'all', label: 'All', count: data?.total || 0, icon: Search },
    { key: 'tasks', label: 'Tasks', count: data?.tasks?.length || 0, icon: CheckSquare },
    { key: 'issues', label: 'Issues', count: data?.issues?.length || 0, icon: AlertTriangle },
    { key: 'feedback', label: 'Feedback', count: data?.feedback?.length || 0, icon: MessageSquare },
    { key: 'notes', label: 'Notes', count: data?.notes?.length || 0, icon: StickyNote },
  ];

  const showTasks = activeTab === 'all' || activeTab === 'tasks';
  const showIssues = activeTab === 'all' || activeTab === 'issues';
  const showFeedback = activeTab === 'all' || activeTab === 'feedback';
  const showNotes = activeTab === 'all' || activeTab === 'notes';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search</h1>

      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search across tasks, issues, feedback, and notes..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white dark:placeholder-gray-400"
          autoFocus
        />
      </div>

      {debouncedQuery.length >= 2 && data && (
        <>
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {tabs.map(({ key, label, count, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon size={14} />
                {label}
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {showTasks && data.tasks.length > 0 && (
              <ResultSection title="Tasks" icon={CheckSquare}>
                {data.tasks.map((t) => (
                  <ResultCard
                    key={t.id}
                    title={t.title}
                    subtitle={t.description || ''}
                    date={t.date}
                    badges={[
                      { label: t.category, variant: 'blue' as const },
                      { label: t.status.replace('_', ' '), variant: t.status === 'COMPLETED' ? 'green' as const : 'gray' as const },
                      { label: t.priority, variant: t.priority === 'URGENT' ? 'red' as const : 'yellow' as const },
                    ]}
                  />
                ))}
              </ResultSection>
            )}

            {showIssues && data.issues.length > 0 && (
              <ResultSection title="Issues" icon={AlertTriangle}>
                {data.issues.map((i) => (
                  <ResultCard
                    key={i.id}
                    title={i.title}
                    subtitle={i.description}
                    date={i.date}
                    badges={[
                      { label: i.severity, variant: i.severity === 'CRITICAL' ? 'red' as const : 'yellow' as const },
                      { label: i.status.replace('_', ' '), variant: i.status === 'RESOLVED' ? 'green' as const : 'gray' as const },
                    ]}
                  />
                ))}
              </ResultSection>
            )}

            {showFeedback && data.feedback.length > 0 && (
              <ResultSection title="Feedback" icon={MessageSquare}>
                {data.feedback.map((f) => (
                  <ResultCard
                    key={f.id}
                    title={f.subject}
                    subtitle={f.details}
                    date={f.date}
                    badges={[
                      { label: f.type, variant: f.type === 'POSITIVE' ? 'green' as const : f.type === 'CONCERN' ? 'red' as const : 'blue' as const },
                    ]}
                  />
                ))}
              </ResultSection>
            )}

            {showNotes && data.notes.length > 0 && (
              <ResultSection title="Notes" icon={StickyNote}>
                {data.notes.map((n) => (
                  <ResultCard
                    key={n.id}
                    title={n.title}
                    subtitle={n.content.slice(0, 150)}
                    date={n.date}
                    badges={n.tags.map((tag) => ({ label: tag, variant: 'indigo' as const }))}
                  />
                ))}
              </ResultSection>
            )}

            {data.total === 0 && (
              <EmptyState message={`No results found for "${debouncedQuery}"`} />
            )}
          </div>
        </>
      )}

      {isLoading && debouncedQuery.length >= 2 && (
        <div className="text-center py-8 text-gray-400 text-sm">Searching...</div>
      )}

      {debouncedQuery.length < 2 && query.length > 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">Type at least 2 characters to search</div>
      )}
    </div>
  );
}

function ResultSection({ title, icon: Icon, children }: { title: string; icon: typeof Search; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        <Icon size={14} />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'indigo' | 'orange' | 'purple';

function ResultCard({
  title,
  subtitle,
  date,
  badges,
}: {
  title: string;
  subtitle: string;
  date: string;
  badges: { label: string; variant: BadgeVariant }[];
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">{title}</h4>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{subtitle}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {badges.map((b, i) => (
              <Badge key={i} variant={b.variant}>{b.label}</Badge>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(date).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
