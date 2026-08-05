import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    department: '',
    startDate: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const { confirmPassword: _confirmPassword, ...request } = form;
      await signup(request);
      navigate('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" value={form.fullName} required onChange={(e) => update('fullName', e.target.value)} />

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} required onChange={(e) => update('email', e.target.value)} />

        <label htmlFor="department">Department</label>
        <input
          id="department"
          value={form.department}
          required
          onChange={(e) => update('department', e.target.value)}
        />

        <label htmlFor="startDate">Start date</label>
        <input
          id="startDate"
          type="date"
          value={form.startDate}
          required
          onChange={(e) => update('startDate', e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={form.password}
          required
          minLength={8}
          onChange={(e) => update('password', e.target.value)}
        />

        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          type="password"
          value={form.confirmPassword}
          required
          onChange={(e) => update('confirmPassword', e.target.value)}
        />

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
