import type { ReactNode } from 'react';

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}
