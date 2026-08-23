import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { AdminDepartmentWorkspace } from '@/components/admin/department-workspace';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { listDepartmentsForAdmin } from '@/src/modules/departments/admin-service';

export const metadata: Metadata = { title: 'Departments | Onboarding Diary' };
export const dynamic = 'force-dynamic';

/**
 * Deactivated and empty departments are both listed here: this is the screen
 * that has to show what the dashboard rollup deliberately leaves out, because
 * an admin cannot manage a department they cannot see.
 */
export default async function Page() {
  const actor = await requireCurrentUser();

  if (actor.role !== 'ADMIN') notFound();

  return <AdminDepartmentWorkspace departments={await listDepartmentsForAdmin(actor, true)} />;
}
