import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as diaryApi from '../../api/diary';
import type { Note } from '../../api/diaryTypes';
import { fakeAuth, renderWithProviders } from '../../test/renderWithProviders';
import { page, recruit } from '../../test/fixtures';
import { todayIso } from '../../utils/dates';
import { IssuesPage } from './IssuesPage';
import { NotesPage } from './NotesPage';

vi.mock('../../api/diary', async (importOriginal) => ({
  ...(await importOriginal<typeof diaryApi>()),
  listEntries: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  fetchNoteTags: vi.fn(),
}));

const api = vi.mocked(diaryApi);
const auth = () => fakeAuth({ status: 'authenticated', user: recruit });

const note: Note = {
  id: 7,
  entryDate: todayIso(),
  title: 'Week 1',
  content: '**Bold idea** <script>alert(1)</script>',
  tags: ['git', 'onboarding'],
  shared: true,
  createdAt: '2026-01-05T09:00:00Z',
  updatedAt: '2026-01-05T09:00:00Z',
  version: 0,
};

describe('IssuesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listEntries.mockResolvedValue(page([]));
  });

  it('requires resolution notes before resolving', async () => {
    api.createEntry.mockResolvedValue({});
    renderWithProviders(<IssuesPage />, { auth: auth(), route: '/issues', path: '/issues' });

    await userEvent.click(await screen.findByRole('button', { name: 'New issue' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Title/), 'No VPN');
    await userEvent.click(within(dialog).getByRole('combobox', { name: /Severity/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'High' }));
    await userEvent.click(within(dialog).getByRole('combobox', { name: /Status/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Resolved' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(
      await within(dialog).findByText('Resolution notes are required to resolve or close an issue'),
    ).toBeInTheDocument();
    expect(api.createEntry).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Resolution notes/), 'IT reset token');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.createEntry).toHaveBeenCalledWith(
        'issues',
        expect.objectContaining({
          severity: 'HIGH',
          status: 'RESOLVED',
          resolutionNotes: 'IT reset token',
          relatedTaskId: null,
        }),
      ),
    );
  });
});

describe('NotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listEntries.mockResolvedValue(page([note]));
    api.fetchNoteTags.mockResolvedValue(['git', 'onboarding']);
  });

  it('renders markdown safely and filters by a clicked tag', async () => {
    const { container } = renderWithProviders(<NotesPage />, {
      auth: auth(),
      route: '/notes',
      path: '/notes',
    });

    expect(await screen.findByText('Bold idea')).toHaveProperty('tagName', 'STRONG');
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByLabelText('Shared with manager')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'git' }));
    await waitFor(() =>
      expect(api.listEntries).toHaveBeenLastCalledWith('notes', { tag: 'git', page: 0, size: 20 }),
    );
  });
});
