import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '../app/theme';
import { AuthProvider } from '../features/auth/auth-context';
import { RecruitProvider } from '../features/recruits/recruit-context';

interface WrapperOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithProviders(ui: ReactElement, { route = '/', ...options }: WrapperOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <RecruitProvider>
              <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            </RecruitProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
