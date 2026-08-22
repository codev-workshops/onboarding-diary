'use client';

import type { TaskStatus } from '@prisma/client';

import { formatDate, labelize } from '@/components/entries/labels';
import {
  EntryEmptyState,
  EntryPagination,
  EntryRowActions,
  type EntryPage,
} from '@/components/entries/list-chrome';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TaskDto } from '@/src/modules/tasks/dto';

const STATUS_VARIANT: Record<TaskStatus, React.ComponentProps<typeof Badge>['variant']> = {
  TODO: 'outline',
  IN_PROGRESS: 'secondary',
  BLOCKED: 'destructive',
  DONE: 'default',
  CANCELLED: 'ghost',
};

/**
 * One data set, two layouts: a table from `md` up and cards below it. A table
 * squeezed onto a phone is the usual failure mode of an admin UI, and the cards
 * keep the same actions rather than dropping them.
 */
export function TaskList({
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
  items: TaskDto[];
  onCreate: () => void;
  onDelete: (task: TaskDto) => void;
  onEdit: (task: TaskDto) => void;
  page: EntryPage;
}) {
  if (items.length === 0) {
    return (
      <EntryEmptyState
        filtered={filtered}
        emptyTitle="No tasks yet"
        filteredTitle="No tasks match those filters"
        emptyHint="Log what you worked on today to start your diary."
        createLabel="Log your first task"
        onCreate={onCreate}
      />
    );
  }

  return (
    <div className={busy ? 'opacity-60 transition-opacity' : undefined} aria-busy={busy}>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="whitespace-nowrap">{formatDate(task.entry_date)}</TableCell>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>{task.owner.full_name}</TableCell>
                <TableCell>{labelize(task.category)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[task.status]}>{labelize(task.status)}</Badge>
                </TableCell>
                <TableCell>{labelize(task.priority)}</TableCell>
                <TableCell className="text-right">
                  <EntryRowActions
                    owned={task.owner.id === actorId}
                    busy={busy}
                    onEdit={() => onEdit(task)}
                    onDelete={() => onDelete(task)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((task) => (
          <li key={task.id} className="bg-card space-y-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{task.title}</p>
              <Badge variant={STATUS_VARIANT[task.status]}>{labelize(task.status)}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {formatDate(task.entry_date)} · {labelize(task.category)} · {labelize(task.priority)}
            </p>
            <p className="text-muted-foreground text-sm">{task.owner.full_name}</p>
            <EntryRowActions
              owned={task.owner.id === actorId}
              busy={busy}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
            />
          </li>
        ))}
      </ul>

      <EntryPagination basePath="/tasks" page={page} />
    </div>
  );
}
