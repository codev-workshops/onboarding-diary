import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { updateProfile } from '../api/auth';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/useAuth';
import { profileSchema, type ProfileValues } from '../validation/schemas';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.profile.fullName ?? '',
      jobTitle: user?.profile.jobTitle ?? '',
      department: user?.profile.department ?? '',
      startDate: user?.profile.startDate ?? '',
    },
  });

  if (!user) return null;

  const onSubmit = async ({ jobTitle, ...values }: ProfileValues) => {
    setServerError(null);
    try {
      const updated = await updateProfile({ ...values, jobTitle: jobTitle || undefined });
      setUser(updated);
      reset({
        fullName: updated.profile.fullName,
        jobTitle: updated.profile.jobTitle ?? '',
        department: updated.profile.department,
        startDate: updated.profile.startDate,
      });
      setSaved(true);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not save profile'));
    }
  };

  return (
    <Box maxWidth={720}>
      <Typography variant="h5" component="h1" fontWeight={600} mb={2}>
        My profile
      </Typography>
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={1} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
            {user.roles.map((role) => (
              <Chip key={role} label={role} size="small" color="primary" variant="outlined" />
            ))}
          </Stack>
          {user.profile.managerEmail && (
            <Typography variant="body2" color="text.secondary">
              Manager: {user.profile.managerEmail}
            </Typography>
          )}
          <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} mt={1}>
            {serverError && <Alert severity="error">{serverError}</Alert>}
            <TextField
              label="Full name"
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={2}>
              <Button type="submit" variant="contained" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Save changes'}
              </Button>
              <Button component={RouterLink} to="/change-password">
                Change password
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        message="Profile saved"
      />
    </Box>
  );
}
