import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { homePathFor, useAuth } from '../auth/AuthContext';
import type { SignupInput } from '../auth/AuthContext';
import Alert from '../components/Alert';
import Field from '../components/Field';
import { today } from '../dates';

const PASSWORD_HINT = 'At least 8 characters, including a letter and a digit.';

export default function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupInput>({
    name: '',
    email: '',
    password: '',
    department: '',
    startDate: today(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  const update = (field: keyof SignupInput) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setError(null);
    setSubmitting(true);
    try {
      await signup(form);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldMap());
        setError(e.fieldErrors.length ? 'Please fix the highlighted fields.' : e.message);
      } else {
        setError('Sign up failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Create your account</h1>
        <p className="muted">Start documenting your onboarding journey.</p>
        <Alert>{error}</Alert>
        <Field label="Full name" htmlFor="name" error={errors.name} required>
          <input
            id="name"
            value={form.name}
            maxLength={100}
            autoComplete="name"
            onChange={(e) => update('name')(e.target.value)}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email} required>
          <input
            id="email"
            type="email"
            value={form.email}
            maxLength={254}
            autoComplete="email"
            onChange={(e) => update('email')(e.target.value)}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          hint={PASSWORD_HINT}
          required
        >
          <input
            id="password"
            type="password"
            value={form.password}
            autoComplete="new-password"
            onChange={(e) => update('password')(e.target.value)}
          />
        </Field>
        <Field label="Department" htmlFor="department" error={errors.department}>
          <input
            id="department"
            value={form.department}
            maxLength={100}
            onChange={(e) => update('department')(e.target.value)}
          />
        </Field>
        <Field label="Start date" htmlFor="startDate" error={errors.startDate} required>
          <input
            id="startDate"
            type="date"
            value={form.startDate}
            onChange={(e) => update('startDate')(e.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
        <p className="muted center">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
