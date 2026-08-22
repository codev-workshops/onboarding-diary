'use client';

import type { TaskStatus } from '@prisma/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { formatDate, labelize } from '@/components/tasks/labels';
import type { TaskPage } from '@/components/tasks/task-workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  onCreate,
  onDelete,
  onEdit,
  page,
  tasks,
}: {
  actorId: string;
  busy: boolean;
  filtered: boolean;
  onCreate: () => void;
  onDelete: (task: TaskDto) => void;
  onEdit: (task: TaskDto) => void;
  page: TaskPage;
  tasks: TaskDto[];
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">{filtered ? 'No tasks match those filters' : 'No tasks yet'}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {filtered
            ? 'Try widening the date range or clearing a filter.'
            : 'Log what you worked on today to start your diary.'}
        </p>
        {filtered ? null : (
          <Button className="mt-4" onClick={onCreate}>
            Log your first task
          </Button>
        )}
      </div>
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
            {tasks.map((task) => (
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
                  <RowActions actorId={actorId} task={task} onDelete={onDelete} onEdit={onEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {tasks.map((task) => (
          <li key={task.id} className="bg-card space-y-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{task.title}</p>
              <Badge variant={STATUS_VARIANT[task.status]}>{labelize(task.status)}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {formatDate(task.entry_date)} · {labelize(task.category)} · {labelize(task.priority)}
            </p>
            <p className="text-muted-foreground text-sm">{task.owner.full_name}</p>
            <RowActions actorId={actorId} task={task} onDelete={onDelete} onEdit={onEdit} />
          </li>
        ))}
      </ul>

      <Pagination page={page} />
    </div>
  );
}

/**
 * Buttons are hidden for entries the actor does not own — presentation only.
 * The API refuses the same operations regardless of what was rendered (S3).
 */
function RowActions({
  actorId,
  task,
  onDelete,
  onEdit,
}: {
  actorId: string;
  task: TaskDto;
  onDelete: (task: TaskDto) => void;
  onEdit: (task: TaskDto) => void;
}) {
  if (task.owner.id !== actorId) return <span className="text-muted-foreground text-xs">Read only</span>;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (confirm(`Delete “${task.title}”?`)) onDelete(task);
        }}
      >
        Delete
      </Button>
    </div>
  );
}

function Pagination({ page }: { page: TaskPage }) {
  const searchParams = useSearchParams();

  const href = (target: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(target));
    return `/tasks?${next}`;
  };

  if (page.total_pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {page.page} of {page.total_pages}
      </span>
      <div className="flex gap-2">
        {page.page > 1 ? (
          <Link className="hover:bg-muted rounded-md border px-3 py-1.5" href={href(page.page - 1)}>
            Previous
          </Link>
        ) : null}
        {page.page < page.total_pages ? (
          <Link className="hover:bg-muted rounded-md border px-3 py-1.5" href={href(page.page + 1)}>
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
