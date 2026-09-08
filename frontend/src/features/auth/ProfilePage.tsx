import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { changePassword, listDepartments, updateProfile } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { buttonClass, FormField, inputClass } from '../../components/FormField';
import { zodResolver } from '../../lib/zod-resolver';

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name.').max(150),
  departmentId: z.string(),
  startDate: z.string(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z
    .string()
    .min(10, 'Password must be at least 10 characters long.')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/[0-9]/, 'Password must contain at least one digit.'),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const departments = useQuery({ queryKey: ['departments'], queryFn: listDepartments });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: user?.fullName ?? '',
      departmentId: user?.departmentId ? String(user.departmentId) : '',
      startDate: user?.startDate ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const saveProfile = useMutation({
    mutationFn: (values: ProfileForm) =>
      updateProfile({
        fullName: values.fullName,
        departmentId: values.departmentId === '' ? null : Number(values.departmentId),
        startDate: values.startDate === '' ? null : values.startDate,
      }),
    onSuccess: setUser,
  });

  const savePassword = useMutation({
    mutationFn: (values: PasswordForm) =>
      changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => passwordForm.reset(),
  });

  return (
    <section className="max-w-md space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as {user?.email} ({user?.role}).
        </p>

        <form
          className="mt-4 space-y-4"
          onSubmit={profileForm.handleSubmit((values) => saveProfile.mutate(values))}
          noValidate
        >
          <FormField
            label="Full name"
            htmlFor="fullName"
            error={profileForm.formState.errors.fullName?.message}
          >
            <input id="fullName" className={inputClass} {...profileForm.register('fullName')} />
          </FormField>

          <FormField label="Department" htmlFor="departmentId">
            <select
              id="departmentId"
              className={inputClass}
              {...profileForm.register('departmentId')}
            >
              <option value="">Not set</option>
              {(departments.data ?? []).map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </FormField>

          {user?.role === 'Recruit' ? (
            <FormField label="Start date" htmlFor="startDate">
              <input
                id="startDate"
                type="date"
                className={inputClass}
                {...profileForm.register('startDate')}
              />
            </FormField>
          ) : null}

          <FormActions
            pending={saveProfile.isPending}
            error={saveProfile.error}
            success={saveProfile.isSuccess ? 'Profile saved.' : null}
            label="Save profile"
          />
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Change password</h2>

        <form
          className="mt-4 space-y-4"
          onSubmit={passwordForm.handleSubmit((values) => savePassword.mutate(values))}
          noValidate
        >
          <FormField
            label="Current password"
            htmlFor="currentPassword"
            error={passwordForm.formState.errors.currentPassword?.message}
          >
            <input
              id="currentPassword"
              type="password"
              className={inputClass}
              {...passwordForm.register('currentPassword')}
            />
          </FormField>

          <FormField
            label="New password"
            htmlFor="newPassword"
            error={passwordForm.formState.errors.newPassword?.message}
          >
            <input
              id="newPassword"
              type="password"
              className={inputClass}
              {...passwordForm.register('newPassword')}
            />
          </FormField>

          <FormActions
            pending={savePassword.isPending}
            error={savePassword.error}
            success={savePassword.isSuccess ? 'Password changed.' : null}
            label="Change password"
          />
        </form>
      </div>
    </section>
  );
}

function FormActions({
  pending,
  error,
  success,
  label,
}: {
  pending: boolean;
  error: unknown;
  success: string | null;
  label: string;
}) {
  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error instanceof ApiError ? error.message : 'Something went wrong. Try again.'}
        </p>
      ) : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? 'Saving…' : label}
      </button>
    </div>
  );
}
