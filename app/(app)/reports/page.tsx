import type { Metadata } from 'next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireCurrentUser } from '@/src/modules/auth/current-user';

export const metadata: Metadata = { title: 'Reports | Onboarding Diary' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await requireCurrentUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
        <CardDescription>Date-bounded exports of your diary.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Arrives in M8. Signed in as {user.full_name}.
      </CardContent>
    </Card>
  );
}
