import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from './AdminPage';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

const managerA = {
  id: 'mgr-a',
  name: 'Manager A',
  email: 'mgr.a@demo.local',
  role: 'Manager',
  startDate: '2026-01-01T00:00:00.000Z',
  departmentId: 'dept-eng',
  managerId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const managerB = { ...managerA, id: 'mgr-b', name: 'Manager B', email: 'mgr.b@demo.local' };
const recruit = {
  ...managerA,
  id: 'rec-1',
  name: 'Rina Recruit',
  email: 'recruit.rina@demo.local',
  role: 'Recruit',
  managerId: 'mgr-a',
};

const departments = [{ id: 'dept-eng', name: 'Engineering', _count: { users: 3 } }];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminPage — inline user edit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reassigns a recruit to a new manager via the edit modal', async () => {
    const putCalls: { url: string; body: unknown }[] = [];

    vi.spyOn(global, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/api/users') && method === 'PUT') {
        putCalls.push({ url, body: JSON.parse(String(init?.body)) });
        return Promise.resolve(jsonResponse({ ...recruit, managerId: 'mgr-b' }));
      }
      if (url.includes('/api/users')) return Promise.resolve(jsonResponse([managerA, managerB, recruit]));
      if (url.includes('/api/departments')) return Promise.resolve(jsonResponse(departments));
      if (url.includes('/api/categories')) return Promise.resolve(jsonResponse([]));
      if (url.includes('/api/templates')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({}));
    });

    const user = userEvent.setup();
    renderPage();

    // Open the edit modal for the recruit.
    const editButton = await screen.findByLabelText('Edit Rina Recruit');
    await user.click(editButton);

    const dialog = await screen.findByRole('dialog');
    // Reassign to Manager B.
    const managerSelect = within(dialog).getByLabelText('Manager');
    await user.selectOptions(managerSelect, 'mgr-b');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(putCalls).toHaveLength(1));
    expect(putCalls[0].url).toContain('/api/users/rec-1');
    expect(putCalls[0].body).toMatchObject({ managerId: 'mgr-b' });
    // No password change was entered, so none is sent.
    expect(putCalls[0].body).not.toHaveProperty('password');
  });

  it('excludes the edited user from its own manager options', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/users')) return Promise.resolve(jsonResponse([managerA, managerB, recruit]));
      if (url.includes('/api/departments')) return Promise.resolve(jsonResponse(departments));
      if (url.includes('/api/categories')) return Promise.resolve(jsonResponse([]));
      if (url.includes('/api/templates')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({}));
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByLabelText('Edit Manager A'));
    const dialog = await screen.findByRole('dialog');
    const managerSelect = within(dialog).getByLabelText('Manager');
    // Manager A cannot be its own manager.
    expect(within(managerSelect).queryByRole('option', { name: 'Manager A' })).toBeNull();
    expect(within(managerSelect).getByRole('option', { name: 'Manager B' })).toBeInTheDocument();
  });
});
