import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Link as MuiLink } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

export default function LoginForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      login(res.token, {
        id: res.id,
        email: res.email,
        name: res.name,
        role: res.role,
        active: true,
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TextField
        label="Email"
        type="email"
        fullWidth
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Password"
        type="password"
        fullWidth
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 3 }}
      />
      <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
      <Typography variant="body2" align="center" sx={{ mt: 2 }}>
        Don&apos;t have an account?{' '}
        <MuiLink component={Link} to="/register">
          Register
        </MuiLink>
      </Typography>
    </Box>
  );
}
