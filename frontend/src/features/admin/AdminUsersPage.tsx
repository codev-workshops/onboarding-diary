import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type {
  AdminUser,
  AdminUserFilters,
  CreateUserPayload,
  UpdateUserPayload,
} from '../../api/admin';
import { createUser, getAdminStats, listUsers, updateUser, userRoles } from '../../api/admin';
import { listDepartments } from '../../api/auth';
import { ApiError } from '../../api/client';
import { buttonClass, inputClass } from '../../components/FormField';
import { AdminUserDialog } from './AdminUserDialog';

const pageSize = 10;

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AdminUserFilters>({ q: '', role: '' });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; user: AdminUser | null }>({
    open: false,
    user: null,
  });

  const query = useQuery({
    queryKey: ['admin-users', filters, page],
    queryFn: () => listUsers({ ...filters, page, pageSize }),
  });

  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });

  const departments = useQuery({ queryKey: ['departments'], queryFn: listDepartments });

  const managers = useQuery({
    queryKey: ['admin-users', 'managers'],
    queryFn: () => listUsers({ role: 'Manager', isActive: true, pageSize: 100 }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['team'] });
  };

  const save = useMutation({
    mutationFn: (payload: CreateUserPayload | UpdateUserPayload) =>
      dialog.user
        ? updateUser(dialog.user.id, payload as UpdateUserPayload)
        : createUser(payload as CreateUserPayload),
    onSuccess: () => {
      setDialog({ open: false, user: null });
      invalidate();
    },
  });

  const updateFilter = (patch: Partial<AdminUserFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const users = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Users</h1>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setDialog({ open: true, user: null })}
        >
          New user
        </button>
      </div>

      {stats.isSuccess ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Users" value={stats.data.totalUsers} />
          <StatCard label="Active" value={stats.data.activeUsers} />
          <StatCard label="Recruits" value={stats.data.recruits} />
          <StatCard label="Unassigned recruits" value={stats.data.unassignedRecruits} />
        </div>
      ) : null}

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="block text-slate-600">Search</span>
          <input
            type="search"
            className={inputClass}
            value={filters.q ?? ''}
            onChange={(event) => updateFilter({ q: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Role</span>
          <select
            className={inputClass}
            value={filters.role ?? ''}
            onChange={(event) =>
              updateFilter({ role: event.target.value as AdminUserFilters['role'] })
            }
          >
            <option value="">All</option>
            {userRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Status</span>
          <select
            className={inputClass}
            value={filters.isActive === undefined ? '' : String(filters.isActive)}
            onChange={(event) =>
              updateFilter({
                isActive: event.target.value === '' ? undefined : event.target.value === 'true',
              })
            }
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      </div>

      {query.isPending ? <p className="text-sm text-slate-600">Loading users…</p> : null}

      {query.isError ? (
        <div role="alert" className="space-y-2 text-sm text-red-600">
          <p>
            {query.error instanceof ApiError
              ? query.error.message
              : 'Could not load users. Try again.'}
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

      {query.isSuccess && users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
          No users match these filters.
        </p>
      ) : null}

      {users.length > 0 ? (
        <ul className="space-y-3 md:hidden">
          {users.map((user) => (
            <li key={user.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-medium">{user.fullName}</p>
              <p className="text-sm text-slate-600">
                {user.email} · {user.role} · {user.isActive ? 'Active' : 'Inactive'}
              </p>
              <p className="text-sm text-slate-600">
                {user.departmentName ?? 'No department'} ·{' '}
                {user.role === 'Recruit'
                  ? `Manager: ${user.managerName ?? 'unassigned'}`
                  : 'No manager'}
              </p>
              <button
                type="button"
                className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-sm"
                onClick={() => setDialog({ open: true, user })}
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {users.length > 0 ? (
        <table className="hidden w-full table-auto border-collapse text-left text-sm md:table">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Department</th>
              <th className="py-2 pr-3">Manager</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100">
                <td className="py-2 pr-3">{user.fullName}</td>
                <td className="py-2 pr-3">{user.email}</td>
                <td className="py-2 pr-3">{user.role}</td>
                <td className="py-2 pr-3">{user.departmentName ?? '—'}</td>
                <td className="py-2 pr-3">{user.managerName ?? '—'}</td>
                <td className="py-2 pr-3">{user.isActive ? 'Active' : 'Inactive'}</td>
                <td className="py-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    onClick={() => setDialog({ open: true, user })}
                  >
                    Edit
                  </button>
                </td>
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

      {dialog.open ? (
        <AdminUserDialog
          user={dialog.user}
          departments={departments.data ?? []}
          managers={managers.data?.items ?? []}
          pending={save.isPending}
          error={save.error}
          onCreate={(payload) => save.mutate(payload)}
          onUpdate={(payload) => save.mutate(payload)}
          onClose={() => setDialog({ open: false, user: null })}
        />
      ) : null}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
