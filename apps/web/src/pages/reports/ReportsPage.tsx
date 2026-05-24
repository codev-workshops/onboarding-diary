import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Download, Trash2, FileText } from 'lucide-react';
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
import { reportsApi, type CreateReportInput } from '@/api/reports.api';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'FINAL', label: 'Final' },
  { value: 'CUSTOM', label: 'Custom' },
];

const typeFormOptions = typeOptions.slice(1);

const contentTypeOptions = [
  { value: 'COMBINED', label: 'Combined (All)' },
  { value: 'TASKS', label: 'Tasks Only' },
  { value: 'ISSUES', label: 'Issues Only' },
  { value: 'FEEDBACK', label: 'Feedback Only' },
];

export function ReportsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (type) params.type = type;

  const { data, isLoading } = useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportsApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: reportsApi.remove,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reports'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleDownload = async (id: string, format: 'PDF' | 'CSV') => {
    try {
      const blob = await reportsApi.download(id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report.${format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${format}`);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Generate Report
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select options={typeOptions} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} />
          </div>

          {isLoading ? <PageLoading /> : !data || data.data.length === 0 ? (
            <EmptyState icon={<FileText className="mx-auto h-12 w-12" />} title="No reports yet" description="Generate your first report" action={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Generate Report</Button>} />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="px-6 py-3 font-medium">Title</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Period</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((report) => (
                      <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{report.title}</td>
                        <td className="px-6 py-4"><StatusBadge status={report.type} /></td>
                        <td className="px-6 py-4"><StatusBadge status={report.status} /></td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{new Date(report.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDownload(report.id, 'PDF')} className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50" title="Download PDF">
                              <Download className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDownload(report.id, 'CSV')} className="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50" title="Download CSV">
                              CSV
                            </button>
                            <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(report.id); }} className="text-gray-400 hover:text-red-600 px-2 py-1">
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

        <GenerateReportModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </ErrorBoundary>
    </PageLayout>
  );
}

function GenerateReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateReportInput>();

  const mutation = useMutation({
    mutationFn: reportsApi.generate,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reports'] }); toast.success('Report generated'); reset(); onClose(); },
    onError: () => toast.error('Failed to generate report'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Generate Report" size="lg">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input id="recruit_id" label="Recruit User ID" {...register('recruit_id', { required: 'Required' })} error={errors.recruit_id?.message} placeholder="UUID of the recruit" />
        <Input id="title" label="Report Title" {...register('title', { required: 'Required' })} error={errors.title?.message} />
        <Textarea id="summary" label="Summary (optional)" {...register('summary')} />
        <div className="grid grid-cols-2 gap-4">
          <Select id="type" label="Report Type" options={typeFormOptions} {...register('type')} />
          <Select id="content_type" label="Content" options={contentTypeOptions} {...register('content_type')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input id="period_start" label="Period Start" type="date" {...register('period_start', { required: 'Required' })} error={errors.period_start?.message} />
          <Input id="period_end" label="Period End" type="date" {...register('period_end', { required: 'Required' })} error={errors.period_end?.message} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Generate</Button>
        </div>
      </form>
    </Modal>
  );
}
