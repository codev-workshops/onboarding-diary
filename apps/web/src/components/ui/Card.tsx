import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('border-b border-gray-200 px-6 py-4', className)}>{children}</div>
  );
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  className?: string;
}

export function StatCard({ label, value, subtext, className }: StatCardProps) {
  return (
    <Card className={cn('p-6', className)}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="mt-1 text-sm text-gray-500">{subtext}</p>}
    </Card>
  );
}
