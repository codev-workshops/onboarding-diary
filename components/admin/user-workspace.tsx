'use client';

import { useState } from 'react';

import { useAdminSubmit } from '@/components/admin/submit';
import { UserDialog, type ManagerOption } from '@/components/admin/user-dialog';
import { formatDate, labelize } from '@/components/entries/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DepartmentView } from '@/src/modules/departments/admin-service';
import type { AdminUserView } from '@/src/modules/users/dto';

export function AdminUserWorkspace({
  users,
  departments,
}: {
  users: AdminUserView[];
  departments: DepartmentView[];
}) {
  const [editing, setEditing] = useState<AdminUserView | 'new' | null>(null);
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);
  const { saving, message, send } = useAdminSubmit();

  const managers: ManagerOption[] = users
    .filter((user) => user.role !== 'RECRUIT')
    .map((user) => ({
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
    }));

  function toggleActive(user: AdminUserView) {
    void send({
      method: 'POST',
      path: `/api/v1/users/${user.id}/${user.is_active ? 'deactivate' : 'reactivate'}`,
      body: user.is_active ? {} : undefined,
    });
  }

  // The reset password is shown once, here, for the same reason creation shows
  // it once: the server keeps only the hash (US-70).
  async function resetPassword(user: AdminUserView) {
    const result = await send({ method: 'POST', path: `/api/v1/users/${user.id}/reset-password`, body: {} });
    if (typeof result?.temporary_password === 'string') {
      setIssued({ name: user.full_name, password: result.temporary_password });
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm">
            {users.length} account{users.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>New user</Button>
      </div>

      {message ? (
        <p role="alert" className="text-destructive text-sm">
          {message}
        </p>
      ) : null}

      {issued ? (
        <p role="status" className="bg-muted rounded-md px-3 py-2 text-sm">
          Temporary password for {issued.name}: <code className="font-mono">{issued.password}</code>. It is
          shown once and must be changed at their next sign-in.{' '}
          <button type="button" className="underline" onClick={() => setIssued(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Started</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <span className="font-medium">{user.full_name}</span>
                <p className="text-muted-foreground text-xs">{user.email}</p>
                {user.is_active ? null : (
                  <Badge variant="ghost" className="mt-1">
                    Deactivated
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {labelize(user.role)}
                {user.direct_reports > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {user.direct_reports} report{user.direct_reports === 1 ? '' : 's'}
                  </p>
                ) : null}
              </TableCell>
              <TableCell>{user.department?.name ?? '—'}</TableCell>
              <TableCell>{user.manager?.full_name ?? '—'}</TableCell>
              <TableCell>{formatDate(user.start_date)}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="ghost" size="sm" onClick={() => setEditing(user)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" disabled={saving} onClick={() => toggleActive(user)}>
                  {user.is_active ? 'Deactivate' : 'Reactivate'}
                </Button>
                <Button variant="ghost" size="sm" disabled={saving} onClick={() => void resetPassword(user)}>
                  Reset password
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing ? (
        <UserDialog
          user={editing === 'new' ? undefined : editing}
          departments={departments}
          managers={managers}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}
