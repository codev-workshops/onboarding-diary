'use client';

import { UserRole } from '@prisma/client';
import { useState } from 'react';

import { useAdminSubmit } from '@/components/admin/submit';
import { labelize } from '@/components/entries/labels';
import { DialogField, EntryDialog, dialogId, selectClass } from '@/components/entries/form';
import { Input } from '@/components/ui/input';
import type { DepartmentView } from '@/src/modules/departments/admin-service';
import type { AdminUserView } from '@/src/modules/users/dto';

export type ManagerOption = { id: string; full_name: string; role: UserRole; is_active: boolean };

/**
 * Create and edit share one form. On create the response carries the generated
 * password once; the dialog stays open to show it, because there is no second
 * chance to read it — the server keeps only the hash (US-70).
 */
export function UserDialog({
  user,
  departments,
  managers,
  onClose,
}: {
  user?: AdminUserView;
  departments: DepartmentView[];
  managers: ManagerOption[];
  onClose: () => void;
}) {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const { saving, message, fieldErrors, send } = useAdminSubmit();

  // A deactivated department keeps its members, so an existing assignment stays
  // selectable on edit while nobody new can be moved into it (US-73).
  const departmentOptions = departments.filter(
    (department) => department.is_active || department.id === user?.department?.id
  );
  const managerOptions = managers.filter(
    (manager) => (manager.is_active && manager.id !== user?.id) || manager.id === user?.manager_id
  );

  async function submit(form: FormData) {
    const value = (name: string) => String(form.get(name) ?? '');
    const body = {
      full_name: value('full_name'),
      role: value('role'),
      department_id: value('department_id') || null,
      start_date: value('start_date'),
      manager_id: value('manager_id') || null,
      ...(user ? {} : { email: value('email') }),
      ...(user && value('reassign_to') ? { reassign_to: value('reassign_to') } : {}),
    };

    const saved = await send(
      user
        ? { method: 'PATCH', path: `/api/v1/users/${user.id}`, body }
        : { method: 'POST', path: '/api/v1/users', body }
    );

    if (!saved) return;
    if (typeof saved.temporary_password === 'string') setTemporaryPassword(saved.temporary_password);
    else onClose();
  }

  if (temporaryPassword !== null) {
    return (
      <EntryDialog
        title="User created"
        saveLabel="Done"
        saving={false}
        message={null}
        onClose={onClose}
        onSubmit={onClose}
      >
        <p className="text-sm">
          Give this temporary password to the new user. It is shown once and cannot be retrieved again.
        </p>
        <code className="bg-muted block rounded-md px-3 py-2 font-mono text-sm break-all">
          {temporaryPassword}
        </code>
      </EntryDialog>
    );
  }

  return (
    <EntryDialog
      title={user ? 'Edit user' : 'New user'}
      saveLabel={user ? 'Save user' : 'Create user'}
      saving={saving}
      message={message}
      onClose={onClose}
      onSubmit={(form) => void submit(form)}
    >
      {user ? (
        <p className="text-muted-foreground text-sm">{user.email}</p>
      ) : (
        <DialogField name="email" label="Email" errors={fieldErrors}>
          <Input id={dialogId('email')} name="email" type="email" required maxLength={254} />
        </DialogField>
      )}

      <DialogField name="full_name" label="Full name" errors={fieldErrors}>
        <Input
          id={dialogId('full_name')}
          name="full_name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={user?.full_name}
        />
      </DialogField>

      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField name="role" label="Role" errors={fieldErrors}>
          <select
            id={dialogId('role')}
            name="role"
            defaultValue={user?.role ?? 'RECRUIT'}
            className={selectClass}
          >
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {labelize(role)}
              </option>
            ))}
          </select>
        </DialogField>

        <DialogField name="start_date" label="Start date" errors={fieldErrors}>
          <Input
            id={dialogId('start_date')}
            name="start_date"
            type="date"
            required
            defaultValue={user?.start_date ?? new Date().toISOString().slice(0, 10)}
          />
        </DialogField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField name="department_id" label="Department" errors={fieldErrors}>
          <select
            id={dialogId('department_id')}
            name="department_id"
            defaultValue={user?.department?.id ?? ''}
            className={selectClass}
          >
            <option value="">No department</option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
                {department.is_active ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
        </DialogField>

        <DialogField name="manager_id" label="Manager" errors={fieldErrors}>
          <select
            id={dialogId('manager_id')}
            name="manager_id"
            defaultValue={user?.manager_id ?? ''}
            className={selectClass}
          >
            <option value="">No manager</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.full_name}
              </option>
            ))}
          </select>
        </DialogField>
      </div>

      {user && user.role === 'MANAGER' && user.direct_reports > 0 ? (
        <DialogField
          name="reassign_to"
          label={`Move ${user.direct_reports} direct report${user.direct_reports === 1 ? '' : 's'} to`}
          errors={fieldErrors}
        >
          <select id={dialogId('reassign_to')} name="reassign_to" defaultValue="" className={selectClass}>
            <option value="">Keep reporting to {user.full_name}</option>
            {managerOptions
              .filter((manager) => manager.id !== user.id)
              .map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name}
                </option>
              ))}
          </select>
        </DialogField>
      ) : null}
    </EntryDialog>
  );
}
