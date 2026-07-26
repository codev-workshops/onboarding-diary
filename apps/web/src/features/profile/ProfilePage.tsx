/**
 * Profile (T-122). Reached with `?welcome=1` straight after signup, where it also shows the
 * skippable completion prompt; email and role are not editable here by design (FR-A6).
 */

import {
  calendarDate,
  ROLE_LABELS,
  updateOwnProfileBody,
  type UpdateOwnProfileBody,
  type UserDto,
} from '@onboarding-diary/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { queryKeys } from '../../app/queryKeys.js';
import { Button } from '../../components/ui/Button.js';
import { Field } from '../../components/ui/Field.js';
import { DateInput, Input } from '../../components/ui/Input.js';
import { useApiClient } from '../../lib/ApiClientContext.js';
import { applyServerErrors, useZodForm } from '../../lib/forms.js';
import { useAuth } from '../auth/AuthContext.js';

const FIELDS = ['fullName', 'department', 'startDate'] as const;

// A date input reports an unset value as `''`, which the API models as "no start date".
const profileFormSchema = updateOwnProfileBody.extend({
  startDate: z
    .literal('')
    .or(calendarDate)
    .transform((value) => (value === '' ? null : value)),
});

export function ProfilePage(): ReactNode {
  const { user, setUser } = useAuth();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saved, setSaved] = useState(false);

  const showPrompt = searchParams.get('welcome') === '1';

  const form = useZodForm(profileFormSchema, {
    defaultValues: {
      fullName: user?.fullName ?? '',
      department: user?.department ?? '',
      startDate: user?.startDate ?? '',
    },
  });

  // The profile can render before the session is restored, so the form is seeded again once
  // the current user is known.
  const { reset } = form;
  useEffect(() => {
    if (user === null) return;
    reset({
      fullName: user.fullName,
      department: user.department ?? '',
      startDate: user.startDate ?? '',
    });
  }, [reset, user]);

  const save = useMutation({
    mutationFn: async (body: UpdateOwnProfileBody) => {
      const response = await client.patch<{ data: UserDto }>('/users/me', body);
      return response.data;
    },
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(queryKeys.me, updated);
      setSaved(true);
    },
  });

  const onSubmit = form.handleSubmit(async (values: UpdateOwnProfileBody) => {
    setSaved(false);
    try {
      await save.mutateAsync(values);
    } catch (error) {
      if (!applyServerErrors(error, form.setError, [...FIELDS])) throw error;
    }
  });

  function skipPrompt(): void {
    setSearchParams(new URLSearchParams());
    void navigate('/', { replace: true });
  }

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Your profile</h1>

      {showPrompt ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-medium text-sky-900">Finish setting up your profile</p>
          <p className="mt-1 text-sm text-sky-800">
            Adding your department and start date helps your manager follow your onboarding. You can
            do this later.
          </p>
          <Button className="mt-3" variant="secondary" onClick={skipPrompt}>
            Skip for now
          </Button>
        </div>
      ) : null}

      <dl className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Email</dt>
          <dd className="font-medium text-slate-900">{user?.email}</dd>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <dt className="text-slate-600">Role</dt>
          <dd className="font-medium text-slate-900">
            {user === null ? null : ROLE_LABELS[user.role]}
          </dd>
        </div>
      </dl>

      <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
        <Field label="Full name" error={form.formState.errors.fullName?.message} required>
          {(ids) => (
            <Input
              id={ids.id}
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('fullName')}
            />
          )}
        </Field>
        <Field label="Department" error={form.formState.errors.department?.message}>
          {(ids) => (
            <Input
              id={ids.id}
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('department')}
            />
          )}
        </Field>
        <Field label="Start date" error={form.formState.errors.startDate?.message}>
          {(ids) => (
            <DateInput
              id={ids.id}
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('startDate')}
            />
          )}
        </Field>
        {form.formState.errors.root === undefined ? null : (
          <p className="text-sm text-red-800" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={save.isPending}>
            Save changes
          </Button>
          {saved ? (
            <p className="text-sm text-emerald-700" role="status">
              Profile saved
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
