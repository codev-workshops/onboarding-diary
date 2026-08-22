import type { UserRole } from '@prisma/client';

/**
 * A role summary the client uses to decide what to render. It is a convenience,
 * never a control: every endpoint re-derives the same facts server-side (S3).
 */
export type Permissions = {
  can_view_team: boolean;
  can_manage_users: boolean;
  can_report_on_others: boolean;
};

export function permissionsFor(role: UserRole): Permissions {
  return {
    can_view_team: role === 'MANAGER' || role === 'ADMIN',
    can_manage_users: role === 'ADMIN',
    can_report_on_others: role === 'MANAGER' || role === 'ADMIN',
  };
}
