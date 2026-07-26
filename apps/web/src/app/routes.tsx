/**
 * Route table (T-110/T-113). Pages land in Epics 12–17; until then the protected routes
 * render a placeholder so the shell, the guards, and the navigation are testable.
 */

import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppLayout } from './AppLayout.js';
import { NotFoundPage } from './NotFoundPage.js';
import { RequireAuth, RequireRole } from './RequireAuth.js';

function Placeholder({ title }: { title: string }): ReactNode {
  return (
    <section>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-600">This page is not built yet.</p>
    </section>
  );
}

export function AppRoutes(): ReactNode {
  return (
    <Routes>
      <Route path="/login" element={<Placeholder title="Log in" />} />
      <Route path="/signup" element={<Placeholder title="Create your account" />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Placeholder title="Dashboard" />} />
          <Route path="tasks" element={<Placeholder title="Task log" />} />
          <Route path="issues" element={<Placeholder title="Issue log" />} />
          <Route path="feedback" element={<Placeholder title="Feedback" />} />
          <Route path="notes" element={<Placeholder title="Notes" />} />
          <Route path="reports" element={<Placeholder title="Reports" />} />
          <Route path="profile" element={<Placeholder title="Your profile" />} />
          <Route element={<RequireRole allow={['MANAGER', 'ADMIN']} />}>
            <Route path="team" element={<Placeholder title="Your team" />} />
          </Route>
          <Route element={<RequireRole allow={['ADMIN']} />}>
            <Route path="admin" element={<Placeholder title="Administration" />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
