import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface UserNameProps {
  name: string;
  isActive?: boolean;
  className?: string;
}

/**
 * Renders a user's name with a visible cue when the account has been deactivated
 * (soft-deleted, docs/ASSUMPTIONS.md §10): the name is muted and struck through
 * and a "Deactivated" badge is shown, so their retained content stays clearly
 * attributed to an account that can no longer sign in.
 */
export function UserName({ name, isActive = true, className }: UserNameProps) {
  if (isActive) return <span className={className}>{name}</span>;
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="text-muted-foreground line-through">{name}</span>
      <Badge tone="danger">Deactivated</Badge>
    </span>
  );
}
