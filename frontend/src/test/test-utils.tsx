import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/auth-context';
import { RecruitProvider } from '../features/recruits/recruit-context';
import { ThemeModeProvider } from '../features/theme/theme-mode-context';

interface WrapperOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithProviders(ui: ReactElement, { route = '/', ...options }: WrapperOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeModeProvider>
          <AuthProvider>
            <RecruitProvider>
              <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            </RecruitProvider>
          </AuthProvider>
        </ThemeModeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
