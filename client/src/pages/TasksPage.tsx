import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Badge, toneFor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCategories } from '@/hooks/data';
import { api } from '@/lib/api';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants';
import type { Task } from '@/lib/types';
import { toDateInput } from '@/lib/utils';

interface TaskForm {
  date: string;
  title: string;
  description: string;
  categoryId: string;
  status: string;
  priority: string;
}

function emptyForm(): TaskForm {
  return {
    date: toDateInput(new Date()),
    title: '',
    description: '',
    categoryId: '',
    status: 'To Do',
    priority: 'Medium',
  };
}

export function TasksPage() {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm());

  const tasksQuery = useQuery({
    queryKey: ['tasks', statusFilter, categoryFilter],
    queryFn: () =>
      api<Task[]>('/tasks', {
        query: { status: statusFilter || undefined, categoryId: categoryFilter || undefined },
      }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['tasks'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: TaskForm) =>
      editing
        ? api<Task>(`/tasks/${editing.id}`, { method: 'PUT', body: payload })
        : api<Task>('/tasks', { method: 'POST', body: payload }),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm(), categoryId: categories?.[0]?.id ?? '' });
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setForm({
      date: toDateInput(task.date),
      title: task.title,
      description: task.description,
      categoryId: task.categoryId,
      status: task.status,
      priority: task.priority,
    });
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Task Log"
        description="Track onboarding tasks with status and priority."
        action={
          <Button onClick={openCreate} data-tour="new-task">
            <Plus className="h-4 w-4" /> New task
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {tasksQuery.isLoading ? (
        <LoadingState />
      ) : tasksQuery.isError ? (
        <ErrorState message={(tasksQuery.error as Error).message} />
      ) : tasksQuery.data && tasksQuery.data.length > 0 ? (
        <div className="space-y-3">
          {tasksQuery.data.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{task.title}</span>
                    <Badge tone={toneFor(task.status)}>{task.status}</Badge>
                    <Badge tone={toneFor(task.priority)}>{task.priority}</Badge>
                    {task.category ? <Badge tone="primary">{task.category.name}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {toDateInput(task.date)} — {task.description || 'No description'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(task)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => deleteMutation.mutate(task.id)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No tasks yet" hint="Create your first task to get started." />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit task' : 'New task'}
        onClose={() => setModalOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
        >
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-date">Date</Label>
              <Input
                id="task-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="task-category">Category</Label>
              <Select
                id="task-category"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select…
                </option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-status">Status</Label>
              <Select
                id="task-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                id="task-priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {saveMutation.isError ? (
            <p className="text-sm text-danger" role="alert">
              {(saveMutation.error as Error).message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
