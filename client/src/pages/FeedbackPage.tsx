import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFeedbackSchema, CreateFeedbackInput, FeedbackEntry, PaginatedResponse, FeedbackType } from '@onboarding-diary/shared';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import api from '../services/api';

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'indigo' | 'orange' | 'purple';

const typeColors: Record<string, BadgeVariant> = {
  POSITIVE: 'green',
  SUGGESTION: 'blue',
  CONCERN: 'orange',
};

export default function FeedbackPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackEntry | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState<FeedbackEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('');

  const queryParams = new URLSearchParams({ page: String(page), limit: '20' });
  if (filterType) queryParams.set('type', filterType);

  const { data } = useQuery<PaginatedResponse<FeedbackEntry>>({
    queryKey: ['feedback', page, filterType],
    queryFn: () => api.get(`/feedback?${queryParams.toString()}`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateFeedbackInput) => api.post('/feedback', input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['feedback'] }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: CreateFeedbackInput & { id: string }) => api.put(`/feedback/${id}`, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['feedback'] }); setEditingFeedback(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/feedback/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['feedback'] }); setDeletingFeedback(null); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} />
          New Feedback
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 text-sm rounded-md ${!filterType ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          All
        </button>
        {Object.values(FeedbackType).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 text-sm rounded-md ${filterType === t ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {data?.data.length ? (
        <div className="grid gap-4">
          {data.data.map((fb) => (
            <div key={fb.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={typeColors[fb.type]}>{fb.type}</Badge>
                    <span className="text-xs text-gray-500">{new Date(fb.date).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-medium text-gray-900">{fb.subject}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {expandedId === fb.id ? fb.details : fb.details.slice(0, 150) + (fb.details.length > 150 ? '...' : '')}
                  </p>
                  {fb.details.length > 150 && (
                    <button
                      onClick={() => setExpandedId(expandedId === fb.id ? null : fb.id)}
                      className="flex items-center gap-1 text-xs text-indigo-600 mt-1 hover:text-indigo-500"
                    >
                      {expandedId === fb.id ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />Read more</>}
                    </button>
                  )}
                </div>
                <div className="flex gap-1 ml-4">
                  <button onClick={() => setEditingFeedback(fb)} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                  <button onClick={() => setDeletingFeedback(fb)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No feedback entries yet. Share your thoughts!" />
      )}

      {data && <Pagination currentPage={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      {showModal && (
        <FeedbackFormModal
          onClose={() => setShowModal(false)}
          onSubmit={(d) => createMutation.mutate(d)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingFeedback && (
        <FeedbackFormModal
          feedback={editingFeedback}
          onClose={() => setEditingFeedback(null)}
          onSubmit={(d) => updateMutation.mutate({ ...d, id: editingFeedback.id })}
          isLoading={updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingFeedback}
        onClose={() => setDeletingFeedback(null)}
        onConfirm={() => deletingFeedback && deleteMutation.mutate(deletingFeedback.id)}
        message={`Are you sure you want to delete "${deletingFeedback?.subject}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function FeedbackFormModal({
  feedback,
  onClose,
  onSubmit,
  isLoading,
}: {
  feedback?: FeedbackEntry;
  onClose: () => void;
  onSubmit: (data: CreateFeedbackInput) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFeedbackInput>({
    resolver: zodResolver(createFeedbackSchema),
    defaultValues: feedback
      ? { date: feedback.date.slice(0, 10), subject: feedback.subject, type: feedback.type, details: feedback.details }
      : { date: new Date().toISOString().slice(0, 10), type: 'POSITIVE' },
  });

  return (
    <Modal isOpen onClose={onClose} title={feedback ? 'Edit Feedback' : 'New Feedback'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" {...register('date')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input type="text" {...register('subject')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select {...register('type')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {Object.values(FeedbackType).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
          <textarea {...register('details')} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {errors.details && <p className="mt-1 text-sm text-red-600">{errors.details.message}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Saving...' : feedback ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
