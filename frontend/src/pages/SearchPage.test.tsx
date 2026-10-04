import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as searchApi from '../api/search';
import type { SearchResults } from '../api/search';
import type { Role } from '../api/types';
import { recruit } from '../test/fixtures';
import { fakeAuth, renderWithProviders } from '../test/renderWithProviders';
import { SearchPage } from './SearchPage';

vi.mock('../api/search', async (importOriginal) => ({
  ...(await importOriginal<typeof searchApi>()),
  searchEntries: vi.fn(),
}));
const api = vi.mocked(searchApi);

function results(overrides: Partial<SearchResults> = {}): SearchResults {
  return {
    query: 'vpn',
    scope: 'SELF',
    groups: [
      {
        type: 'TASK',
        total: 3,
        hits: [
          {
            type: 'TASK',
            id: 1,
            ownerId: 5,
            ownerName: 'Ravi Recruit',
            entryDate: '2026-01-05',
            title: 'Request VPN token',
            snippet: 'Ask IT for a vpn token',
            status: 'TODO',
          },
        ],
      },
      { type: 'ISSUE', total: 0, hits: [] },
      { type: 'FEEDBACK', total: 0, hits: [] },
      { type: 'NOTE', total: 0, hits: [] },
    ],
    ...overrides,
  };
}

function renderAs(roles: Role[], route: string) {
  return renderWithProviders(<SearchPage />, {
    route,
    auth: fakeAuth({
      status: 'authenticated',
      user: { ...recruit, roles },
      hasRole: (...wanted) => wanted.some((role) => roles.includes(role)),
    }),
  });
}

describe('SearchPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('groups hits by log, highlights matches and links to the entry day', async () => {
    api.searchEntries.mockResolvedValue(results());
    renderAs(['RECRUIT'], '/search?q=vpn');

    expect(await screen.findByRole('heading', { name: 'Tasks (3)' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Issues/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request VPN token' })).toHaveAttribute(
      'href',
      '/tasks?from=2026-01-05&to=2026-01-05',
    );
    expect(screen.getAllByText(/vpn/i, { selector: 'mark' })).toHaveLength(2);
    expect(screen.getByText('Showing 1 of 3. Refine your search to narrow it down.')).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Search scope' })).not.toBeInTheDocument();
    expect(api.searchEntries).toHaveBeenCalledWith('vpn', 'SELF');
  });

  it('asks for a longer query without calling the API', () => {
    renderAs(['RECRUIT'], '/search?q=v');
    expect(screen.getByText(/Type at least 2 characters/)).toBeInTheDocument();
    expect(api.searchEntries).not.toHaveBeenCalled();
  });

  it('shows an empty state', async () => {
    api.searchEntries.mockResolvedValue(
      results({ groups: results().groups.map((g) => ({ ...g, total: 0, hits: [] })) }),
    );
    renderAs(['RECRUIT'], '/search?q=nothing');
    expect(await screen.findByText('Nothing matches “nothing”.')).toBeInTheDocument();
  });

  it('lets managers search their team and links into the recruit view', async () => {
    api.searchEntries.mockResolvedValue(results());
    renderAs(['MANAGER'], '/search?q=vpn');
    await screen.findByRole('heading', { name: 'Tasks (3)' });

    await userEvent.click(screen.getByRole('button', { name: 'My team' }));

    await waitFor(() => expect(api.searchEntries).toHaveBeenLastCalledWith('vpn', 'TEAM'));
    expect(await screen.findByText(/Ravi Recruit/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request VPN token' })).toHaveAttribute(
      'href',
      '/team/5/tasks?from=2026-01-05&to=2026-01-05',
    );
  });
});
