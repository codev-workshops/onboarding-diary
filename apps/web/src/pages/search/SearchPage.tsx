import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  CheckSquare,
  AlertTriangle,
  MessageSquare,
  StickyNote,
  Calendar,
  Filter,
} from 'lucide-react';
import type { SearchResultItem, SearchEntityType } from '@onboarding-diary/shared';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { searchApi } from '@/api/search.api';
import { cn } from '@/utils/cn';

const entityTypeConfig: Record<SearchEntityType, { label: string; icon: typeof CheckSquare; color: string; route: string }> = {
  task: { label: 'Task', icon: CheckSquare, color: 'bg-blue-100 text-blue-700', route: '/tasks' },
  issue: { label: 'Issue', icon: AlertTriangle, color: 'bg-orange-100 text-orange-700', route: '/issues' },
  feedback: { label: 'Feedback', icon: MessageSquare, color: 'bg-purple-100 text-purple-700', route: '/feedback' },
  note: { label: 'Note', icon: StickyNote, color: 'bg-green-100 text-green-700', route: '/notes' },
};

const typeFilterOptions = [
  { value: '', label: 'All Types' },
  { value: 'task', label: 'Tasks' },
  { value: 'issue', label: 'Issues' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'note', label: 'Notes' },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'updated_at', label: 'Last Updated' },
];

function HighlightedSnippet({ html }: { html: string }) {
  return (
    <span
      className="text-sm text-gray-600"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SearchResultCard({ item }: { item: SearchResultItem }) {
  const config = entityTypeConfig[item.type];
  const Icon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', config.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={config.route}
                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate"
                >
                  {item.title}
                </Link>
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
                  {config.label}
                </span>
              </div>

              {/* Highlighted matches */}
              {item.highlights.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {item.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-baseline gap-1.5">
                      <span className="text-xs text-gray-400 shrink-0">{h.field}:</span>
                      <HighlightedSnippet html={h.snippet} />
                    </div>
                  ))}
                </div>
              )}

              {/* Metadata row */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {item.meta.type === 'task' && (
                  <>
                    <StatusBadge status={item.meta.status} />
                    <Badge variant={item.meta.priority === 'HIGH' || item.meta.priority === 'CRITICAL' ? 'danger' : 'default'}>
                      {item.meta.priority}
                    </Badge>
                    {item.meta.tags.map((tag) => (
                      <Badge key={tag} variant="default">{tag}</Badge>
                    ))}
                  </>
                )}
                {item.meta.type === 'issue' && (
                  <>
                    <StatusBadge status={item.meta.status} />
                    <Badge variant={item.meta.severity === 'HIGH' || item.meta.severity === 'CRITICAL' ? 'danger' : 'warning'}>
                      {item.meta.severity}
                    </Badge>
                    {item.meta.tags.map((tag) => (
                      <Badge key={tag} variant="default">{tag}</Badge>
                    ))}
                  </>
                )}
                {item.meta.type === 'feedback' && (
                  <>
                    <Badge variant={item.meta.feedback_type === 'POSITIVE' ? 'success' : item.meta.feedback_type === 'CONSTRUCTIVE' ? 'warning' : 'default'}>
                      {item.meta.feedback_type}
                    </Badge>
                    {item.meta.rating != null && (
                      <span className="text-xs text-gray-500">★ {item.meta.rating}/5</span>
                    )}
                  </>
                )}
                {item.meta.type === 'note' && (
                  <>
                    <Badge variant="default">{item.meta.visibility}</Badge>
                    {item.meta.mood_rating != null && (
                      <span className="text-xs text-gray-500">Mood: {item.meta.mood_rating}/5</span>
                    )}
                    {item.meta.tags.map((tag) => (
                      <Badge key={tag} variant="default">{tag}</Badge>
                    ))}
                  </>
                )}
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') ?? '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') ?? 'relevance');
  const [fromDate, setFromDate] = useState(searchParams.get('from_date') ?? '');
  const [toDate, setToDate] = useState(searchParams.get('to_date') ?? '');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', query, typeFilter, sortBy, fromDate, toDate, page],
    queryFn: () =>
      searchApi.search({
        q: query,
        types: typeFilter || undefined,
        page,
        limit: 20,
        sort_by: sortBy as 'relevance' | 'created_at' | 'updated_at',
        sort_order: 'desc',
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
    enabled: query.length > 0,
  });

  // Sync URL params when query changes
  useEffect(() => {
    if (query) {
      const params: Record<string, string> = { q: query };
      if (typeFilter) params.type = typeFilter;
      if (sortBy !== 'relevance') params.sort_by = sortBy;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      setSearchParams(params, { replace: true });
    }
  }, [query, typeFilter, sortBy, fromDate, toDate, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setQuery(searchInput.trim());
      setPage(1);
    }
  };

  return (
    <PageLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Search</h1>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search across tasks, issues, feedback, and notes…"
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </form>

        {/* Filter controls */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {showFilters && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select
                label="Type"
                options={typeFilterOptions}
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              />
              <Select
                label="Sort By"
                options={sortOptions}
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              />
              <Input
                label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              />
              <Input
                label="To Date"
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              />
            </div>
          )}
        </div>

        {/* Results */}
        {!query && (
          <EmptyState
            title="Start searching"
            description="Enter a search query to find tasks, issues, feedback, and notes across your onboarding diary."
          />
        )}

        {query && isLoading && <PageLoading />}

        {query && isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            An error occurred while searching. Please try again.
          </div>
        )}

        {query && data && (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {data.meta.total_count} result{data.meta.total_count !== 1 ? 's' : ''} for &quot;{query}&quot;
            </div>

            {data.data.length === 0 ? (
              <EmptyState
                title="No results found"
                description={`No matches found for "${query}". Try adjusting your search terms or filters.`}
              />
            ) : (
              <div className="space-y-3">
                {data.data.map((item) => (
                  <SearchResultCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            )}

            {data.meta.total_pages > 1 && (
              <div className="mt-6">
                <Pagination
                  meta={data.meta}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
