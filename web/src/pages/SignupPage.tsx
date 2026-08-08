import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Dropdown } from '../components/Dropdown';
import { Input } from '../components/Input';
import { useAuth } from '../lib/auth';

const ROLES = [
  { value: 'recruit', label: 'New recruit' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
] as const;

export const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'recruit',
    department: '',
    startDate: new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      nextErrors.name = 'Please enter your name';
    }
    if (!form.email.trim()) {
      nextErrors.email = 'Please enter your email address';
    }
    if (form.password.length < 8) {
      nextErrors.password = 'Please use a password of at least 8 characters';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not create your account' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <Card title="Create your account">
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {errors.form ? <p className="banner banner--error">{errors.form}</p> : null}
            <Input
              label="Full name"
              placeholder="Enter your full name"
              value={form.name}
              error={errors.name}
              onChange={(event) => update('name', event.target.value)}
            />
            <Input
              label="Email address"
              type="email"
              placeholder="Enter your email address"
              value={form.email}
              error={errors.email}
              onChange={(event) => update('email', event.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Choose a password"
              hint="At least 8 characters."
              value={form.password}
              error={errors.password}
              onChange={(event) => update('password', event.target.value)}
            />
            <Dropdown
              label="Role"
              value={form.role}
              options={ROLES.map((role) => ({ value: role.value, label: role.label }))}
              onChange={(value) => update('role', value)}
            />
            <Input
              label="Department"
              placeholder="Engineering"
              value={form.department}
              onChange={(event) => update('department', event.target.value)}
            />
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(event) => update('startDate', event.target.value)}
            />
            <Button type="submit" fullWidth disabled={submitting}>
              Create account
            </Button>
            <p className="muted">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};
