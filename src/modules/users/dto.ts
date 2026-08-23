import type { Prisma, UserRole } from '@prisma/client';

/**
 * The self profile. It deliberately includes `email` because it is the actor's
 * own; the manager- and admin-facing user DTOs (C7) arrive with the user
 * endpoints in a later milestone.
 */
export type SelfProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: { id: string; name: string } | null;
  start_date: string;
  manager: { id: string; full_name: string } | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
};

/**
 * The other-user DTO (C7). It has no `email` field at all, rather than an email
 * that callers are trusted to strip: SEC-18 says managers never receive another
 * user's address, and a type that cannot express one cannot leak one. The
 * admin-facing DTO lands with the admin endpoints in M10.
 */
export type UserSummary = {
  id: string;
  full_name: string;
  role: UserRole;
  department: { id: string; name: string } | null;
  start_date: string;
  manager_id: string | null;
  is_active: boolean;
};

export const userSummarySelect = {
  id: true,
  fullName: true,
  role: true,
  startDate: true,
  managerId: true,
  isActive: true,
  department: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>;

export function toUserSummary(user: UserSummaryRow): UserSummary {
  return {
    id: user.id,
    full_name: user.fullName,
    role: user.role,
    department: user.department ? { id: user.department.id, name: user.department.name } : null,
    start_date: user.startDate.toISOString().slice(0, 10),
    manager_id: user.managerId,
    is_active: user.isActive,
  };
}

/**
 * The admin-facing DTO. It carries `email` — an administrator manages accounts
 * and cannot do it blind — which is exactly why it is a separate type from
 * `UserSummary` rather than an optional field on it: the manager-facing shape
 * still has nowhere to put one (SEC-18).
 */
export type AdminUserView = UserSummary & {
  email: string;
  manager: { id: string; full_name: string } | null;
  direct_reports: number;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
};

export const adminUserSelect = {
  ...userSummarySelect,
  email: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  manager: { select: { id: true, fullName: true } },
  _count: { select: { recruits: true } },
} satisfies Prisma.UserSelect;

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

export function toAdminUser(user: AdminUserRow): AdminUserView {
  return {
    ...toUserSummary(user),
    email: user.email,
    manager: user.manager ? { id: user.manager.id, full_name: user.manager.fullName } : null,
    direct_reports: user._count.recruits,
    must_change_password: user.mustChangePassword,
    last_login_at: user.lastLoginAt?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
  };
}

export const selfProfileSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  startDate: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, fullName: true } },
} satisfies Prisma.UserSelect;

type SelfProfileRow = Prisma.UserGetPayload<{ select: typeof selfProfileSelect }>;

export function toSelfProfile(user: SelfProfileRow): SelfProfile {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    department: user.department ? { id: user.department.id, name: user.department.name } : null,
    start_date: user.startDate.toISOString().slice(0, 10),
    manager: user.manager ? { id: user.manager.id, full_name: user.manager.fullName } : null,
    is_active: user.isActive,
    must_change_password: user.mustChangePassword,
    created_at: user.createdAt.toISOString(),
  };
}
