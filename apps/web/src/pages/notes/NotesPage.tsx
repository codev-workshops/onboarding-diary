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
import { notesApi, type CreateNoteInput, type NoteEntryDto } from '@/api/notes.api';

const visibilityOptions = [
  { value: 'PRIVATE', label: 'Private' },
  { value: 'MANAGER_ONLY', label: 'Manager Only' },
  { value: 'PUBLIC', label: 'Public' },
];

const visibilityFilterOptions = [
  { value: '', label: 'All Visibility' },
  ...visibilityOptions,
];

function moodEmoji(rating: number | null): string {
  if (rating === null) return '';
  if (rating >= 5) return '😄';
  if (rating >= 4) return '🙂';
  if (rating >= 3) return '😐';
  if (rating >= 2) return '😕';
  return '😔';
}

export function NotesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [visibility, setVisibility] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NoteEntryDto | null>(null);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (visibility) params.visibility = visibility;

  const { data, isLoading } = useQuery({
    queryKey: ['notes', params],
    queryFn: () => notesApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: notesApi.remove,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4" />
              New Note
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select options={visibilityFilterOptions} value={visibility} onChange={(e) => { setVisibility(e.target.value); setPage(1); }} />
          </div>

          {isLoading ? <PageLoading /> : !data || data.data.length === 0 ? (
            <EmptyState title="No notes yet" description="Start journaling your onboarding experience" action={<Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> New Note</Button>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((note) => (
                <Card key={note.id} className="flex flex-col">
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{note.title}</h3>
                        {note.mood_rating && <span title={`Mood: ${note.mood_rating}/5`}>{moodEmoji(note.mood_rating)}</span>}
                      </div>
                      <StatusBadge status={note.visibility} />
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-3">{note.body}</p>
                    {note.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {note.tags.map((t) => (
                          <span key={t} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                    <span className="text-xs text-gray-500">{new Date(note.entry_date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditing(note); setModalOpen(true); }} className="text-gray-400 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(note.id); }} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </div>

        <NoteFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      </ErrorBoundary>
    </PageLayout>
  );
}

function NoteFormModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: NoteEntryDto | null }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateNoteInput>({
    values: editing ? {
      title: editing.title,
      body: editing.body,
      visibility: editing.visibility,
      mood_rating: editing.mood_rating ?? undefined,
      entry_date: editing.entry_date.substring(0, 10),
    } : undefined,
    defaultValues: { entry_date: new Date().toISOString().substring(0, 10) },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateNoteInput) => editing ? notesApi.update(editing.id, data) : notesApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); toast.success(editing ? 'Updated' : 'Created'); reset(); onClose(); },
    onError: () => toast.error('Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Note' : 'New Note'}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input id="title" label="Title" {...register('title', { required: 'Required', minLength: { value: 3, message: 'Min 3 chars' } })} error={errors.title?.message} />
        <Textarea id="body" label="Content" {...register('body', { required: 'Required', minLength: { value: 10, message: 'Min 10 chars' } })} error={errors.body?.message} />
        <div className="grid grid-cols-3 gap-4">
          <Select id="visibility" label="Visibility" options={visibilityOptions} {...register('visibility')} />
          <Input id="mood" label="Mood (1-5)" type="number" min={1} max={5} {...register('mood_rating', { valueAsNumber: true })} />
          <Input id="entry_date" label="Entry Date" type="date" {...register('entry_date')} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}
