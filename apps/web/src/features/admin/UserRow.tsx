/**
 * Per-user admin controls (T-181, T-182). The API refuses an admin's attempts to demote or
 * deactivate themselves and rejects manager cycles; those refusals are shown next to the row
 * that caused them rather than swallowed (FR-U4, FR-U7).
 */

import {
  ROLES,
  ROLE_LABELS,
  type Role,
  type UpdateUserBody,
  type UserDto,
} from '@onboarding-diary/shared';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '../../components/ui/Button.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { Select } from '../../components/ui/Select.js';
import { ApiError } from '../../lib/apiClient.js';
import { enumOptions } from '../entries/enumOptions.js';
import { useUpdateUser } from './useUsers.js';

export function UserRow({
  user,
  managers,
}: {
  user: UserDto;
  managers: readonly UserDto[];
}): ReactNode {
  const update = useUpdateUser();
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function apply(body: UpdateUserBody, onDone?: () => void): void {
    setFailure(null);
    update.mutate(
      { id: user.id, body },
      {
        onSuccess: () => onDone?.(),
        onError: (error) => {
          setFailure(
            error instanceof ApiError
              ? error.message
              : 'That change could not be saved. Please try again.',
          );
          onDone?.();
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 text-xs text-slate-600">
          <span aria-hidden="true">Role</span>
          <Select
            aria-label={`Role for ${user.fullName}`}
            options={enumOptions(ROLES, ROLE_LABELS)}
            value={user.role}
            onChange={(event) => apply({ role: event.target.value as Role })}
          />
        </div>

        <div className="flex flex-col gap-1 text-xs text-slate-600">
          <span aria-hidden="true">Manager</span>
          <Select
            aria-label={`Manager for ${user.fullName}`}
            placeholder="No manager"
            options={managers.map((manager) => ({
              value: manager.id,
              label: manager.fullName,
            }))}
            value={user.managerId ?? ''}
            onChange={(event) =>
              apply({ managerId: event.target.value === '' ? null : event.target.value })
            }
          />
        </div>

        <div className="flex items-end">
          {user.isActive ? (
            <Button
              variant="danger"
              aria-label={`Deactivate ${user.fullName}`}
              onClick={() => setConfirmingDeactivate(true)}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="secondary"
              aria-label={`Activate ${user.fullName}`}
              onClick={() => apply({ isActive: true })}
            >
              Activate
            </Button>
          )}
        </div>
      </div>

      {failure === null ? null : (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {failure}
        </p>
      )}

      <ConfirmDialog
        open={confirmingDeactivate}
        title={`Deactivate ${user.fullName}?`}
        description="They will be signed out and cannot log in until reactivated."
        confirmLabel="Deactivate"
        isConfirming={update.isPending}
        onCancel={() => setConfirmingDeactivate(false)}
        onConfirm={() => apply({ isActive: false }, () => setConfirmingDeactivate(false))}
      />
    </div>
  );
}
