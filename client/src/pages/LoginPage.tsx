import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ApiError } from '@/lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { data: config } = useAppConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo() {
    setEmail('admin@demo.local');
    setPassword('Passw0rd!');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Onboarding Diary</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" aria-label="Login form">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {config?.demoMode ? (
            <div className="mt-6 rounded-md border border-dashed border-border p-4 text-sm">
              <p className="mb-2 font-medium">Demo mode</p>
              <p className="text-muted-foreground">
                Try it with <code>admin@demo.local</code> / <code>Passw0rd!</code>
              </p>
              <Button variant="outline" size="sm" className="mt-3" type="button" onClick={fillDemo}>
                Fill demo credentials
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
