import { useParams } from 'react-router-dom';
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from '../../api/entries';
import EntryFormShell from '../../components/EntryFormShell';
import Field from '../../components/Field';
import OptionSelect from '../../components/OptionSelect';
import { today } from '../../dates';
import { useEntryForm } from '../../hooks/useEntryForm';

interface TaskForm {
  entryDate: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
}

export default function TaskFormPage() {
  const { id } = useParams();
  const { form, setField, errors, ...state } = useEntryForm<TaskForm, Task>({
    resource: '/api/tasks',
    listPath: '/tasks',
    id,
    initial: {
      entryDate: today(),
      title: '',
      description: '',
      category: 'TRAINING',
      status: 'TODO',
      priority: 'MEDIUM',
    },
    fromDto: (task) => ({ ...task, description: task.description ?? '' }),
  });

  return (
    <EntryFormShell
      title={id ? 'Edit task' : 'New task'}
      listPath="/tasks"
      isEdit={Boolean(id)}
      loading={state.loading}
      saving={state.saving}
      formError={state.formError}
      onSubmit={state.submit}
      onDelete={state.remove}
    >
      <div className="form-row">
        <Field label="Date" htmlFor="entryDate" error={errors.entryDate} required>
          <input id="entryDate" type="date" value={form.entryDate} onChange={(e) => setField('entryDate', e.target.value)} required />
        </Field>
        <Field label="Category" htmlFor="category" error={errors.category} required>
          <OptionSelect id="category" options={TASK_CATEGORIES} value={form.category} onChange={(v) => setField('category', v as TaskCategory)} />
        </Field>
      </div>
      <Field label="Title" htmlFor="title" error={errors.title} required>
        <input id="title" maxLength={120} value={form.title} onChange={(e) => setField('title', e.target.value)} required />
      </Field>
      <Field label="Description" htmlFor="description" error={errors.description}>
        <textarea id="description" maxLength={4000} rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)} />
      </Field>
      <div className="form-row">
        <Field label="Status" htmlFor="status" error={errors.status} required>
          <OptionSelect id="status" options={TASK_STATUSES} value={form.status} onChange={(v) => setField('status', v as TaskStatus)} />
        </Field>
        <Field label="Priority" htmlFor="priority" error={errors.priority} required>
          <OptionSelect id="priority" options={TASK_PRIORITIES} value={form.priority} onChange={(v) => setField('priority', v as TaskPriority)} />
        </Field>
      </div>
    </EntryFormShell>
  );
}
