import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDemoCredentials } from '@/hooks/data';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ApiError } from '@/lib/api';
import { landingPathFor } from '@/lib/roles';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { data: config } = useAppConfig();
  const demoEnabled = config?.onboardingEnablersEnabled ?? false;
  const { data: demo } = useDemoCredentials(demoEnabled);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(landingPathFor(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    if (demo) setPassword(demo.password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className={demoEnabled ? 'w-full max-w-lg' : 'w-full max-w-md'}>
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

          {demoEnabled && demo ? (
            <div
              className="mt-6 rounded-md border border-dashed border-border p-4 text-sm"
              data-tour="demo-credentials"
            >
              <p className="mb-1 font-medium">Demo mode — pre-provisioned accounts</p>
              <p className="text-muted-foreground">
                This is seeded demo data. Every account uses the password{' '}
                <code>{demo.password}</code>. Pick one to sign in:
              </p>
              <ul className="mt-3 space-y-1">
                {demo.accounts.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      onClick={() => fillDemo(account.email)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                    >
                      <span className="truncate">
                        <span className="font-medium">{account.name}</span>{' '}
                        <span className="text-muted-foreground">· {account.email}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Badge tone="primary">{account.role}</Badge>
                        <Badge tone="neutral">{account.department}</Badge>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Departments: {demo.departments.join(', ')}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
