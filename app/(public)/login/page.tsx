import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';

import { LoginForm } from '@/app/(public)/login/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Sign in | Onboarding Diary' };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Continue your onboarding diary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="text-muted-foreground text-sm">
          New here?{' '}
          <Link className="text-foreground font-medium underline underline-offset-4" href="/signup">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
