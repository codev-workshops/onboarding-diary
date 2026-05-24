import { cn } from '@/utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-600',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusVariants: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  BLOCKED: 'danger',
  OPEN: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  INVITED: 'info',
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
  POSITIVE: 'success',
  NEUTRAL: 'default',
  CONSTRUCTIVE: 'info',
  DRAFT: 'neutral',
  GENERATED: 'info',
  REVIEWED: 'success',
  ARCHIVED: 'neutral',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = statusVariants[status] ?? 'default';
  return (
    <Badge variant={variant} className={className}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
