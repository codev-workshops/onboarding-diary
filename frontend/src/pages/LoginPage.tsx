import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, CircularProgress, Link, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/useAuth';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import { loginSchema, type LoginValues } from '../validation/schemas';

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      navigate(user.mustChangePassword ? '/change-password' : redirectTo, { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error, 'Login failed'));
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Log in to continue your onboarding diary">
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} mt={2}>
        {serverError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {serverError}
          </Alert>
        )}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isSubmitting}
          sx={{ mt: 2 }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Log in'}
        </Button>
        <Typography variant="body2" textAlign="center" mt={2}>
          New here?{' '}
          <Link component={RouterLink} to="/signup">
            Create an account
          </Link>
        </Typography>
      </Box>
    </AuthCard>
  );
}
