import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api/checklists';
import * as managerApi from '../../api/manager';
import type { ChecklistTemplate } from '../../api/checklists';
import type { RecruitSummary } from '../../api/manager';
import { ChecklistTemplatesPage } from './ChecklistTemplatesPage';
import { toTemplateRequest } from './checklistDraft';

vi.mock('../../api/checklists');
vi.mock('../../api/manager');

const template: ChecklistTemplate = {
  id: 1,
  name: 'Engineering week 1',
  description: 'First steps',
  items: [{ title: 'Get laptop', description: null, dueDayOffset: 0 }],
  assignedCount: 0,
  updatedAt: '2026-09-20T10:00:00Z',
  version: 0,
};

const recruit = {
  id: 7,
  fullName: 'Rita Recruit',
  email: 'rita@example.com',
} as RecruitSummary;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ChecklistTemplatesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChecklistTemplatesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.listTemplates).mockResolvedValue([template]);
    vi.mocked(api.fetchTemplateAssignments).mockResolvedValue([]);
    vi.mocked(managerApi.fetchRecruits).mockResolvedValue([recruit]);
  });

  it('creates a template with items', async () => {
    vi.mocked(api.createTemplate).mockResolvedValue({ ...template, id: 2 });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'New template' }));
    const dialog = screen.getByRole('dialog');

    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Sales week 1');
    await userEvent.type(within(dialog).getByLabelText('Item 1'), 'Shadow a call');
    await userEvent.type(within(dialog).getByLabelText('Due (days after start)'), '3');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(api.createTemplate).toHaveBeenCalledWith({
      name: 'Sales week 1',
      description: null,
      items: [{ title: 'Shadow a call', description: null, dueDayOffset: 3 }],
    });
  });

  it('blocks saving an item without a title', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'New template' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Sales week 1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Every item needs a title')).toBeInTheDocument();
    expect(api.createTemplate).not.toHaveBeenCalled();
  });

  it('assigns a template to recruits', async () => {
    vi.mocked(api.assignTemplate).mockResolvedValue({ assigned: [7], skipped: [] });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Assign' }));
    const dialog = screen.getByRole('dialog');

    await userEvent.click(within(dialog).getByLabelText('Recruits'));
    await userEvent.click(await screen.findByRole('option', { name: /Rita Recruit/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Assign' }));

    expect(api.assignTemplate).toHaveBeenCalledWith(1, [7]);
    expect(await within(dialog).findByText('Assigned to 1 recruit(s)')).toBeInTheDocument();
  });
});

describe('toTemplateRequest', () => {
  it('rejects out-of-range due days', () => {
    expect(toTemplateRequest('X', '', [{ title: 'A', description: '', dueDayOffset: '400' }])).toBe(
      'Due days must be whole numbers from 0 to 365',
    );
  });
});
