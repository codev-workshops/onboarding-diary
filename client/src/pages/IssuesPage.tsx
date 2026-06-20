import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createIssueSchema, CreateIssueInput, IssueEntry, PaginatedResponse, IssueSeverity, IssueStatus } from '@onboarding-diary/shared';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import api from '../services/api';

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'indigo' | 'orange' | 'purple';

const severityColors: Record<string, BadgeVariant> = {
  LOW: 'gray',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};

const statusColors: Record<string, BadgeVariant> = {
  OPEN: 'red',
  IN_PROGRESS: 'blue',
  RESOLVED: 'green',
  CLOSED: 'gray',
};

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueEntry | null>(null);
  const [deletingIssue, setDeletingIssue] = useState<IssueEntry | null>(null);
  const [filters, setFilters] = useState({ status: '', severity: '' });

  const queryParams = new URLSearchParams({ page: String(page), limit: '20' });
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.severity) queryParams.set('severity', filters.severity);

  const { data } = useQuery<PaginatedResponse<IssueEntry>>({
    queryKey: ['issues', page, filters],
    queryFn: () => api.get(`/issues?${queryParams.toString()}`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateIssueInput) => api.post('/issues', input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: CreateIssueInput & { id: string }) => api.put(`/issues/${id}`, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }); setEditingIssue(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/issues/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }); setDeletingIssue(null); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} />
          New Issue
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              {Object.values(IssueStatus).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => { setFilters({ ...filters, severity: e.target.value }); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              {Object.values(IssueSeverity).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={() => setFilters({ status: '', severity: '' })}
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.data.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{new Date(issue.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{issue.title}</td>
                  <td className="px-4 py-3"><Badge variant={severityColors[issue.severity]}>{issue.severity}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={statusColors[issue.status]}>{issue.status.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingIssue(issue)} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                    <button onClick={() => setDeletingIssue(issue)} className="p-1 text-gray-400 hover:text-red-600 ml-1"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No issues found. That's great!" />
        )}
      </div>

      {data && <Pagination currentPage={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      {showModal && (
        <IssueFormModal
          onClose={() => setShowModal(false)}
          onSubmit={(d) => createMutation.mutate(d)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingIssue && (
        <IssueFormModal
          issue={editingIssue}
          onClose={() => setEditingIssue(null)}
          onSubmit={(d) => updateMutation.mutate({ ...d, id: editingIssue.id })}
          isLoading={updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingIssue}
        onClose={() => setDeletingIssue(null)}
        onConfirm={() => deletingIssue && deleteMutation.mutate(deletingIssue.id)}
        message={`Are you sure you want to delete "${deletingIssue?.title}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function IssueFormModal({
  issue,
  onClose,
  onSubmit,
  isLoading,
}: {
  issue?: IssueEntry;
  onClose: () => void;
  onSubmit: (data: CreateIssueInput) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CreateIssueInput>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: issue
      ? { date: issue.date.slice(0, 10), title: issue.title, description: issue.description, severity: issue.severity, status: issue.status, resolutionNotes: issue.resolutionNotes }
      : { date: new Date().toISOString().slice(0, 10), status: 'OPEN', severity: 'MEDIUM' },
  });

  const status = watch('status');
  const showResolution = status === 'RESOLVED' || status === 'CLOSED';

  return (
    <Modal isOpen onClose={onClose} title={issue ? 'Edit Issue' : 'New Issue'}>
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
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select {...register('severity')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {Object.values(IssueSeverity).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register('status')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {Object.values(IssueStatus).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        {showResolution && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
            <textarea {...register('resolutionNotes')} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.resolutionNotes && <p className="mt-1 text-sm text-red-600">{errors.resolutionNotes.message}</p>}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Saving...' : issue ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
