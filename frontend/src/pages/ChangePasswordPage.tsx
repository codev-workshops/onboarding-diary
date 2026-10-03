import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { changePassword, fetchCurrentUser } from '../api/auth';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/useAuth';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import {
  PASSWORD_RULE_MESSAGE,
  changePasswordSchema,
  type ChangePasswordValues,
} from '../validation/schemas';

export function ChangePasswordPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordValues) => {
    setServerError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      setUser(await fetchCurrentUser());
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not change password'));
    }
  };

  return (
    <AuthCard
      title="Change your password"
      subtitle={
        user?.mustChangePassword
          ? 'You signed in with a temporary password. Choose a new one to continue.'
          : undefined
      }
    >
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} mt={2}>
        {serverError && <Alert severity="error">{serverError}</Alert>}
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          {...register('currentPassword')}
          error={!!errors.currentPassword}
          helperText={errors.currentPassword?.message}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          {...register('newPassword')}
          error={!!errors.newPassword}
          helperText={errors.newPassword?.message ?? PASSWORD_RULE_MESSAGE}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isSubmitting}
          sx={{ mt: 2 }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Update password'}
        </Button>
        {!user?.mustChangePassword && (
          <Button fullWidth sx={{ mt: 1 }} onClick={() => navigate(-1)}>
            Cancel
          </Button>
        )}
      </Box>
    </AuthCard>
  );
}
