import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/auth-context';
import { RecruitProvider } from '../features/recruits/recruit-context';
import { theme } from './theme';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <RecruitProvider>
            <BrowserRouter>{children}</BrowserRouter>
          </RecruitProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
