import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';

interface RecruitContextValue {
  /** The recruit whose diary is being viewed, or null for the signed-in user's own diary. */
  recruitId: number | null;
  setRecruitId: (id: number | null) => void;
  /** True when viewing somebody else's diary, which is read only. */
  isReadOnly: boolean;
}

const RecruitContext = createContext<RecruitContextValue | undefined>(undefined);

export function RecruitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [recruitId, setRecruitId] = useState<number | null>(null);

  const value = useMemo<RecruitContextValue>(
    () => ({
      recruitId,
      setRecruitId,
      isReadOnly: recruitId !== null && recruitId !== user?.id,
    }),
    [recruitId, user?.id],
  );

  return <RecruitContext.Provider value={value}>{children}</RecruitContext.Provider>;
}

export function useRecruitContext(): RecruitContextValue {
  const context = useContext(RecruitContext);
  if (!context) {
    throw new Error('useRecruitContext must be used inside a RecruitProvider.');
  }
  return context;
}
