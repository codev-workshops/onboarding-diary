/**
 * Login (T-120). A failed attempt shows one generic message whatever the cause, so the form
 * cannot be used to discover which addresses have accounts (FR-A2).
 */

import { loginBody, type LoginBody } from '@onboarding-diary/shared';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button.js';
import { Field } from '../../components/ui/Field.js';
import { Input } from '../../components/ui/Input.js';
import { ApiError } from '../../lib/apiClient.js';
import { useZodForm } from '../../lib/forms.js';
import { AuthCard } from './AuthCard.js';
import { useAuth } from './AuthContext.js';

const GENERIC_FAILURE = 'That email and password combination is not correct.';

export function LoginPage(): ReactNode {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useZodForm(loginBody, { defaultValues: { email: '', password: '' } });

  const destination = (location.state as { from?: string } | null)?.from ?? '/';
  if (status === 'authenticated') return <Navigate to={destination} replace />;

  const onSubmit = form.handleSubmit(async (values: LoginBody) => {
    setFailure(null);
    try {
      await login(values);
      void navigate(destination, { replace: true });
    } catch (error) {
      setFailure(
        error instanceof ApiError && error.status >= 500
          ? 'The service is unavailable right now. Please try again.'
          : GENERIC_FAILURE,
      );
    }
  });

  return (
    <AuthCard
      title="Log in"
      {...(failure === null ? {} : { error: failure })}
      footer={{ prompt: 'New here?', to: '/signup', label: 'Create an account' }}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
        <Field label="Email" error={form.formState.errors.email?.message} required>
          {(ids) => (
            <Input
              type="email"
              autoComplete="email"
              id={ids.id}
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('email')}
            />
          )}
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message} required>
          {(ids) => (
            <Input
              type="password"
              autoComplete="current-password"
              id={ids.id}
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('password')}
            />
          )}
        </Field>
        <Button type="submit" isLoading={form.formState.isSubmitting}>
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
