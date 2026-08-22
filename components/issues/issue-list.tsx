'use client';

import type { IssueSeverity, IssueStatus } from '@prisma/client';

import { formatDate, labelize } from '@/components/entries/labels';
import {
  EntryEmptyState,
  EntryPagination,
  EntryRowActions,
  type EntryPage,
} from '@/components/entries/list-chrome';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { IssueDto } from '@/src/modules/issues/dto';

const STATUS_VARIANT: Record<IssueStatus, React.ComponentProps<typeof Badge>['variant']> = {
  OPEN: 'destructive',
  IN_PROGRESS: 'secondary',
  RESOLVED: 'default',
  CLOSED: 'ghost',
};

const SEVERITY_VARIANT: Record<IssueSeverity, React.ComponentProps<typeof Badge>['variant']> = {
  LOW: 'ghost',
  MEDIUM: 'outline',
  HIGH: 'secondary',
  CRITICAL: 'destructive',
};

export function IssueList({
  actorId,
  canTriage,
  busy,
  filtered,
  items,
  onCreate,
  onDelete,
  onEdit,
  page,
}: {
  actorId: string;
  canTriage: boolean;
  busy: boolean;
  filtered: boolean;
  items: IssueDto[];
  onCreate: () => void;
  onDelete: (issue: IssueDto) => void;
  onEdit: (issue: IssueDto) => void;
  page: EntryPage;
}) {
  if (items.length === 0) {
    return (
      <EntryEmptyState
        filtered={filtered}
        emptyTitle="No issues logged"
        filteredTitle="No issues match those filters"
        emptyHint="Log a blocker while it is fresh — it is easier to resolve than to remember."
        createLabel="Log your first issue"
        onCreate={onCreate}
      />
    );
  }

  /** An issue you do not own can still be triaged if the API will allow it. */
  const actions = (issue: IssueDto) =>
    issue.owner.id === actorId ? (
      <EntryRowActions owned busy={busy} onEdit={() => onEdit(issue)} onDelete={() => onDelete(issue)} />
    ) : canTriage ? (
      <Button variant="outline" size="sm" disabled={busy} onClick={() => onEdit(issue)}>
        Update status
      </Button>
    ) : (
      <span className="text-muted-foreground text-xs">Read only</span>
    );

  return (
    <div className={busy ? 'opacity-60 transition-opacity' : undefined} aria-busy={busy}>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell className="whitespace-nowrap">{formatDate(issue.entry_date)}</TableCell>
                <TableCell className="font-medium">{issue.title}</TableCell>
                <TableCell>{issue.owner.full_name}</TableCell>
                <TableCell>
                  <Badge variant={SEVERITY_VARIANT[issue.severity]}>{labelize(issue.severity)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[issue.status]}>{labelize(issue.status)}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {issue.resolved_at ? formatDate(issue.resolved_at.slice(0, 10)) : '—'}
                </TableCell>
                <TableCell className="text-right">{actions(issue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((issue) => (
          <li key={issue.id} className="bg-card space-y-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{issue.title}</p>
              <Badge variant={STATUS_VARIANT[issue.status]}>{labelize(issue.status)}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {formatDate(issue.entry_date)} · {labelize(issue.severity)} · {issue.owner.full_name}
            </p>
            {issue.resolution_notes ? (
              <p className="text-muted-foreground text-sm">{issue.resolution_notes}</p>
            ) : null}
            <div className="flex justify-end">{actions(issue)}</div>
          </li>
        ))}
      </ul>

      <EntryPagination basePath="/issues" page={page} />
    </div>
  );
}
