/**
 * Task log (T-130 to T-133). Also serves the manager's read-only view of a recruit, where
 * `ownerId` scopes the query and every write affordance is withheld (FR-X2).
 */

import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskEntryDto,
  type TaskPriority,
  type TaskStatus,
} from '@onboarding-diary/shared';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { Badge, type BadgeTone } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Field } from '../../components/ui/Field.js';
import { DateInput } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import type { Column } from '../../components/ui/Table.js';
import { DeleteEntryButton } from '../entries/DeleteEntryButton.js';
import { EntryList } from '../entries/EntryList.js';
import { EntryPageHeader } from '../entries/EntryPageHeader.js';
import { FilterBar } from '../entries/FilterBar.js';
import { enumOptions } from '../entries/enumOptions.js';
import { useEntryList } from '../entries/useEntries.js';
import { useFilters } from '../entries/useFilters.js';
import { TaskForm } from './TaskForm.js';

const FILTER_NAMES = ['from', 'to', 'category', 'status', 'priority'] as const;

const STATUS_TONES: Record<TaskStatus, BadgeTone> = {
  NOT_STARTED: 'neutral',
  IN_PROGRESS: 'info',
  BLOCKED: 'warning',
  DONE: 'success',
};

const PRIORITY_TONES: Record<TaskPriority, BadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'danger',
};

export function TasksPage({
  ownerId,
  readOnly = false,
}: {
  ownerId?: string;
  readOnly?: boolean;
} = {}): ReactNode {
  const filters = useFilters(FILTER_NAMES, ownerId === undefined ? {} : { ownerId });
  const query = useEntryList('tasks', filters.query);
  const [editing, setEditing] = useState<TaskEntryDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const columns: Column<TaskEntryDto>[] = [
    { key: 'entryDate', header: 'Date', render: (task) => task.entryDate },
    {
      key: 'title',
      header: 'Title',
      render: (task) => <span className="font-medium text-slate-900">{task.title}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      secondary: true,
      render: (task) => TASK_CATEGORY_LABELS[task.category],
    },
    {
      key: 'status',
      header: 'Status',
      render: (task) => (
        <Badge tone={STATUS_TONES[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      secondary: true,
      render: (task) => (
        <Badge tone={PRIORITY_TONES[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
      ),
    },
  ];

  if (!readOnly) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      render: (task) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            aria-label={`Edit task ${task.title}`}
            onClick={() => {
              setIsCreating(false);
              setEditing(task);
            }}
          >
            Edit
          </Button>
          <DeleteEntryButton resource="tasks" id={task.id} title={task.title} />
        </div>
      ),
    });
  }

  const showForm = !readOnly && (isCreating || editing !== null);

  return (
    <section className="flex flex-col gap-4">
      {readOnly ? null : (
        <EntryPageHeader
          title="Task log"
          addLabel="Add task"
          onAdd={() => {
            setEditing(null);
            setIsCreating(true);
          }}
        />
      )}

      {showForm ? (
        <TaskForm
          task={editing}
          onDone={() => {
            setEditing(null);
            setIsCreating(false);
          }}
        />
      ) : null}

      <FilterBar
        total={query.data?.meta.total}
        activeCount={filters.activeCount}
        onReset={filters.reset}
      >
        <Field label="From">
          {(ids) => (
            <DateInput
              id={ids.id}
              value={filters.value('from')}
              onChange={(event) => filters.set('from', event.target.value)}
            />
          )}
        </Field>
        <Field label="To">
          {(ids) => (
            <DateInput
              id={ids.id}
              value={filters.value('to')}
              onChange={(event) => filters.set('to', event.target.value)}
            />
          )}
        </Field>
        <Field label="Category">
          {(ids) => (
            <Select
              id={ids.id}
              placeholder="Any category"
              options={enumOptions(TASK_CATEGORIES, TASK_CATEGORY_LABELS)}
              value={filters.value('category')}
              onChange={(event) => filters.set('category', event.target.value)}
            />
          )}
        </Field>
        <Field label="Status">
          {(ids) => (
            <Select
              id={ids.id}
              placeholder="Any status"
              options={enumOptions(TASK_STATUSES, TASK_STATUS_LABELS)}
              value={filters.value('status')}
              onChange={(event) => filters.set('status', event.target.value)}
            />
          )}
        </Field>
        <Field label="Priority">
          {(ids) => (
            <Select
              id={ids.id}
              placeholder="Any priority"
              options={enumOptions(TASK_PRIORITIES, TASK_PRIORITY_LABELS)}
              value={filters.value('priority')}
              onChange={(event) => filters.set('priority', event.target.value)}
            />
          )}
        </Field>
      </FilterBar>

      <EntryList
        query={query}
        columns={columns}
        caption="Tasks"
        rowKey={(task) => task.id}
        emptyTitle={filters.activeCount > 0 ? 'No tasks match these filters' : 'No tasks yet'}
        emptyDescription={
          filters.activeCount > 0
            ? 'Try widening the date range or clearing a filter.'
            : readOnly
              ? undefined
              : 'Log what you worked on to build up your onboarding diary.'
        }
        page={filters.page}
        onPageChange={filters.setPage}
      />
    </section>
  );
}
