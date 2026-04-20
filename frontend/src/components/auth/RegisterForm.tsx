import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Link as MuiLink } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Link, useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

export default function RegisterForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    department: '',
    startDate: dayjs().format('YYYY-MM-DD'),
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.register(form);
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
      setError(msg || 'Registration failed. Please try again.');
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
      <TextField label="Full Name" fullWidth required value={form.name} onChange={handleChange('name')} sx={{ mb: 2 }} />
      <TextField label="Email" type="email" fullWidth required value={form.email} onChange={handleChange('email')} sx={{ mb: 2 }} />
      <TextField label="Password" type="password" fullWidth required value={form.password} onChange={handleChange('password')} sx={{ mb: 2 }} />
      <TextField
        label="Confirm Password"
        type="password"
        fullWidth
        required
        value={form.confirmPassword}
        onChange={handleChange('confirmPassword')}
        sx={{ mb: 2 }}
      />
      <TextField label="Department" fullWidth required value={form.department} onChange={handleChange('department')} sx={{ mb: 2 }} />
      <DatePicker
        label="Start Date"
        value={dayjs(form.startDate)}
        onChange={(val: Dayjs | null) =>
          setForm((prev) => ({ ...prev, startDate: val?.format('YYYY-MM-DD') || prev.startDate }))
        }
        slotProps={{ textField: { fullWidth: true, sx: { mb: 3 } } }}
      />
      <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
        {loading ? 'Creating account...' : 'Register'}
      </Button>
      <Typography variant="body2" align="center" sx={{ mt: 2 }}>
        Already have an account?{' '}
        <MuiLink component={Link} to="/login">
          Sign In
        </MuiLink>
      </Typography>
    </Box>
  );
}
