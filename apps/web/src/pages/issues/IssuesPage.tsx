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
import { issuesApi, type CreateIssueInput, type IssueEntryDto } from '@/api/issues.api';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const severityOptions = [
  { value: '', label: 'All Severities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const statusFormOptions = statusOptions.slice(1);
const severityFormOptions = [
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

export function IssuesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IssueEntryDto | null>(null);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (status) params.status = status;
  if (severity) params.severity = severity;

  const { data, isLoading } = useQuery({
    queryKey: ['issues', params],
    queryFn: () => issuesApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: issuesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue deleted');
    },
    onError: () => toast.error('Failed to delete issue'),
  });

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (issue: IssueEntryDto) => { setEditing(issue); setModalOpen(true); };

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New Issue
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select options={statusOptions} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
            <Select options={severityOptions} value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }} />
          </div>

          {isLoading ? (
            <PageLoading />
          ) : !data || data.data.length === 0 ? (
            <EmptyState title="No issues found" description="Create an issue to track blockers" action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Issue</Button>} />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="px-6 py-3 font-medium">Title</th>
                      <th className="px-6 py-3 font-medium">Severity</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((issue) => (
                      <tr key={issue.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{issue.title}</td>
                        <td className="px-6 py-4"><StatusBadge status={issue.severity} /></td>
                        <td className="px-6 py-4"><StatusBadge status={issue.status} /></td>
                        <td className="px-6 py-4 text-gray-500">{new Date(issue.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(issue)} className="text-gray-400 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(issue.id); }} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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

        <IssueFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      </ErrorBoundary>
    </PageLayout>
  );
}

function IssueFormModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: IssueEntryDto | null }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateIssueInput>({
    values: editing ? { title: editing.title, description: editing.description, severity: editing.severity, status: editing.status, visibility: editing.visibility } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateIssueInput) => editing ? issuesApi.update(editing.id, data) : issuesApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }); toast.success(editing ? 'Updated' : 'Created'); reset(); onClose(); },
    onError: () => toast.error('Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Issue' : 'New Issue'}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input id="title" label="Title" {...register('title', { required: 'Required', minLength: { value: 3, message: 'Min 3 chars' } })} error={errors.title?.message} />
        <Textarea id="description" label="Description" {...register('description', { required: 'Required', minLength: { value: 10, message: 'Min 10 chars' } })} error={errors.description?.message} />
        <div className="grid grid-cols-2 gap-4">
          <Select id="severity" label="Severity" options={severityFormOptions} {...register('severity')} />
          {editing && <Select id="status" label="Status" options={statusFormOptions} {...register('status')} />}
        </div>
        <Select id="visibility" label="Visibility" options={visibilityOptions} {...register('visibility')} />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}
