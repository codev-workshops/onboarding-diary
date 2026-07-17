import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { Note } from '@/lib/types';
import { toDateInput } from '@/lib/utils';

interface NoteForm {
  date: string;
  title: string;
  content: string;
  tags: string;
}

function emptyForm(): NoteForm {
  return { date: toDateInput(new Date()), title: '', content: '', tags: '' };
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function NotesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState<NoteForm>(emptyForm());

  const query = useQuery({ queryKey: ['notes'], queryFn: () => api<Note[]>('/notes') });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['notes'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: NoteForm) => {
      const body = { ...payload, tags: parseTags(payload.tags) };
      return editing
        ? api<Note>(`/notes/${editing.id}`, { method: 'PUT', body })
        : api<Note>('/notes', { method: 'POST', body });
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/notes/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setForm({
      date: toDateInput(note.date),
      title: note.title,
      content: note.content,
      tags: note.tags.join(', '),
    });
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Additional Notes"
        description="Free-form notes with tags."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New note
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} />
      ) : query.data && query.data.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {query.data.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{note.title}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => openEdit(note)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => deleteMutation.mutate(note.id)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{toDateInput(note.date)}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{note.content}</p>
                {note.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {note.tags.map((t) => (
                      <Badge key={t} tone="info">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No notes yet" />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit note' : 'New note'}
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
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="note-date">Date</Label>
            <Input
              id="note-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="note-content">Content</Label>
            <Textarea
              id="note-content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="note-tags">Tags (comma-separated)</Label>
            <Input
              id="note-tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="week-1, reflection"
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
