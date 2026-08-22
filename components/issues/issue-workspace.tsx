'use client';

import { IssueSeverity, IssueStatus } from '@prisma/client';

import type { EntryPage } from '@/components/entries/list-chrome';
import { EntryWorkspace } from '@/components/entries/workspace';
import { IssueDialog } from '@/components/issues/issue-dialog';
import { IssueList } from '@/components/issues/issue-list';
import type { IssueDto } from '@/src/modules/issues/dto';

export function IssueWorkspace({
  actorId,
  canTriage,
  canFilterByOwner,
  page,
  issues,
}: {
  actorId: string;
  canTriage: boolean;
  canFilterByOwner: boolean;
  page: EntryPage;
  issues: IssueDto[];
}) {
  return (
    <EntryWorkspace<IssueDto>
      heading="Issues"
      countNoun={['issue', 'issues']}
      createLabel="New issue"
      basePath="/issues"
      endpoint="/api/v1/issues"
      searchPlaceholder="Title or description"
      canFilterByOwner={canFilterByOwner}
      confirmDelete={(issue) => `Delete “${issue.title}”?`}
      selects={[
        { name: 'status', label: 'Status', anyLabel: 'Any status', values: Object.values(IssueStatus) },
        {
          name: 'severity',
          label: 'Severity',
          anyLabel: 'Any severity',
          values: Object.values(IssueSeverity),
        },
      ]}
      page={page}
      items={issues}
      renderList={(args) => <IssueList actorId={actorId} canTriage={canTriage} {...args} />}
      renderDialog={({ entry, onClose, onSaved }) => (
        <IssueDialog
          issue={entry}
          // Someone else's issue can only be triaged, never rewritten.
          restricted={Boolean(entry) && entry?.owner.id !== actorId}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    />
  );
}
