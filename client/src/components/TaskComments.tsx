import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useComments } from '@/hooks/data';
import { api } from '@/lib/api';
import type { Comment, Task } from '@/lib/types';

/**
 * Comment thread for a task with @mention support (docs/ASSUMPTIONS.md §19).
 * Mention users by their email handle, e.g. `@manager.eng`.
 */
export function TaskComments({ task, onClose }: { task: Task; onClose: () => void }) {
  const qc = useQueryClient();
  const commentsQuery = useComments(task.id);
  const [body, setBody] = useState('');

  const addComment = useMutation({
    mutationFn: () => api<Comment>(`/tasks/${task.id}/comments`, { method: 'POST', body: { body } }),
    onSuccess: () => {
      setBody('');
      void qc.invalidateQueries({ queryKey: ['comments', task.id] });
      void qc.invalidateQueries({ queryKey: ['mentions'] });
    },
  });

  return (
    <Modal open title={`Comments — ${task.title}`} onClose={onClose}>
      <div className="space-y-4">
        {commentsQuery.isLoading ? (
          <LoadingState />
        ) : commentsQuery.isError ? (
          <ErrorState message={(commentsQuery.error as Error).message} />
        ) : commentsQuery.data && commentsQuery.data.length > 0 ? (
          <ul className="max-h-72 space-y-3 overflow-y-auto">
            {commentsQuery.data.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.author.name}</span>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{renderBody(c.body)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No comments yet" hint="Start the conversation below." />
        )}

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) addComment.mutate();
          }}
        >
          <Textarea
            aria-label="Add a comment"
            placeholder="Add a comment… mention someone with @handle (e.g. @manager.eng)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {addComment.isError ? (
            <p className="text-sm text-danger" role="alert">
              {(addComment.error as Error).message}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={addComment.isPending || !body.trim()}>
              {addComment.isPending ? 'Posting…' : 'Comment'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/** Highlights @mention handles within a comment body. */
function renderBody(body: string) {
  const parts = body.split(/(@[a-zA-Z0-9._-]+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-medium text-primary">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
