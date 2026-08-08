import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useAuth } from '../lib/auth';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const nextErrors: typeof errors = {};
    if (!email.trim()) {
      nextErrors.email = 'Please enter your email address';
    }
    if (!password) {
      nextErrors.password = 'Please enter your password';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not sign you in' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <Card title="Sign in">
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <p className="muted">
              Welcome back — pick up your onboarding diary where you left off.
            </p>
            {errors.form ? <p className="banner banner--error">{errors.form}</p> : null}
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={email}
              error={errors.email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              error={errors.password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" fullWidth disabled={submitting}>
              Sign in
            </Button>
            <p className="muted">
              New here? <Link to="/signup">Create an account</Link>
            </p>
            <p className="caption">Demo account: recruit@example.com · password123</p>
          </form>
        </Card>
      </div>
    </div>
  );
};
