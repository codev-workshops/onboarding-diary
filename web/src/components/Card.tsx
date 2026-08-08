import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Card = ({ title, action, children, className }: CardProps) => (
  <section className={['card', className ?? ''].filter(Boolean).join(' ')}>
    {title || action ? (
      <header className="card__header">
        {title ? <h2>{title}</h2> : <span />}
        {action}
      </header>
    ) : null}
    {children}
  </section>
);
