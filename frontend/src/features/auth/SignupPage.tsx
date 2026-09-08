import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { listDepartments, signup } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { AuthCard } from '../../components/AuthCard';
import { buttonClass, FormField, inputClass } from '../../components/FormField';
import { zodResolver } from '../../lib/zod-resolver';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name.').max(150),
  email: z.email('Enter a valid email address.'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters long.')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/[0-9]/, 'Password must contain at least one digit.'),
  departmentId: z.string(),
  startDate: z.string().min(1, 'Choose your start date.'),
});

type SignupForm = z.infer<typeof schema>;

export function SignupPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const departments = useQuery({ queryKey: ['departments'], queryFn: listDepartments });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(schema),
    defaultValues: { departmentId: '', startDate: new Date().toISOString().slice(0, 10) },
  });

  const mutation = useMutation({
    mutationFn: (values: SignupForm) =>
      signup({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        departmentId: values.departmentId === '' ? null : Number(values.departmentId),
        startDate: values.startDate,
      }),
    onSuccess: (auth) => {
      signIn(auth);
      navigate('/', { replace: true });
    },
  });

  return (
    <AuthCard title="Create your account">
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <FormField label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
          <input id="fullName" className={inputClass} {...register('fullName')} />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" className={inputClass} {...register('email')} />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <input id="password" type="password" className={inputClass} {...register('password')} />
        </FormField>

        <FormField label="Department" htmlFor="departmentId" error={errors.departmentId?.message}>
          <select id="departmentId" className={inputClass} {...register('departmentId')}>
            <option value="">Not set</option>
            {(departments.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Start date" htmlFor="startDate" error={errors.startDate?.message}>
          <input id="startDate" type="date" className={inputClass} {...register('startDate')} />
        </FormField>

        {mutation.isError ? (
          <p role="alert" className="text-sm text-red-600">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : 'Sign up failed. Try again.'}
          </p>
        ) : null}

        <button type="submit" className={buttonClass} disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
