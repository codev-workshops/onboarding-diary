import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { createQueryClient } from '../app/queryClient.js';
import { AuthProvider } from '../features/auth/AuthContext.js';
import type { ApiClient } from '../lib/apiClient.js';

export function renderWithProviders(
  ui: ReactNode,
  { client, route = '/' }: { client: ApiClient; route?: string },
): RenderResult {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider client={client}>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
