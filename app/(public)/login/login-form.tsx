'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/auth/form-error';
import { postJson } from '@/src/shared/http/client';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const result = await postJson('/api/v1/auth/login', {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    });

    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    // A full navigation, so the new session cookie is picked up by middleware
    // and every server component on the next render.
    const next = searchParams.get('next');
    router.replace(next?.startsWith('/') ? next : '/dashboard');
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <FormError message={error} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
