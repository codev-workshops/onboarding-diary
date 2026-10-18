import type { ReactNode } from 'react';

interface Props {
  kind?: 'error' | 'success' | 'info';
  children: ReactNode;
}

export default function Alert({ kind = 'error', children }: Props) {
  if (!children) {
    return null;
  }
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
