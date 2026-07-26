import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '../features/auth/AuthContext.js';
import { ApiClientProvider } from '../lib/ApiClientContext.js';
import { API_BASE_URL } from '../lib/env.js';
import { createApiClient, createMemoryTokenStore } from '../lib/apiClient.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { createQueryClient } from './queryClient.js';
import { AppRoutes } from './routes.js';

/** The query client and the API client are created once and share a token store. */
function createSession() {
  const queryClient = createQueryClient();
  const client = createApiClient({
    baseUrl: API_BASE_URL,
    tokens: createMemoryTokenStore(),
    onSessionExpired: () => {
      queryClient.clear();
    },
  });
  return { queryClient, client };
}

export function App(): ReactNode {
  const [{ queryClient, client }] = useState(createSession);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={client}>
        <BrowserRouter>
          <AuthProvider client={client}>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
