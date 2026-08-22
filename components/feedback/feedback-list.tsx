'use client';

import type { FeedbackType } from '@prisma/client';

import { formatDate, labelize } from '@/components/entries/labels';
import {
  EntryEmptyState,
  EntryPagination,
  EntryRowActions,
  type EntryPage,
} from '@/components/entries/list-chrome';
import { Badge } from '@/components/ui/badge';
import type { FeedbackDto } from '@/src/modules/feedback/dto';

const TYPE_VARIANT: Record<FeedbackType, React.ComponentProps<typeof Badge>['variant']> = {
  POSITIVE: 'default',
  SUGGESTION: 'secondary',
  CONCERN: 'destructive',
};

/**
 * Feedback is prose, so it reads as cards at every width rather than as a table
 * with one wrapped column doing all the work.
 */
export function FeedbackList({
  actorId,
  busy,
  filtered,
  items,
  onCreate,
  onDelete,
  onEdit,
  page,
}: {
  actorId: string;
  busy: boolean;
  filtered: boolean;
  items: FeedbackDto[];
  onCreate: () => void;
  onDelete: (feedback: FeedbackDto) => void;
  onEdit: (feedback: FeedbackDto) => void;
  page: EntryPage;
}) {
  if (items.length === 0) {
    return (
      <EntryEmptyState
        filtered={filtered}
        emptyTitle="No feedback yet"
        filteredTitle="No feedback matches those filters"
        emptyHint="Tell us what is working and what is not — it is what onboarding gets fixed from."
        createLabel="Share your first feedback"
        onCreate={onCreate}
      />
    );
  }

  return (
    <div className={busy ? 'opacity-60 transition-opacity' : undefined} aria-busy={busy}>
      <ul className="space-y-3">
        {items.map((feedback) => (
          <li key={feedback.id} className="bg-card space-y-2 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{feedback.subject}</p>
                <p className="text-muted-foreground text-sm">
                  {formatDate(feedback.entry_date)} · {feedback.owner.full_name}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant={TYPE_VARIANT[feedback.type]}>{labelize(feedback.type)}</Badge>
                {feedback.visibility === 'ADMIN_ONLY' ? <Badge variant="outline">Admin only</Badge> : null}
              </div>
            </div>

            <p className="text-sm whitespace-pre-line">{feedback.details}</p>

            <EntryRowActions
              owned={feedback.owner.id === actorId}
              busy={busy}
              onEdit={() => onEdit(feedback)}
              onDelete={() => onDelete(feedback)}
            />
          </li>
        ))}
      </ul>

      <EntryPagination basePath="/feedback" page={page} />
    </div>
  );
}
