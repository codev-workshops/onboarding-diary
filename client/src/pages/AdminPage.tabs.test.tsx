import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminPage } from './AdminPage';
import type { ChecklistTemplate, Department, TaskCategory, User } from '@/lib/types';

const manager: User = {
  id: 'mgr-a', name: 'Manager A', email: 'mgr.a@demo.local', role: 'Manager', timezone: 'UTC',
  startDate: '2026-01-01T00:00:00.000Z', departmentId: 'dept-eng', managerId: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const recruit: User = { ...manager, id: 'rec-1', name: 'Rina', email: 'recruit.rina@demo.local', role: 'Recruit', managerId: 'mgr-a' };
const departments: Department[] = [{ id: 'dept-eng', name: 'Engineering', _count: { users: 3 } }];
const categories: TaskCategory[] = [{ id: 'cat-1', name: 'Setup', isActive: true }];
const template: ChecklistTemplate = {
  id: 'tpl-1', name: 'Eng onboarding', description: 'Ramp up', role: 'Recruit',
  departmentId: 'dept-eng', department: { id: 'dept-eng', name: 'Engineering' },
  items: [{ id: 'it-1', title: 'Read handbook', description: '', priority: 'Medium', dueOffsetDays: 3, categoryId: 'cat-1', order: 0 }],
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

const calls: { url: string; method: string; body: unknown }[] = [];

function routeFetch() {
  return vi.spyOn(global, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.includes('/users')) return Promise.resolve(jsonResponse([manager, recruit]));
    if (url.includes('/departments')) return Promise.resolve(jsonResponse(departments));
    if (url.includes('/categories')) return Promise.resolve(jsonResponse(categories));
    if (url.includes('/templates')) return Promise.resolve(jsonResponse([template]));
    return Promise.resolve(jsonResponse({}));
  });
}

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

afterEach(() => {
  vi.restoreAllMocks();
  calls.length = 0;
});

describe('AdminPage — Users tab', () => {
  it('creates a recruit with a timezone and optional template', async () => {
    routeFetch();
    renderPage();
    await screen.findByText('Rina');

    await userEvent.type(screen.getByLabelText('Name'), 'New Hire');
    await userEvent.type(screen.getByLabelText('Email'), 'new.hire@demo.local');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.selectOptions(screen.getByLabelText('Timezone'), 'Asia/Tokyo');
    // Recruit role reveals the template picker.
    await userEvent.selectOptions(screen.getByLabelText(/Checklist template/), 'tpl-1');
    await userEvent.click(screen.getByRole('button', { name: /Create user/ }));

    await waitFor(() => {
      const post = calls.find((c) => c.url.includes('/users') && c.method === 'POST');
      expect(post?.body).toMatchObject({ timezone: 'Asia/Tokyo', templateId: 'tpl-1', role: 'Recruit' });
    });
  });

  it('hides the template picker for non-recruit roles', async () => {
    routeFetch();
    renderPage();
    await screen.findByText('Rina');
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'Manager');
    expect(screen.queryByLabelText(/Checklist template/)).not.toBeInTheDocument();
  });
});

describe('AdminPage — Departments & Categories tabs', () => {
  it('adds a department', async () => {
    routeFetch();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /^departments$/i }));
    await userEvent.type(screen.getByPlaceholderText('Department name'), 'Design');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(calls.some((c) => c.url.includes('/departments') && c.method === 'POST')).toBe(true),
    );
    expect(screen.getByText(/3 members/)).toBeInTheDocument();
  });

  it('adds a category and archives one on delete', async () => {
    routeFetch();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /^categories$/i }));
    expect(await screen.findByText('Setup')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('Category name'), 'Compliance');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(calls.some((c) => c.url.includes('/categories') && c.method === 'POST')).toBe(true),
    );
  });
});

describe('AdminPage — Templates tab', () => {
  it('lists templates and edits one, adding an item', async () => {
    routeFetch();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /^templates$/i }));
    expect(await screen.findByText('Eng onboarding')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Edit Eng onboarding'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Eng onboarding');

    await userEvent.click(within(dialog).getByRole('button', { name: /Add item/ }));
    await userEvent.type(within(dialog).getByLabelText('Item 2 title'), 'Meet the team');
    await userEvent.click(within(dialog).getByRole('button', { name: /Save template/ }));

    await waitFor(() => {
      const put = calls.find((c) => c.url.includes('/templates/tpl-1') && c.method === 'PUT');
      expect((put?.body as { items: unknown[] }).items).toHaveLength(2);
    });
  });

  it('creates a new template from scratch', async () => {
    routeFetch();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /^templates$/i }));
    await userEvent.click(await screen.findByRole('button', { name: /New template/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Design onboarding');
    await userEvent.click(within(dialog).getByRole('button', { name: /Save template/ }));
    await waitFor(() =>
      expect(calls.some((c) => c.url.endsWith('/api/templates') && c.method === 'POST')).toBe(true),
    );
  });
});
