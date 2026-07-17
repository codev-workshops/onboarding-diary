import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMentions } from '@/hooks/data';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Header activity indicator (docs/ASSUMPTIONS.md §19). Shows the unread @mention
 * count and a panel listing recent mentions; opening it marks them read.
 */
export function MentionsBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useMentions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  const markRead = useMutation({
    mutationFn: () => api<void>('/mentions/read', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentions'] }),
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markRead.mutate();
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Activity${unread > 0 ? ` (${unread} unread)` : ''}`}
        data-tour="activity-bell"
        onClick={toggle}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white"
            aria-hidden
          >
            {unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Recent mentions"
          className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          <div className="border-b border-border px-3 py-2 text-sm font-semibold">Activity</div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No mentions yet.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-muted',
                      !m.readAt && 'bg-primary/5',
                    )}
                    onClick={() => {
                      setOpen(false);
                      navigate(`/tasks?taskId=${m.comment.task.id}`);
                    }}
                  >
                    <span className="font-medium">{m.comment.author.name}</span> mentioned you on{' '}
                    <span className="font-medium">{m.comment.task.title}</span>
                    <span className="mt-0.5 block truncate text-muted-foreground">
                      {m.comment.body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
