/**
 * Admin user management (T-180 to T-182): search and filters over `/users`, with the role,
 * activation, and manager controls inline on each row.
 */

import { ROLES, ROLE_LABELS, type UserDto } from '@onboarding-diary/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/ui/Badge.js';
import { Field } from '../../components/ui/Field.js';
import { Input } from '../../components/ui/Input.js';
import { Pagination } from '../../components/ui/Pagination.js';
import { Select } from '../../components/ui/Select.js';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/states.js';
import { FilterBar } from '../entries/FilterBar.js';
import { enumOptions } from '../entries/enumOptions.js';
import { useFilters } from '../entries/useFilters.js';
import { UserRow } from './UserRow.js';
import { useManagerOptions, useUsers } from './useUsers.js';

const FILTER_NAMES = ['q', 'role', 'department', 'isActive'] as const;

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Deactivated' },
];

export function AdminUsersPage(): ReactNode {
  const filters = useFilters(FILTER_NAMES);
  const query = useUsers(filters.query);
  const managers = useManagerOptions();
  const managerList: readonly UserDto[] = managers.data?.data ?? [];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <Link className="text-sm font-medium text-sky-800 underline" to="/admin">
          Organisation overview
        </Link>
      </div>

      <FilterBar
        total={query.data?.meta.total}
        activeCount={filters.activeCount}
        onReset={filters.reset}
      >
        <Field label="Search">
          {(ids) => (
            <Input
              id={ids.id}
              type="search"
              placeholder="Name or email"
              value={filters.value('q')}
              onChange={(event) => filters.set('q', event.target.value)}
            />
          )}
        </Field>
        <Field label="Role">
          {(ids) => (
            <Select
              id={ids.id}
              placeholder="Any role"
              options={enumOptions(ROLES, ROLE_LABELS)}
              value={filters.value('role')}
              onChange={(event) => filters.set('role', event.target.value)}
            />
          )}
        </Field>
        <Field label="Department">
          {(ids) => (
            <Input
              id={ids.id}
              value={filters.value('department')}
              onChange={(event) => filters.set('department', event.target.value)}
            />
          )}
        </Field>
        <Field label="Status">
          {(ids) => (
            <Select
              id={ids.id}
              placeholder="Any status"
              options={ACTIVE_OPTIONS}
              value={filters.value('isActive')}
              onChange={(event) => filters.set('isActive', event.target.value)}
            />
          )}
        </Field>
      </FilterBar>

      {query.isPending ? (
        <div role="status" aria-label="Loading users" className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          title="No users match these filters"
          description="Try a different search term or clear the filters."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {query.data.data.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{user.fullName}</p>
                    <p className="text-xs text-slate-600">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{user.department ?? 'No department'}</Badge>
                    <Badge tone={user.isActive ? 'success' : 'danger'}>
                      {user.isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                  </div>
                </div>
                <UserRow user={user} managers={managerList} />
              </li>
            ))}
          </ul>
          <Pagination
            page={filters.page}
            pageSize={query.data.meta.pageSize}
            total={query.data.meta.total}
            onPageChange={filters.setPage}
          />
        </>
      )}
    </section>
  );
}
