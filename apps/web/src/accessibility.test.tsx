/**
 * Automated accessibility assertions across the key screens (T-191). Rendering each page inside
 * the shell means the checks cover the real landmark structure, heading order, and form labels a
 * user meets, not isolated components. The manual contrast and 360/768/1280 px review lives in
 * docs/ACCESSIBILITY.md, because jsdom has no layout.
 */

import type { UserDto } from '@onboarding-diary/shared';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it } from 'vitest';

import { AppLayout } from './app/AppLayout.js';
import { AdminUsersPage } from './features/admin/AdminUsersPage.js';
import { LoginPage } from './features/auth/LoginPage.js';
import { SignupPage } from './features/auth/SignupPage.js';
import { DashboardPage } from './features/dashboard/DashboardPage.js';
import { FeedbackPage } from './features/feedback/FeedbackPage.js';
import { IssuesPage } from './features/issues/IssuesPage.js';
import { NotesPage } from './features/notes/NotesPage.js';
import { ProfilePage } from './features/profile/ProfilePage.js';
import { ReportsPage } from './features/reports/ReportsPage.js';
import { TasksPage } from './features/tasks/TasksPage.js';
import { TeamPage } from './features/team/TeamPage.js';
import { expectNoAxeViolations } from './test/axe.js';
import { ADMIN_DASHBOARD, dashboardFixture, DIRECT_REPORTS } from './test/dashboardFixtures.js';
import {
  ADMIN,
  fakeClient,
  feedbackFixture,
  issueFixture,
  MANAGER,
  noteFixture,
  page,
  RECRUIT,
  taskFixture,
  userFixture,
} from './test/fakeClient.js';
import type { FakeClient } from './test/fakeClient.js';
import { renderWithProviders } from './test/render.js';

/** Every screen under test reads from this one handler set, keyed by path. */
const RESPONSES: Record<string, unknown> = {
  '/tasks': page([taskFixture()]),
  '/issues': page([issueFixture({ status: 'RESOLVED', resolutionNotes: 'New adapter shipped' })]),
  '/feedback': page([feedbackFixture()]),
  '/notes': page([noteFixture()]),
  '/users': page([userFixture(), MANAGER, ADMIN]),
  '/dashboard': { data: dashboardFixture() },
  '/dashboard/admin': { data: ADMIN_DASHBOARD },
  '/users/me/direct-reports': { data: DIRECT_REPORTS },
};

function client(session = RECRUIT): FakeClient {
  return fakeClient({ session, handlers: { get: (path) => RESPONSES[path] } });
}

/** Waits for the page's own heading so axe never runs against a loading skeleton. */
async function auditScreen(
  ui: ReactNode,
  options: { heading: RegExp; route?: string; session?: UserDto },
): Promise<void> {
  const { heading, route = '/', session = RECRUIT } = options;
  const { container } = renderWithProviders(ui, { client: client(session), route });
  await screen.findByRole('heading', { name: heading, level: 1 });
  await expectNoAxeViolations(container);
}

describe('accessibility', () => {
  it('has no violations on the login screen', async () => {
    const { container } = renderWithProviders(<LoginPage />, {
      client: fakeClient(),
      route: '/login',
    });
    await screen.findByRole('heading', { name: 'Log in' });
    await expectNoAxeViolations(container);
  });

  it('has no violations on the signup screen', async () => {
    const { container } = renderWithProviders(<SignupPage />, {
      client: fakeClient(),
      route: '/signup',
    });
    await screen.findByRole('heading', { name: 'Create your account' });
    await expectNoAxeViolations(container);
  });

  it('has no violations on the app shell', async () => {
    const { container } = renderWithProviders(<AppLayout />, { client: client() });
    await screen.findByRole('navigation', { name: 'Main' });
    await expectNoAxeViolations(container);
  });

  it('has no violations on the recruit dashboard', async () => {
    await auditScreen(<DashboardPage />, { heading: /Welcome/ });
  });

  it('has no violations on the task log', async () => {
    await auditScreen(<TasksPage />, { heading: /Task log/, route: '/tasks' });
  });

  it('has no violations on the issue log', async () => {
    await auditScreen(<IssuesPage />, { heading: /Issue log/, route: '/issues' });
  });

  it('has no violations on the feedback list', async () => {
    await auditScreen(<FeedbackPage />, { heading: /Feedback/, route: '/feedback' });
  });

  it('has no violations on the notes list', async () => {
    await auditScreen(<NotesPage />, { heading: /Notes/, route: '/notes' });
  });

  it('has no violations on the report builder', async () => {
    await auditScreen(<ReportsPage />, { heading: /Reports/, route: '/reports' });
  });

  it('has no violations on the profile form', async () => {
    await auditScreen(<ProfilePage />, { heading: /profile/i, route: '/profile' });
  });

  it('has no violations on the manager team list', async () => {
    await auditScreen(<TeamPage />, { heading: /team/i, route: '/team', session: MANAGER });
  });

  it('has no violations on the admin user list', async () => {
    await auditScreen(<AdminUsersPage />, {
      heading: /Users/,
      route: '/admin/users',
      session: ADMIN,
    });
  });
});
