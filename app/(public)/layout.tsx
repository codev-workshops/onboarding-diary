import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-muted/30 flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
