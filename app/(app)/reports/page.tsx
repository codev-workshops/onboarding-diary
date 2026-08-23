import type { Metadata } from 'next';

import { ReportBuilder } from '@/components/reports/report-builder';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { listActiveDepartments } from '@/src/modules/departments/service';
import { listVisibleUsers } from '@/src/modules/users/service';

export const metadata: Metadata = { title: 'Reports | Onboarding Diary' };
export const dynamic = 'force-dynamic';

/**
 * The builder needs two lists a recruit may not have: the users they can report
 * on, and (for an admin) the departments. Both come from the scoped directory
 * services, so the options a manager sees are exactly the users the API would
 * accept from them — and a hand-crafted request naming anybody else is still
 * refused server-side.
 */
export default async function Page() {
  const actor = await requireCurrentUser();
  const canChooseUsers = actor.role !== 'RECRUIT';

  const [users, departments] = await Promise.all([
    canChooseUsers ? listVisibleUsers(actor) : Promise.resolve([]),
    actor.role === 'ADMIN' ? listActiveDepartments() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Date-bounded reports over the diary entries you are allowed to read.
        </p>
      </div>

      <ReportBuilder
        role={actor.role}
        self={{ id: actor.id, full_name: actor.full_name }}
        users={users
          .filter((user) => user.id !== actor.id)
          .map((user) => ({ id: user.id, full_name: user.full_name, role: user.role }))}
        departments={departments}
      />
    </div>
  );
}
