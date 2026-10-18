import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AuthProvider } from '../../auth/AuthContext';
import SignupPage from '../SignupPage';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=test-token';
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('shows server field errors next to the inputs', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith('/api/auth/me')) {
      return jsonResponse(401, { message: 'Authentication required' });
    }
    return jsonResponse(400, {
      message: 'Validation failed',
      fieldErrors: [{ field: 'password', message: 'must be 8-72 characters' }],
    });
  });

  render(
    <MemoryRouter>
      <AuthProvider>
        <SignupPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  await userEvent.type(await screen.findByLabelText(/full name/i), 'Alice');
  await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
  await userEvent.type(screen.getByLabelText(/^password/i), 'short');
  await userEvent.click(screen.getByRole('button', { name: /sign up/i }));

  expect(await screen.findByText('must be 8-72 characters')).toBeInTheDocument();
  const signupCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/signup'));
  expect(signupCall?.[1]?.headers).toMatchObject({ 'X-XSRF-TOKEN': 'test-token' });
});
