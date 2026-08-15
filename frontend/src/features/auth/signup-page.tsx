import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Link as MuiLink, Paper, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getErrorMessage } from '../../shared/api/api-client';
import { todayIso } from '../../shared/lib/format';
import { useSignup } from './api';
import { useAuth } from './auth-context';

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(150),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  department: z.string().max(100).optional(),
  startDate: z.string().min(1, 'Start date is required'),
});

type FormValues = z.infer<typeof schema>;

export function SignupPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const signup = useSignup();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', department: '', startDate: todayIso() },
  });

  const onSubmit = handleSubmit((values) => {
    signup.mutate(values, {
      onSuccess: (response) => {
        signIn(response);
        navigate('/', { replace: true });
      },
    });
  });

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 460 }} component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Typography variant="h5" component="h1">
            Create your diary
          </Typography>
          {signup.isError ? <Alert severity="error">{getErrorMessage(signup.error)}</Alert> : null}
          <TextField
            label="Full name"
            {...register('fullName')}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName?.message}
          />
          <TextField
            label="Email"
            type="email"
            {...register('email')}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
          />
          <TextField label="Department" {...register('department')} />
          <TextField
            label="Start date"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('startDate')}
            error={Boolean(errors.startDate)}
            helperText={errors.startDate?.message}
          />
          <Button type="submit" variant="contained" disabled={signup.isPending}>
            {signup.isPending ? 'Creating…' : 'Sign up'}
          </Button>
          <Typography variant="body2">
            Already registered?{' '}
            <MuiLink component={Link} to="/login">
              Sign in
            </MuiLink>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
