import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { tasksApi, type CreateTaskInput, type TaskEntryDto } from '@/api/tasks.api';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const statusFormOptions = statusOptions.slice(1);
const priorityFormOptions = [
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const visibilityOptions = [
  { value: 'MANAGER_ONLY', label: 'Manager Only' },
  { value: 'PRIVATE', label: 'Private' },
  { value: 'PUBLIC', label: 'Public' },
];

export function TasksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaskEntryDto | null>(null);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (status) params.status = status;
  if (priority) params.priority = priority;

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', params],
    queryFn: () => tasksApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (task: TaskEntryDto) => {
    setEditing(task);
    setModalOpen(true);
  };

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select
              options={statusOptions}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            />
            <Select
              options={priorityOptions}
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {isLoading ? (
            <PageLoading />
          ) : !data || data.data.length === 0 ? (
            <EmptyState
              title="No tasks found"
              description="Create your first task to get started"
              action={
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  New Task
                </Button>
              }
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="px-6 py-3 font-medium">Title</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Priority</th>
                      <th className="px-6 py-3 font-medium">Due Date</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((task) => (
                      <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">{task.title}</span>
                          {task.tags.length > 0 && (
                            <div className="mt-1 flex gap-1">
                              {task.tags.slice(0, 3).map((t) => (
                                <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={task.priority} />
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(task.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(task)} className="text-gray-400 hover:text-blue-600">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this task?')) deleteMutation.mutate(task.id);
                              }}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={data.meta} onPageChange={setPage} />
            </Card>
          )}
        </div>

        <TaskFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editing}
        />
      </ErrorBoundary>
    </PageLayout>
  );
}

function TaskFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: TaskEntryDto | null;
}) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateTaskInput>({
    values: editing
      ? {
          title: editing.title,
          description: editing.description ?? '',
          status: editing.status,
          priority: editing.priority,
          visibility: editing.visibility,
          due_date: editing.due_date?.substring(0, 10) ?? '',
          tags: editing.tags,
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskInput) =>
      editing ? tasksApi.update(editing.id, data) : tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(editing ? 'Task updated' : 'Task created');
      reset();
      onClose();
    },
    onError: () => toast.error(editing ? 'Failed to update' : 'Failed to create'),
  });

  const onSubmit = (data: CreateTaskInput) => {
    const payload = { ...data };
    if (!payload.due_date) delete payload.due_date;
    if (!payload.description) delete payload.description;
    createMutation.mutate(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Task' : 'New Task'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="title"
          label="Title"
          {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'Min 3 chars' } })}
          error={errors.title?.message}
        />
        <Textarea id="description" label="Description" {...register('description')} />
        <div className="grid grid-cols-2 gap-4">
          <Select id="status" label="Status" options={statusFormOptions} {...register('status')} />
          <Select id="priority" label="Priority" options={priorityFormOptions} {...register('priority')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select id="visibility" label="Visibility" options={visibilityOptions} {...register('visibility')} />
          <Input id="due_date" label="Due Date" type="date" {...register('due_date')} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
