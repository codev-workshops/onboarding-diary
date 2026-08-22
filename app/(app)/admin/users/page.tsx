import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireCurrentUser } from '@/src/modules/auth/current-user';

export const metadata: Metadata = { title: 'Users | Onboarding Diary' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await requireCurrentUser();

  if (user.role !== 'ADMIN') notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage users, roles and departments.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Arrives in M10. Signed in as {user.full_name}.
      </CardContent>
    </Card>
  );
}
