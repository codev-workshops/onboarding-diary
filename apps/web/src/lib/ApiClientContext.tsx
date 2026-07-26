/**
 * Makes the single API client available to feature hooks. Passing it through context (rather
 * than importing a module singleton) keeps tests able to supply a fake client.
 */

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { ApiClient } from './apiClient.js';

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}): ReactNode {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (client === null) throw new Error('useApiClient must be used inside an ApiClientProvider');
  return client;
}
