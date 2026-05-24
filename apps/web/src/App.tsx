import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { router } from '@/router/routes';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { fontSize: '14px' },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
