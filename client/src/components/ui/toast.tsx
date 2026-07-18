import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Lightweight toast notifications for create/edit/delete feedback. No external
 * dependency — a small in-memory queue rendered in a fixed corner region.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-xs flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm shadow-lg',
              t.variant === 'success' ? 'border-success/40 text-success' : 'border-danger/40 text-danger',
            )}
          >
            {t.variant === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="text-foreground">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// No-op fallback so components remain usable (and testable) without a provider.
const NOOP: ToastApi = { success: () => {}, error: () => {} };

/** Access the toast API; falls back to a no-op outside a `ToastProvider`. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}
