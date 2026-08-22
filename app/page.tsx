import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Public landing page. It states plainly which milestone the codebase is at and
 * routes visitors into the authenticated area; the real dashboard arrives in M6.
 */
const milestones = [
  { id: 'M1', title: 'Skeleton, database schema, seed data', status: 'done' as const },
  { id: 'M2', title: 'Authentication (signup, login, session cookie)', status: 'done' as const },
  { id: 'M3', title: 'Authorization module and scoped repository', status: 'next' as const },
  { id: 'M4', title: 'Task CRUD', status: 'planned' as const },
  { id: 'M5', title: 'Issues, feedback and notes', status: 'planned' as const },
  { id: 'M6', title: 'Recruit dashboard', status: 'planned' as const },
  { id: 'M7', title: 'Manager team views', status: 'planned' as const },
  { id: 'M8', title: 'Reports with CSV export', status: 'planned' as const },
  { id: 'M9', title: 'PDF export', status: 'planned' as const },
  { id: 'M10', title: 'Admin user management and hardening', status: 'planned' as const },
];

const statusLabel = {
  done: 'Complete',
  next: 'In progress',
  planned: 'Planned',
} as const;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Milestone 2
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Onboarding Diary</h1>
        <p className="text-muted-foreground text-base">
          A diary for new recruits: daily tasks, blockers, onboarding feedback and personal notes, with
          manager-scoped reporting on top.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className={buttonVariants()}>
            Sign in
          </Link>
          <Link href="/signup" className={buttonVariants({ variant: 'outline' })}>
            Create an account
          </Link>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Current status</CardTitle>
          <CardDescription>
            The skeleton, database, seed data and authentication are in place. Authorization scope and the
            diary APIs are not implemented yet — see the README for what each milestone adds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {milestones.map((milestone) => (
              <li key={milestone.id} className="flex items-center justify-between gap-4 text-sm">
                <span>
                  <span className="text-muted-foreground font-mono">{milestone.id}</span> {milestone.title}
                </span>
                <Badge variant={milestone.status === 'done' ? 'default' : 'outline'}>
                  {statusLabel[milestone.status]}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        Health probe: <code className="font-mono">GET /api/health</code>
      </p>
    </main>
  );
}
