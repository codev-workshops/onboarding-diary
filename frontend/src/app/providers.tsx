import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/auth-context';
import { RecruitProvider } from '../features/recruits/recruit-context';
import { ThemeModeProvider } from '../features/theme/theme-mode-context';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <AuthProvider>
          <RecruitProvider>
            <BrowserRouter>{children}</BrowserRouter>
          </RecruitProvider>
        </AuthProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
}
