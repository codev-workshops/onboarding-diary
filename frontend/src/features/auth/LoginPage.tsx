import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { login } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { AuthCard } from '../../components/AuthCard';
import { buttonClass, FormField, inputClass } from '../../components/FormField';
import { zodResolver } from '../../lib/zod-resolver';

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: LoginForm) => login(values.email, values.password),
    onSuccess: (auth) => {
      signIn(auth);
      navigate(redirectTo, { replace: true });
    },
  });

  return (
    <AuthCard title="Sign in">
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" className={inputClass} {...register('email')} />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <input id="password" type="password" className={inputClass} {...register('password')} />
        </FormField>

        {mutation.isError ? (
          <p role="alert" className="text-sm text-red-600">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : 'Sign in failed. Try again.'}
          </p>
        ) : null}

        <button type="submit" className={buttonClass} disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        New here?{' '}
        <Link to="/signup" className="underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
