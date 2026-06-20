import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ message = 'No items found', icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      {icon || <Inbox size={48} />}
      <p className="mt-4 text-sm">{message}</p>
    </div>
  );
}
