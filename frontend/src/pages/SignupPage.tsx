import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  LinearProgress,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, Link as RouterLink, useNavigate } from 'react-router-dom';
import { getErrorMessage, getFieldErrors } from '../api/errors';
import { useAuth } from '../auth/useAuth';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import {
  PASSWORD_RULE_MESSAGE,
  passwordStrength,
  signupSchema,
  type SignupValues,
} from '../validation/schemas';

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['error', 'error', 'warning', 'info', 'success'] as const;

export function SignupPage() {
  const { signup, status } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  const strength = passwordStrength(watch('password') ?? '');

  const onSubmit = async (values: SignupValues) => {
    setServerError(null);
    try {
      await signup({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        jobTitle: values.jobTitle || undefined,
        department: values.department,
        startDate: values.startDate,
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      getFieldErrors(error).forEach(({ field, message }) =>
        setError(field as keyof SignupValues, { message }),
      );
      setServerError(getErrorMessage(error, 'Sign-up failed'));
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start documenting your onboarding journey"
      maxWidth={560}
    >
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
          required
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <Grid container columnSpacing={2}>
          <Grid item xs={12} sm={6}>
            <PasswordField
              label="Password"
              autoComplete="new-password"
              required
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message ?? PASSWORD_RULE_MESSAGE}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <PasswordField
              label="Confirm password"
              autoComplete="new-password"
              required
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />
          </Grid>
        </Grid>
        <Box display="flex" alignItems="center" gap={1}>
          <LinearProgress
            variant="determinate"
            value={strength * 25}
            color={STRENGTH_COLORS[strength]}
            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
            aria-label="Password strength"
          />
          <Typography variant="caption" minWidth={56}>
            {STRENGTH_LABELS[strength]}
          </Typography>
        </Box>
        <TextField
          label="Full name"
          autoComplete="name"
          required
          {...register('fullName')}
          error={!!errors.fullName}
          helperText={errors.fullName?.message}
        />
        <Grid container columnSpacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Role / job title"
              {...register('jobTitle')}
              error={!!errors.jobTitle}
              helperText={errors.jobTitle?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Department"
              required
              {...register('department')}
              error={!!errors.department}
              helperText={errors.department?.message}
            />
          </Grid>
        </Grid>
        <TextField
          label="Start date"
          type="date"
          required
          InputLabelProps={{ shrink: true }}
          {...register('startDate')}
          error={!!errors.startDate}
          helperText={errors.startDate?.message}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isSubmitting}
          sx={{ mt: 2 }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create account'}
        </Button>
        <Typography variant="body2" textAlign="center" mt={2}>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login">
            Log in
          </Link>
        </Typography>
      </Box>
    </AuthCard>
  );
}
