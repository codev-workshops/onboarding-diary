import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AdminUser, CreateUserPayload, UpdateUserPayload } from '../../api/admin';
import { userRoles } from '../../api/admin';
import type { Department } from '../../api/auth';
import { buttonClass, FormField, inputClass } from '../../components/FormField';
import { Modal, ServerErrors } from '../../components/Modal';
import { zodResolver } from '../../lib/zod-resolver';

const userSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string(),
  fullName: z.string().trim().min(2, 'Enter the full name.').max(150),
  role: z.enum(userRoles),
  departmentId: z.string(),
  managerId: z.string(),
  startDate: z.string(),
  isActive: z.boolean(),
});

type UserForm = z.infer<typeof userSchema>;

const optionalId = (value: string): number | null => (value === '' ? null : Number(value));

export function AdminUserDialog({
  user,
  departments,
  managers,
  pending,
  error,
  onCreate,
  onUpdate,
  onClose,
}: {
  user: AdminUser | null;
  departments: Department[];
  managers: AdminUser[];
  pending: boolean;
  error: unknown;
  onCreate: (payload: CreateUserPayload) => void;
  onUpdate: (payload: UpdateUserPayload) => void;
  onClose: () => void;
}) {
  const form = useForm<UserForm>({
    resolver: zodResolver(
      user === null
        ? userSchema.extend({
            password: z.string().min(8, 'Password must be at least 8 characters.'),
          })
        : userSchema
    ),
    defaultValues: {
      email: user?.email ?? '',
      password: '',
      fullName: user?.fullName ?? '',
      role: user?.role ?? 'Recruit',
      departmentId: user?.departmentId === undefined ? '' : String(user?.departmentId ?? ''),
      managerId: user?.managerId === undefined ? '' : String(user?.managerId ?? ''),
      startDate: user?.startDate ?? '',
      isActive: user?.isActive ?? true,
    },
  });

  const role = form.watch('role');

  const submit = (values: UserForm) => {
    const shared = {
      fullName: values.fullName,
      role: values.role,
      departmentId: optionalId(values.departmentId),
      managerId: values.role === 'Recruit' ? optionalId(values.managerId) : null,
      startDate: values.role === 'Recruit' && values.startDate !== '' ? values.startDate : null,
    };

    if (user === null) {
      onCreate({ ...shared, email: values.email, password: values.password });
      return;
    }

    onUpdate({ ...shared, isActive: values.isActive });
  };

  return (
    <Modal
      title={user ? `Edit ${user.fullName}` : 'New user'}
      titleId="admin-user-dialog-title"
      onClose={onClose}
    >
      <form className="mt-4 space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
        {user === null ? (
          <>
            <FormField
              label="Email"
              htmlFor="admin-email"
              error={form.formState.errors.email?.message}
            >
              <input id="admin-email" className={inputClass} {...form.register('email')} />
            </FormField>

            <FormField
              label="Initial password"
              htmlFor="admin-password"
              error={form.formState.errors.password?.message}
            >
              <input
                id="admin-password"
                type="password"
                className={inputClass}
                {...form.register('password')}
              />
            </FormField>
          </>
        ) : null}

        <FormField
          label="Full name"
          htmlFor="admin-fullName"
          error={form.formState.errors.fullName?.message}
        >
          <input id="admin-fullName" className={inputClass} {...form.register('fullName')} />
        </FormField>

        <FormField label="Role" htmlFor="admin-role">
          <select id="admin-role" className={inputClass} {...form.register('role')}>
            {userRoles.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Department" htmlFor="admin-departmentId">
          <select id="admin-departmentId" className={inputClass} {...form.register('departmentId')}>
            <option value="">None</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </FormField>

        {role === 'Recruit' ? (
          <>
            <FormField label="Manager" htmlFor="admin-managerId">
              <select id="admin-managerId" className={inputClass} {...form.register('managerId')}>
                <option value="">Unassigned</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Start date" htmlFor="admin-startDate">
              <input
                id="admin-startDate"
                type="date"
                className={inputClass}
                {...form.register('startDate')}
              />
            </FormField>
          </>
        ) : (
          <p className="text-xs text-slate-500">Only recruits have a manager and a start date.</p>
        )}

        {user === null ? null : (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} />
            Active — inactive users cannot sign in
          </label>
        )}

        <ServerErrors error={error} />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className={buttonClass} disabled={pending}>
            {pending ? 'Saving…' : 'Save user'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
