import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  className?: string;
  text?: string;
}

export function LoadingSpinner({ className, text = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="mt-3 text-sm text-gray-500">{text}</p>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
