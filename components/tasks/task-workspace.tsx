'use client';

import { PriorityLevel, TaskCategory, TaskStatus } from '@prisma/client';

import type { EntryPage } from '@/components/entries/list-chrome';
import { EntryWorkspace } from '@/components/entries/workspace';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { TaskList } from '@/components/tasks/task-list';
import type { TaskDto } from '@/src/modules/tasks/dto';

export type TaskPage = EntryPage;

export function TaskWorkspace({
  actorId,
  canFilterByOwner,
  page,
  tasks,
}: {
  actorId: string;
  canFilterByOwner: boolean;
  page: TaskPage;
  tasks: TaskDto[];
}) {
  return (
    <EntryWorkspace<TaskDto>
      heading="Tasks"
      countNoun={['task', 'tasks']}
      createLabel="New task"
      basePath="/tasks"
      endpoint="/api/v1/tasks"
      searchPlaceholder="Title or description"
      canFilterByOwner={canFilterByOwner}
      confirmDelete={(task) => `Delete “${task.title}”?`}
      selects={[
        { name: 'status', label: 'Status', anyLabel: 'Any status', values: Object.values(TaskStatus) },
        {
          name: 'category',
          label: 'Category',
          anyLabel: 'Any category',
          values: Object.values(TaskCategory),
        },
        {
          name: 'priority',
          label: 'Priority',
          anyLabel: 'Any priority',
          values: Object.values(PriorityLevel),
        },
      ]}
      page={page}
      items={tasks}
      renderList={(args) => <TaskList actorId={actorId} {...args} />}
      renderDialog={({ entry, onClose, onSaved }) => (
        <TaskDialog task={entry} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
