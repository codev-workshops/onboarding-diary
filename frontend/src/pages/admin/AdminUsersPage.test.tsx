import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as adminApi from '../../api/admin';
import type { AdminUser } from '../../api/admin';
import { fakeAuth, renderWithProviders } from '../../test/renderWithProviders';
import { page, recruit } from '../../test/fixtures';
import { AdminUsersPage } from './AdminUsersPage';

vi.mock('../../api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof adminApi>()),
  listUsers: vi.fn(),
  fetchManagers: vi.fn(),
  createUser: vi.fn(),
  resetUserPassword: vi.fn(),
  setUserEnabled: vi.fn(),
  updateUserRoles: vi.fn(),
  updateUserProfile: vi.fn(),
  assignManager: vi.fn(),
}));

const api = vi.mocked(adminApi);
const admin = { ...recruit, id: 1, roles: ['ADMIN' as const] };

function adminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 5,
    email: 'ravi@example.com',
    roles: ['RECRUIT'],
    enabled: true,
    mustChangePassword: false,
    locked: false,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    profile: { ...recruit.profile, fullName: 'Ravi Recruit' },
    ...overrides,
  };
}

function renderPage(route = '/admin/users') {
  return renderWithProviders(<AdminUsersPage />, {
    auth: fakeAuth({ status: 'authenticated', user: admin, hasRole: () => true }),
    route,
    path: '/admin/users',
  });
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listUsers.mockResolvedValue(page([adminUser(), adminUser({ id: 1, email: 'me@x.com' })]));
    api.fetchManagers.mockResolvedValue([{ id: 9, fullName: 'Maria Manager', email: 'm@x.com' }]);
  });

  it('passes URL filters to the API', async () => {
    renderPage('/admin/users?role=MANAGER&enabled=false&q=ra');
    await screen.findAllByText('Ravi Recruit');
    expect(api.listUsers).toHaveBeenCalledWith({
      role: 'MANAGER',
      enabled: 'false',
      q: 'ra',
      page: 0,
      size: 20,
    });
  });

  it('creates a user and shows the temporary password once', async () => {
    api.createUser.mockResolvedValue(adminUser({ id: 6, email: 'new@example.com' }));
    renderPage();
    await screen.findAllByText('Ravi Recruit');

    await userEvent.click(screen.getByRole('button', { name: 'New user' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Enter a valid email')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText(/email/i), 'new@example.com');
    await userEvent.type(within(dialog).getByLabelText(/full name/i), 'New Person');
    await userEvent.type(within(dialog).getByLabelText(/department/i), 'Ops');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.createUser).toHaveBeenCalled());
    const body = api.createUser.mock.calls[0][0];
    expect(body).toMatchObject({
      email: 'new@example.com',
      fullName: 'New Person',
      roles: ['RECRUIT'],
      managerId: null,
    });
    expect(await screen.findByTestId('temporary-password')).toHaveTextContent(
      body.temporaryPassword,
    );
  });

  it('resets a password after confirmation', async () => {
    api.resetUserPassword.mockResolvedValue('TempPass1234');
    renderPage();
    await screen.findAllByText('Ravi Recruit');

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Reset password for Ravi Recruit' })[0],
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Reset password' }));

    expect(api.resetUserPassword).toHaveBeenCalledWith(5);
    expect(await screen.findByTestId('temporary-password')).toHaveTextContent('TempPass1234');
  });

  it('cannot disable your own account', async () => {
    renderPage();
    await screen.findAllByText('Ravi Recruit');
    const ownToggle = screen.getAllByRole('button', { name: /disable/i });
    expect(ownToggle.some((button) => button.hasAttribute('disabled'))).toBe(true);
  });
});
