import type { Metadata } from 'next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireCurrentUser } from '@/src/modules/auth/current-user';

export const metadata: Metadata = { title: 'Dashboard | Onboarding Diary' };
export const dynamic = 'force-dynamic';

/**
 * A placeholder for M7. It exists so the authenticated shell has a landing
 * destination and so the session round-trip is visible end to end.
 */
export default async function DashboardPage() {
  const user = await requireCurrentUser();

  const facts = [
    { label: 'Role', value: user.role },
    { label: 'Department', value: user.department?.name ?? 'Not set' },
    { label: 'Start date', value: user.start_date },
    { label: 'Manager', value: user.manager?.full_name ?? 'Not assigned' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.full_name}</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as {user.email}. Diary entries and summaries arrive in later milestones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>Read from the session on every request.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-muted-foreground text-xs tracking-wide uppercase">{fact.label}</dt>
                <dd className="text-sm font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
