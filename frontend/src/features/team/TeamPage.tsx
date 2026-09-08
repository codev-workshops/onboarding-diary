import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { listTeamRecruits } from '../../api/team';
import { useAuth } from '../../auth/auth-context';
import { inputClass } from '../../components/FormField';

const pageSize = 10;

export function TeamPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['team', q, page],
    queryFn: () => listTeamRecruits({ q, page, pageSize }),
  });

  const recruits = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-slate-600">
          {user?.role === 'Admin'
            ? 'Every recruit in the organisation. Diary entries are read-only.'
            : 'Recruits assigned to you. Diary entries are read-only.'}
        </p>
      </div>

      <label className="block max-w-sm text-sm">
        <span className="block text-slate-600">Search</span>
        <input
          type="search"
          className={inputClass}
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
        />
      </label>

      {query.isPending ? <p className="text-sm text-slate-600">Loading team…</p> : null}

      {query.isError ? (
        <div role="alert" className="space-y-2 text-sm text-red-600">
          <p>
            {query.error instanceof ApiError
              ? query.error.message
              : 'Could not load the team. Try again.'}
          </p>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-slate-700"
            onClick={() => void query.refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {query.isSuccess && recruits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
          No recruits assigned yet.
        </div>
      ) : null}

      {recruits.length > 0 ? (
        <ul className="space-y-3 md:hidden">
          {recruits.map((recruit) => (
            <li key={recruit.userId} className="rounded-lg border border-slate-200 bg-white p-3">
              <Link className="font-medium underline" to={`/team/${recruit.userId}`}>
                {recruit.fullName}
              </Link>
              <p className="text-sm text-slate-600">{recruit.email}</p>
              <p className="mt-1 text-sm text-slate-600">
                {recruit.departmentName ?? 'No department'} · {recruit.taskCount} tasks ·{' '}
                {recruit.completionPercentage}% complete · {recruit.openIssueCount} open issues
              </p>
              <p className="text-sm text-slate-600">
                {recruit.lastActivityAt === null
                  ? 'No activity'
                  : `Last activity ${recruit.lastActivityAt.slice(0, 10)}`}{' '}
                · {recruit.isActive ? 'Active' : 'Inactive'}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {recruits.length > 0 ? (
        <table className="hidden w-full table-auto border-collapse text-left text-sm md:table">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="py-2 pr-3">Recruit</th>
              <th className="py-2 pr-3">Department</th>
              <th className="py-2 pr-3">Tasks</th>
              <th className="py-2 pr-3">Completion</th>
              <th className="py-2 pr-3">Open issues</th>
              <th className="py-2 pr-3">Last activity</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {recruits.map((recruit) => (
              <tr key={recruit.userId} className="border-b border-slate-100">
                <td className="py-2 pr-3">
                  <Link className="font-medium underline" to={`/team/${recruit.userId}`}>
                    {recruit.fullName}
                  </Link>
                  <span className="block text-slate-600">{recruit.email}</span>
                </td>
                <td className="py-2 pr-3">{recruit.departmentName ?? '—'}</td>
                <td className="py-2 pr-3">{recruit.taskCount}</td>
                <td className="py-2 pr-3">{recruit.completionPercentage}%</td>
                <td className="py-2 pr-3">{recruit.openIssueCount}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {recruit.lastActivityAt === null
                    ? 'No activity'
                    : recruit.lastActivityAt.slice(0, 10)}
                </td>
                <td className="py-2">{recruit.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {total > pageSize ? (
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {lastPage}
          </span>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
            disabled={page >= lastPage}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
