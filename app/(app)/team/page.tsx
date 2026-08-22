import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireCurrentUser } from '@/src/modules/auth/current-user';

export const metadata: Metadata = { title: 'Team | Onboarding Diary' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await requireCurrentUser();

  if (user.role !== 'MANAGER' && user.role !== 'ADMIN') notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>Recruits you oversee.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Arrives in M4. Signed in as {user.full_name}.
      </CardContent>
    </Card>
  );
}
