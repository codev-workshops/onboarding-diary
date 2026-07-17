import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { TaskComments } from '@/components/TaskComments';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Badge, toneFor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/auth/AuthContext';
import { useCategories, useTeamOverview } from '@/hooks/data';
import { api } from '@/lib/api';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants';
import type { Task } from '@/lib/types';
import { isTaskOverdue, toDateInput } from '@/lib/utils';

const PAGE_SIZE = 8;

interface TaskForm {
  date: string;
  title: string;
  description: string;
  categoryId: string;
  status: string;
  priority: string;
  dueDate: string;
  ownerId: string;
}

function emptyForm(): TaskForm {
  return {
    date: toDateInput(new Date()),
    title: '',
    description: '',
    categoryId: '',
    status: 'To Do',
    priority: 'Medium',
    dueDate: '',
    ownerId: '',
  };
}

export function TasksPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canScope = user?.role === 'Manager' || user?.role === 'Admin';
  const { data: categories } = useCategories();
  const teamQuery = useTeamOverview(canScope);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm());
  const [commenting, setCommenting] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const tasksQuery = useQuery({
    queryKey: ['tasks', statusFilter, categoryFilter],
    queryFn: () =>
      api<Task[]>('/tasks', {
        query: { status: statusFilter || undefined, categoryId: categoryFilter || undefined },
      }),
  });

  // Deep-link to a task's comments from the activity indicator (?taskId=...).
  const deepLinkId = searchParams.get('taskId');
  useEffect(() => {
    if (!deepLinkId || !tasksQuery.data) return;
    const target = tasksQuery.data.find((t) => t.id === deepLinkId);
    if (target) setCommenting(target);
    const next = new URLSearchParams(searchParams);
    next.delete('taskId');
    setSearchParams(next, { replace: true });
  }, [deepLinkId, tasksQuery.data, searchParams, setSearchParams]);

  // Overdue deep-link from the dashboard reminder (?overdue=1) hides completed
  // tasks so the outstanding work is front and centre.
  const overdueLink = searchParams.get('overdue');
  useEffect(() => {
    if (overdueLink !== '1') return;
    setShowCompleted(false);
    const next = new URLSearchParams(searchParams);
    next.delete('overdue');
    setSearchParams(next, { replace: true });
  }, [overdueLink, searchParams, setSearchParams]);

  // Client-side date/search/completed filtering over the scoped result set, then
  // paginate so the list never grows unbounded (docs/ASSUMPTIONS.md §22).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tasksQuery.data ?? []).filter((t) => {
      if (!showCompleted && statusFilter !== 'Done' && t.status === 'Done') return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) {
        return false;
      }
      const day = toDateInput(t.date);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [tasksQuery.data, search, showCompleted, statusFilter, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  // Reset to the first page whenever the active filters change.
  useEffect(() => {
    setPage(0);
  }, [search, dateFrom, dateTo, showCompleted, statusFilter, categoryFilter]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['tasks'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: TaskForm) => {
      const body: Record<string, unknown> = {
        date: payload.date,
        title: payload.title,
        description: payload.description,
        categoryId: payload.categoryId,
        status: payload.status,
        priority: payload.priority,
        dueDate: payload.dueDate || null,
      };
      // Owner is only assignable at creation and only for Managers/Admins; the
      // server re-validates access and ignores it on edit.
      if (!editing && payload.ownerId) body.ownerId = payload.ownerId;
      return editing
        ? api<Task>(`/tasks/${editing.id}`, { method: 'PUT', body })
        : api<Task>('/tasks', { method: 'POST', body });
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast.success(editing ? 'Task updated' : 'Task created');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
      toast.success('Task deleted');
    },
    onError: (e) => {
      setConfirmDelete(null);
      toast.error((e as Error).message);
    },
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
      dueDate: task.dueDate ? toDateInput(task.dueDate) : '',
      ownerId: task.ownerId,
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

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search tasks"
            placeholder="Search title or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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
        <div>
          <Label htmlFor="task-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="task-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-auto"
          />
        </div>
        <div>
          <Label htmlFor="task-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="task-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-auto"
          />
        </div>
        <label className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Show completed
        </label>
      </div>

      {tasksQuery.isLoading ? (
        <LoadingState />
      ) : tasksQuery.isError ? (
        <ErrorState message={(tasksQuery.error as Error).message} />
      ) : (tasksQuery.data?.length ?? 0) === 0 ? (
        <EmptyState title="No tasks yet" hint="Create your first task to get started." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching tasks"
          hint="Try adjusting your filters or showing completed tasks."
        />
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((task) => (
              <Card key={task.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{task.title}</span>
                      <Badge tone={toneFor(task.status)}>{task.status}</Badge>
                      <Badge tone={toneFor(task.priority)}>{task.priority}</Badge>
                      {task.category ? <Badge tone="primary">{task.category.name}</Badge> : null}
                      {task.owner && task.owner.id !== user?.id ? (
                        <Badge tone="info">{task.owner.name}</Badge>
                      ) : null}
                      {isTaskOverdue(task, user?.timezone) ? (
                        <Badge tone="danger">Overdue</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {toDateInput(task.date)} — {task.description || 'No description'}
                      {task.dueDate ? ` · Due ${toDateInput(task.dueDate)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Comments for ${task.title}`}
                      onClick={() => setCommenting(task)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(task)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => setConfirmDelete(task)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pageCount > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {pageCount} · {filtered.length} tasks
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
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
          {!editing && canScope ? (
            <div>
              <Label htmlFor="task-owner">Owner</Label>
              <Select
                id="task-owner"
                value={form.ownerId}
                onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              >
                <option value="">Myself</option>
                {teamQuery.data?.recruits.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Assign this task to a recruit you oversee, or leave as yourself.
              </p>
            </div>
          ) : null}
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
            <div>
              <Label htmlFor="task-due">Due date (optional)</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
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

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete task?"
        message={
          confirmDelete
            ? `"${confirmDelete.title}" will be permanently removed. This cannot be undone.`
            : ''
        }
        pending={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      {commenting ? (
        <TaskComments task={commenting} onClose={() => setCommenting(null)} />
      ) : null}
    </div>
  );
}
