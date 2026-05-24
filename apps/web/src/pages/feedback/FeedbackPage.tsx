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
import { feedbackApi, type CreateFeedbackInput, type FeedbackEntryDto } from '@/api/feedback.api';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'POSITIVE', label: 'Positive' },
  { value: 'NEUTRAL', label: 'Neutral' },
  { value: 'CONSTRUCTIVE', label: 'Constructive' },
];

const typeFormOptions = [
  { value: 'POSITIVE', label: 'Positive' },
  { value: 'NEUTRAL', label: 'Neutral' },
  { value: 'CONSTRUCTIVE', label: 'Constructive' },
];

export function FeedbackPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeedbackEntryDto | null>(null);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (type) params.type = type;

  const { data, isLoading } = useQuery({
    queryKey: ['feedback', params],
    queryFn: () => feedbackApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: feedbackApi.remove,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['feedback'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4" />
              Give Feedback
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select options={typeOptions} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} />
          </div>

          {isLoading ? <PageLoading /> : !data || data.data.length === 0 ? (
            <EmptyState title="No feedback yet" description="Give feedback to a team member" />
          ) : (
            <div className="space-y-3">
              {data.data.map((fb) => (
                <Card key={fb.id}>
                  <div className="flex items-start justify-between p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{fb.title}</h3>
                        <StatusBadge status={fb.type} />
                        {fb.rating && (
                          <span className="text-sm text-yellow-600">{'★'.repeat(fb.rating)}</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{fb.body}</p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                        <span>From: {fb.author.first_name} {fb.author.last_name}</span>
                        <span>To: {fb.subject.first_name} {fb.subject.last_name}</span>
                        <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <button onClick={() => { setEditing(fb); setModalOpen(true); }} className="text-gray-400 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(fb.id); }} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </Card>
              ))}
              <Pagination meta={data.meta} onPageChange={setPage} />
            </div>
          )}
        </div>

        <FeedbackFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      </ErrorBoundary>
    </PageLayout>
  );
}

function FeedbackFormModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: FeedbackEntryDto | null }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateFeedbackInput>({
    values: editing ? { subject_id: editing.subject_id, title: editing.title, body: editing.body, type: editing.type, rating: editing.rating ?? undefined } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateFeedbackInput) => editing ? feedbackApi.update(editing.id, data) : feedbackApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['feedback'] }); toast.success(editing ? 'Updated' : 'Sent'); reset(); onClose(); },
    onError: () => toast.error('Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Feedback' : 'Give Feedback'}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        {!editing && (
          <Input id="subject_id" label="Subject User ID" {...register('subject_id', { required: 'Required' })} error={errors.subject_id?.message} placeholder="Paste the user ID of the recipient" />
        )}
        <Input id="title" label="Title" {...register('title', { required: 'Required', minLength: { value: 3, message: 'Min 3 chars' } })} error={errors.title?.message} />
        <Textarea id="body" label="Details" {...register('body', { required: 'Required', minLength: { value: 10, message: 'Min 10 chars' } })} error={errors.body?.message} />
        <div className="grid grid-cols-2 gap-4">
          <Select id="type" label="Type" options={typeFormOptions} {...register('type')} />
          <Input id="rating" label="Rating (1-5)" type="number" min={1} max={5} {...register('rating', { valueAsNumber: true })} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Send'}</Button>
        </div>
      </form>
    </Modal>
  );
}
