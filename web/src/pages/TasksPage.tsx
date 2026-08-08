import { EntryLog } from '../components/EntryLog';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '../lib/types';

export const TasksPage = () => (
  <EntryLog
    resource="tasks"
    title="Task log"
    description="Log what you worked on each day of your onboarding."
    newEntryLabel="New task"
    filterFields={['category', 'status']}
    fields={[
      { name: 'date', label: 'Date', kind: 'date', required: true },
      {
        name: 'title',
        label: 'Title',
        kind: 'text',
        required: true,
        placeholder: 'Set up laptop and access',
      },
      {
        name: 'category',
        label: 'Category',
        kind: 'select',
        options: TASK_CATEGORIES,
        badge: true,
      },
      { name: 'status', label: 'Status', kind: 'select', options: TASK_STATUSES, badge: true },
      {
        name: 'priority',
        label: 'Priority',
        kind: 'select',
        options: TASK_PRIORITIES,
        badge: true,
      },
      {
        name: 'description',
        label: 'Description',
        kind: 'textarea',
        formOnly: true,
        placeholder: 'What did you do, and what is left?',
      },
    ]}
  />
);
