import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/checklists';
import type { ChecklistAssignment } from '../api/checklists';
import { ChecklistsPage } from './ChecklistsPage';

vi.mock('../api/checklists');

const checklist: ChecklistAssignment = {
  id: 10,
  templateId: 1,
  name: 'Engineering week 1',
  assignedAt: '2026-09-20T10:00:00Z',
  totalItems: 2,
  completedItems: 1,
  completionPct: 50,
  items: [
    {
      id: 1,
      title: 'Get laptop',
      description: null,
      dueDate: '2026-09-21',
      completedAt: '2026-09-21T09:00:00Z',
      overdue: false,
    },
    {
      id: 2,
      title: 'Meet the team',
      description: 'Say hi',
      dueDate: '2026-09-22',
      completedAt: null,
      overdue: true,
    },
  ],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ChecklistsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChecklistsPage', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows progress and overdue items, and ticks an item off', async () => {
    vi.mocked(api.fetchMyChecklists).mockResolvedValue([checklist]);
    vi.mocked(api.setChecklistItem).mockResolvedValue({
      ...checklist,
      completedItems: 2,
      completionPct: 100,
      items: checklist.items.map((item) => ({
        ...item,
        completedAt: '2026-09-23T09:00:00Z',
        overdue: false,
      })),
    });
    renderPage();

    expect(await screen.findByText('1 of 2 done')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Get laptop' })).toBeChecked();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Meet the team' }));

    expect(api.setChecklistItem).toHaveBeenCalledWith(10, 2, true);
    expect(await screen.findByText('2 of 2 done')).toBeInTheDocument();
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('explains when nothing is assigned', async () => {
    vi.mocked(api.fetchMyChecklists).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/No checklists have been assigned/)).toBeInTheDocument();
  });
});
