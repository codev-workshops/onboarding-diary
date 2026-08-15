import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Link as MuiLink, Paper, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getErrorMessage } from '../../shared/api/api-client';
import { useLogin } from './api';
import { useAuth } from './auth-context';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (response) => {
        signIn(response);
        navigate('/', { replace: true });
      },
    });
  });

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }} component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Typography variant="h5" component="h1">
            Sign in
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Onboarding Diary
          </Typography>
          {login.isError ? <Alert severity="error">{getErrorMessage(login.error)}</Alert> : null}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
          />
          <Button type="submit" variant="contained" disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
          <Typography variant="body2">
            No account yet?{' '}
            <MuiLink component={Link} to="/signup">
              Create one
            </MuiLink>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
