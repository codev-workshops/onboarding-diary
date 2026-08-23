import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { AdminUserWorkspace } from '@/components/admin/user-workspace';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { listDepartmentsForAdmin } from '@/src/modules/departments/admin-service';
import { adminUserListQuerySchema } from '@/src/modules/users/admin-schemas';
import { listUsersForAdmin } from '@/src/modules/users/admin-service';
import { parseSearchParams } from '@/src/modules/entries/schemas';

export const metadata: Metadata = { title: 'Users | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The page renders through the same services the API uses, so the admin-only
 * check that guards the data is the service's `assertRole`; the `notFound()`
 * here only spares a non-admin the 403 page for a link they should not see.
 */
export default async function Page({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();

  if (actor.role !== 'ADMIN') notFound();

  const query = parseSearchParams(adminUserListQuerySchema, await searchParams);
  const [users, departments] = await Promise.all([
    listUsersForAdmin(actor, query),
    listDepartmentsForAdmin(actor, true),
  ]);

  return <AdminUserWorkspace users={users} departments={departments} />;
}
