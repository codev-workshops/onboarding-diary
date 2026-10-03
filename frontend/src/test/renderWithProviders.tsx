import { CssBaseline, ThemeProvider } from '@mui/material';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../auth/authContextValue';
import { theme } from '../theme';

export function fakeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'anonymous',
    user: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    hasRole: () => false,
    ...overrides,
  };
}

export function renderWithProviders(
  ui: ReactElement,
  {
    auth = fakeAuth(),
    route = '/',
    path = '*',
  }: { auth?: AuthContextValue; route?: string; path?: string } = {},
) {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthContext.Provider value={auth}>
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path={path} element={ui} />
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
            <Route path="/login" element={<div>Login page</div>} />
            <Route path="/change-password" element={<div>Change password page</div>} />
            <Route path="/forbidden" element={<div>Forbidden page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>,
  );
}
