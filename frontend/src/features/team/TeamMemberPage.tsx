import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { issueStatusLabels, listFeedback, listIssues, listNotes } from '../../api/diary';
import { getDashboard, listTasks, statusLabels } from '../../api/tasks';
import { getTeamRecruit } from '../../api/team';
import { EmptyState, LoadingState } from '../../components/ListState';

const pageSize = 10;

const tabs = ['Tasks', 'Issues', 'Feedback', 'Notes'] as const;

type Tab = (typeof tabs)[number];

export function TeamMemberPage() {
  const { userId: param } = useParams();
  const userId = Number(param);
  const [tab, setTab] = useState<Tab>('Tasks');

  const member = useQuery({
    queryKey: ['team', 'member', userId],
    queryFn: () => getTeamRecruit(userId),
    enabled: Number.isFinite(userId),
  });

  const dashboard = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
    enabled: Number.isFinite(userId),
  });

  if (member.isError) {
    const notFound = member.error instanceof ApiError && member.error.status === 404;
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Recruit</h1>
        <p role="alert" className="text-sm text-red-600">
          {notFound
            ? 'That recruit is not assigned to you.'
            : 'Could not load this recruit. Try again.'}
        </p>
        <Link className="text-sm underline" to="/team">
          Back to team
        </Link>
      </section>
    );
  }

  if (member.isPending) {
    return <LoadingState label="Loading recruit…" />;
  }

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm underline" to="/team">
          Back to team
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{member.data.fullName}</h1>
        <p className="text-sm text-slate-600">
          {member.data.email} · {member.data.departmentName ?? 'No department'} ·{' '}
          {member.data.isActive ? 'Active' : 'Inactive'}
        </p>
        <p className="mt-1 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Read-only view. Only the recruit can change their diary entries.
        </p>
      </div>

      {dashboard.isSuccess ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tasks logged" value={dashboard.data.tasks.total} />
          <StatCard label="Completion" value={`${dashboard.data.tasks.completionPercentage}%`} />
          <StatCard label="Open issues" value={dashboard.data.issues.open} />
          <StatCard label="Feedback" value={dashboard.data.feedbackCount} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Diary sections">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`tab-${name}`}
            aria-selected={tab === name}
            aria-controls="diary-panel"
            className={`rounded-md border px-3 py-1 text-sm ${
              tab === name
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 text-slate-700'
            }`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div id="diary-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'Tasks' ? <TaskList userId={userId} /> : null}
        {tab === 'Issues' ? <IssueList userId={userId} /> : null}
        {tab === 'Feedback' ? <FeedbackList userId={userId} /> : null}
        {tab === 'Notes' ? <NoteList userId={userId} /> : null}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function EntryList({
  isPending,
  isEmpty,
  emptyLabel,
  children,
}: {
  isPending: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  if (isPending) {
    return <LoadingState label="Loading…" />;
  }

  if (isEmpty) {
    return <EmptyState message={emptyLabel} />;
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {children}
    </ul>
  );
}

function Entry({ title, meta, body }: { title: string; meta: string; body?: string | null }) {
  return (
    <li className="space-y-1 p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-medium">{title}</span>
        <span className="text-slate-600">{meta}</span>
      </div>
      {body ? <p className="whitespace-pre-line text-slate-700">{body}</p> : null}
    </li>
  );
}

function TaskList({ userId }: { userId: number }) {
  const query = useQuery({
    queryKey: ['tasks', 'team', userId],
    queryFn: () => listTasks({ userId, page: 1, pageSize }),
  });
  const items = query.data?.items ?? [];

  return (
    <EntryList
      isPending={query.isPending}
      isEmpty={items.length === 0}
      emptyLabel="No tasks logged."
    >
      {items.map((task) => (
        <Entry
          key={task.id}
          title={task.title}
          meta={`${task.entryDate} · ${task.category} · ${statusLabels[task.status]}`}
          body={task.description}
        />
      ))}
    </EntryList>
  );
}

function IssueList({ userId }: { userId: number }) {
  const query = useQuery({
    queryKey: ['issues', 'team', userId],
    queryFn: () => listIssues({ userId, page: 1, pageSize }),
  });
  const items = query.data?.items ?? [];

  return (
    <EntryList
      isPending={query.isPending}
      isEmpty={items.length === 0}
      emptyLabel="No issues logged."
    >
      {items.map((issue) => (
        <Entry
          key={issue.id}
          title={issue.title}
          meta={`${issue.entryDate} · ${issue.severity} · ${issueStatusLabels[issue.status]}`}
          body={
            issue.resolutionNotes === null
              ? issue.description
              : `${issue.description ?? ''}\nResolution: ${issue.resolutionNotes}`.trim()
          }
        />
      ))}
    </EntryList>
  );
}

function FeedbackList({ userId }: { userId: number }) {
  const query = useQuery({
    queryKey: ['feedback', 'team', userId],
    queryFn: () => listFeedback({ userId, page: 1, pageSize }),
  });
  const items = query.data?.items ?? [];

  return (
    <EntryList
      isPending={query.isPending}
      isEmpty={items.length === 0}
      emptyLabel="No feedback logged."
    >
      {items.map((feedback) => (
        <Entry
          key={feedback.id}
          title={feedback.title}
          meta={`${feedback.entryDate} · ${feedback.type}`}
          body={feedback.message}
        />
      ))}
    </EntryList>
  );
}

function NoteList({ userId }: { userId: number }) {
  const query = useQuery({
    queryKey: ['notes', 'team', userId],
    queryFn: () => listNotes({ userId, page: 1, pageSize }),
  });
  const items = query.data?.items ?? [];

  return (
    <EntryList
      isPending={query.isPending}
      isEmpty={items.length === 0}
      emptyLabel="No notes logged."
    >
      {items.map((note) => (
        <Entry
          key={note.id}
          title={note.title}
          meta={`${note.entryDate}${note.tags.length > 0 ? ` · ${note.tags.join(', ')}` : ''}`}
          body={note.content}
        />
      ))}
    </EntryList>
  );
}
