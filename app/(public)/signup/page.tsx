import Link from 'next/link';
import type { Metadata } from 'next';

import { SignupForm } from '@/app/(public)/signup/signup-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listActiveDepartments } from '@/src/modules/departments/service';

export const metadata: Metadata = { title: 'Create account | Onboarding Diary' };
export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const departments = await listActiveDepartments();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>New recruits start their diary here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SignupForm departments={departments} />
        <p className="text-muted-foreground text-sm">
          Already have an account?{' '}
          <Link className="text-foreground font-medium underline underline-offset-4" href="/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
