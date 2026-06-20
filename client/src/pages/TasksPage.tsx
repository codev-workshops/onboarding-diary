import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, CreateTaskInput, TaskEntry, PaginatedResponse, TaskCategory, TaskStatus, TaskPriority } from '@onboarding-diary/shared';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import api from '../services/api';

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'indigo' | 'orange' | 'purple';

const categoryColors: Record<string, BadgeVariant> = {
  LEARNING: 'blue',
  SETUP: 'purple',
  MEETING: 'indigo',
  PROJECT: 'green',
  OTHER: 'gray',
};

const statusColors: Record<string, BadgeVariant> = {
  NOT_STARTED: 'gray',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  BLOCKED: 'red',
};

const priorityColors: Record<string, BadgeVariant> = {
  LOW: 'gray',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  URGENT: 'red',
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskEntry | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskEntry | null>(null);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', category: '', status: '' });

  const queryParams = new URLSearchParams({ page: String(page), limit: '20' });
  if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);
  if (filters.category) queryParams.set('category', filters.category);
  if (filters.status) queryParams.set('status', filters.status);

  const { data } = useQuery<PaginatedResponse<TaskEntry>>({
    queryKey: ['tasks', page, filters],
    queryFn: () => api.get(`/tasks?${queryParams.toString()}`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateTaskInput) => api.post('/tasks', input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: CreateTaskInput & { id: string }) => api.put(`/tasks/${id}`, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setEditingTask(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setDeletingTask(null); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              {Object.values(TaskCategory).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              {Object.values(TaskStatus).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button
            onClick={() => setFilters({ dateFrom: '', dateTo: '', category: '', status: '' })}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {data?.data.length ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.data.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{new Date(task.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{task.title}</td>
                  <td className="px-4 py-3"><Badge variant={categoryColors[task.category]}>{task.category}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={statusColors[task.status]}>{task.status.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={priorityColors[task.priority]}>{task.priority}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingTask(task)} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                    <button onClick={() => setDeletingTask(task)} className="p-1 text-gray-400 hover:text-red-600 ml-1"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No tasks found. Create your first task!" />
        )}
      </div>

      {data && <Pagination currentPage={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      {showModal && (
        <TaskFormModal
          onClose={() => setShowModal(false)}
          onSubmit={(d) => createMutation.mutate(d)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingTask && (
        <TaskFormModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={(d) => updateMutation.mutate({ ...d, id: editingTask.id })}
          isLoading={updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={() => deletingTask && deleteMutation.mutate(deletingTask.id)}
        message={`Are you sure you want to delete "${deletingTask?.title}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function TaskFormModal({
  task,
  onClose,
  onSubmit,
  isLoading,
}: {
  task?: TaskEntry;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: task
      ? { date: task.date.slice(0, 10), title: task.title, description: task.description, category: task.category, status: task.status, priority: task.priority }
      : { date: new Date().toISOString().slice(0, 10), status: 'NOT_STARTED', priority: 'MEDIUM' },
  });

  return (
    <Modal isOpen onClose={onClose} title={task ? 'Edit Task' : 'New Task'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" {...register('date')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" {...register('title')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea {...register('description')} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select {...register('category')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {Object.values(TaskCategory).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register('status')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {Object.values(TaskStatus).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select {...register('priority')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {Object.values(TaskPriority).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Saving...' : task ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
