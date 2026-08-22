'use client';

import { FeedbackType, FeedbackVisibility } from '@prisma/client';

import type { EntryPage } from '@/components/entries/list-chrome';
import { EntryWorkspace } from '@/components/entries/workspace';
import { FeedbackDialog } from '@/components/feedback/feedback-dialog';
import { FeedbackList } from '@/components/feedback/feedback-list';
import type { FeedbackDto } from '@/src/modules/feedback/dto';

export function FeedbackWorkspace({
  actorId,
  canFilterByOwner,
  page,
  feedback,
}: {
  actorId: string;
  canFilterByOwner: boolean;
  page: EntryPage;
  feedback: FeedbackDto[];
}) {
  return (
    <EntryWorkspace<FeedbackDto>
      heading="Feedback"
      countNoun={['entry', 'entries']}
      createLabel="New feedback"
      basePath="/feedback"
      endpoint="/api/v1/feedback"
      searchPlaceholder="Subject or details"
      canFilterByOwner={canFilterByOwner}
      confirmDelete={(entry) => `Delete “${entry.subject}”?`}
      selects={[
        { name: 'type', label: 'Type', anyLabel: 'Any type', values: Object.values(FeedbackType) },
        {
          name: 'visibility',
          label: 'Visibility',
          anyLabel: 'Any visibility',
          values: Object.values(FeedbackVisibility),
        },
      ]}
      page={page}
      items={feedback}
      renderList={(args) => <FeedbackList actorId={actorId} {...args} />}
      renderDialog={({ entry, onClose, onSaved }) => (
        <FeedbackDialog feedback={entry} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
