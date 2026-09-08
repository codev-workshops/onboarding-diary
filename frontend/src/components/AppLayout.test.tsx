import { screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { UserRole } from '../api/auth';
import { renderWithProviders } from '../test/renderWithProviders';
import { AppLayout } from './AppLayout';

function mockProfile(role: UserRole) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          id: 1,
          email: `${role.toLowerCase()}@example.com`,
          fullName: 'Sam Sample',
          role,
          departmentId: null,
          departmentName: null,
          startDate: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('a recruit sees their diary links but no team or user administration', async () => {
  mockProfile('Recruit');

  renderWithProviders(<AppLayout />);

  expect(await screen.findByRole('link', { name: 'Tasks' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
});

test('a manager sees the team roster instead of the diary links', async () => {
  mockProfile('Manager');

  renderWithProviders(<AppLayout />);

  expect(await screen.findByRole('link', { name: 'Team' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Tasks' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
});

test('an admin sees both the team roster and user administration', async () => {
  mockProfile('Admin');

  renderWithProviders(<AppLayout />);

  expect(await screen.findByRole('link', { name: 'Team' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
});
