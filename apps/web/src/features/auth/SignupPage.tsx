/**
 * Signup (T-121). A duplicate address comes back as a 409 rather than a 422, so it is mapped
 * onto the email field explicitly instead of through `applyServerErrors` (FR-A1).
 */

import { PASSWORD_MIN_LENGTH, signupBody, type SignupBody } from '@onboarding-diary/shared';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button.js';
import { Field } from '../../components/ui/Field.js';
import { Input } from '../../components/ui/Input.js';
import { ApiError } from '../../lib/apiClient.js';
import { applyServerErrors, useZodForm } from '../../lib/forms.js';
import { AuthCard } from './AuthCard.js';
import { useAuth } from './AuthContext.js';

export function SignupPage(): ReactNode {
  const { status, signup } = useAuth();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useZodForm(signupBody, {
    defaultValues: { fullName: '', email: '', password: '' },
  });

  if (status === 'authenticated') return <Navigate to="/" replace />;

  const onSubmit = form.handleSubmit(async (values: SignupBody) => {
    setFailure(null);
    try {
      await signup(values);
      // A new account has no department or start date yet, so the profile prompt follows.
      void navigate('/profile?welcome=1', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_EXISTS') {
        form.setError('email', { type: 'server', message: 'That email is already registered.' });
        return;
      }
      if (!applyServerErrors(error, form.setError, ['fullName', 'email', 'password'])) {
        setFailure('We could not create your account. Please try again.');
      }
    }
  });

  return (
    <AuthCard
      title="Create your account"
      {...(failure === null ? {} : { error: failure })}
      footer={{ prompt: 'Already have an account?', to: '/login', label: 'Log in' }}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
        <Field label="Full name" error={form.formState.errors.fullName?.message} required>
          {(ids) => (
            <Input
              autoComplete="name"
              id={ids.id}
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('fullName')}
            />
          )}
        </Field>
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
        <Field
          label="Password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          error={form.formState.errors.password?.message}
          required
        >
          {(ids) => (
            <Input
              type="password"
              autoComplete="new-password"
              id={ids.id}
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('password')}
            />
          )}
        </Field>
        {form.formState.errors.root === undefined ? null : (
          <p className="text-sm text-red-800" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" isLoading={form.formState.isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
