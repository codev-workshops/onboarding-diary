import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/15 text-warning',
        danger: 'bg-danger/15 text-danger',
        info: 'bg-info/15 text-info',
        primary: 'bg-primary/15 text-primary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Maps a status/severity/priority value to a semantic badge tone. */
export function toneFor(value: string): NonNullable<BadgeProps['tone']> {
  switch (value) {
    case 'Done':
    case 'Resolved':
    case 'Positive':
      return 'success';
    case 'In Progress':
    case 'Medium':
    case 'Suggestion':
      return 'info';
    case 'High':
    case 'Open':
    case 'Concern':
      return 'warning';
    case 'Critical':
      return 'danger';
    default:
      return 'neutral';
  }
}
