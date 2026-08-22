'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/auth/form-error';
import { postJson } from '@/src/shared/http/client';
import type { DepartmentOption } from '@/src/modules/departments/service';

export function SignupForm({ departments }: { departments: DepartmentOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    const form = new FormData(event.currentTarget);
    const departmentId = String(form.get('department_id') ?? '');

    const result = await postJson('/api/v1/auth/signup', {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      full_name: String(form.get('full_name') ?? ''),
      start_date: String(form.get('start_date') ?? ''),
      ...(departmentId ? { department_id: departmentId } : {}),
    });

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors);
      setPending(false);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  const fieldClass = 'h-10';

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <FormError message={error} />
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required className={fieldClass} autoComplete="name" />
        <FieldError message={fieldErrors.full_name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required className={fieldClass} autoComplete="email" />
        <FieldError message={fieldErrors.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          className={fieldClass}
          autoComplete="new-password"
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-muted-foreground text-xs">
          At least 10 characters, with an uppercase letter, a lowercase letter and a digit.
        </p>
        <FieldError message={fieldErrors.password} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="start_date">Start date</Label>
        <Input id="start_date" name="start_date" type="date" required className={fieldClass} />
        <FieldError message={fieldErrors.start_date} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department_id">Department (optional)</Label>
        <select
          id="department_id"
          name="department_id"
          defaultValue=""
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
        >
          <option value="">Not sure yet</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors.department_id} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}
