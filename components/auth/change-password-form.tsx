'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { postJson } from '@/src/shared/http/client';

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const result = await postJson('/api/v1/users/me/password', {
      current_password: String(form.get('current_password') ?? ''),
      new_password: String(form.get('new_password') ?? ''),
    });

    if (!result.ok) {
      setError(result.fieldErrors.new_password ?? result.message);
      setPending(false);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <FormError message={error} />
      <div className="space-y-2">
        <Label htmlFor="current_password">Temporary password</Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new_password">New password</Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          className="h-10"
        />
        <p className="text-muted-foreground text-xs">
          At least 10 characters, with an uppercase letter, a lowercase letter and a digit.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save password'}
      </Button>
    </form>
  );
}
