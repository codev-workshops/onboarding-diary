import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createNoteSchema, CreateNoteInput, NoteEntry, PaginatedResponse } from '@onboarding-diary/shared';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import api from '../services/api';

export default function NotesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteEntry | null>(null);
  const [deletingNote, setDeletingNote] = useState<NoteEntry | null>(null);
  const [filterTag, setFilterTag] = useState('');

  const queryParams = new URLSearchParams({ page: String(page), limit: '20' });
  if (filterTag) queryParams.set('tag', filterTag);

  const { data } = useQuery<PaginatedResponse<NoteEntry>>({
    queryKey: ['notes', page, filterTag],
    queryFn: () => api.get(`/notes?${queryParams.toString()}`).then((r) => r.data),
  });

  const allTags = data?.data
    ? [...new Set(data.data.flatMap((n) => n.tags))]
    : [];

  const createMutation = useMutation({
    mutationFn: (input: CreateNoteInput) => api.post('/notes', input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: CreateNoteInput & { id: string }) => api.put(`/notes/${id}`, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); setEditingNote(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); setDeletingNote(null); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTag('')}
            className={`px-3 py-1 text-sm rounded-full ${!filterTag ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`px-3 py-1 text-sm rounded-full ${filterTag === tag ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {data?.data.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.data.map((note) => (
            <div key={note.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">{new Date(note.date).toLocaleDateString()}</p>
                  <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{note.content}</p>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {note.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={filterTag === tag ? 'indigo' : 'gray'}
                          className="cursor-pointer"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => setEditingNote(note)} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                  <button onClick={() => setDeletingNote(note)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No notes yet. Start documenting your journey!" />
      )}

      {data && <Pagination currentPage={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      {showModal && (
        <NoteFormModal
          onClose={() => setShowModal(false)}
          onSubmit={(d) => createMutation.mutate(d)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingNote && (
        <NoteFormModal
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSubmit={(d) => updateMutation.mutate({ ...d, id: editingNote.id })}
          isLoading={updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingNote}
        onClose={() => setDeletingNote(null)}
        onConfirm={() => deletingNote && deleteMutation.mutate(deletingNote.id)}
        message={`Are you sure you want to delete "${deletingNote?.title}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function NoteFormModal({
  note,
  onClose,
  onSubmit,
  isLoading,
}: {
  note?: NoteEntry;
  onClose: () => void;
  onSubmit: (data: CreateNoteInput) => void;
  isLoading: boolean;
}) {
  const [tagsInput, setTagsInput] = useState(note?.tags.join(', ') || '');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: note
      ? { date: note.date.slice(0, 10), title: note.title, content: note.content, tags: note.tags }
      : { date: new Date().toISOString().slice(0, 10), tags: [] },
  });

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tags = value.split(',').map((t) => t.trim()).filter(Boolean);
    setValue('tags', tags);
  };

  return (
    <Modal isOpen onClose={onClose} title={note ? 'Edit Note' : 'New Note'}>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea {...register('content')} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="e.g. onboarding, setup, tools"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.tags && <p className="mt-1 text-sm text-red-600">{errors.tags.message}</p>}
          {tagsInput && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tagsInput.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                <Badge key={tag} variant="indigo">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Saving...' : note ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
