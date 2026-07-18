import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
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
import { api } from '@/lib/api';
import { FEEDBACK_TYPES } from '@/lib/constants';
import type { Feedback } from '@/lib/types';
import { toDateInput } from '@/lib/utils';

interface FeedbackForm {
  date: string;
  subject: string;
  type: string;
  details: string;
}

function emptyForm(): FeedbackForm {
  return { date: toDateInput(new Date()), subject: '', type: 'Positive', details: '' };
}

export function FeedbackPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Feedback | null>(null);
  const [form, setForm] = useState<FeedbackForm>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<Feedback | null>(null);

  const query = useQuery({
    queryKey: ['feedback', typeFilter],
    queryFn: () => api<Feedback[]>('/feedback', { query: { type: typeFilter || undefined } }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['feedback'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: FeedbackForm) =>
      editing
        ? api<Feedback>(`/feedback/${editing.id}`, { method: 'PUT', body: payload })
        : api<Feedback>('/feedback', { method: 'POST', body: payload }),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast.success(editing ? 'Feedback updated' : 'Feedback created');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/feedback/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
      toast.success('Feedback deleted');
    },
    onError: (e) => {
      setConfirmDelete(null);
      toast.error((e as Error).message);
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(item: Feedback) {
    setEditing(item);
    setForm({
      date: toDateInput(item.date),
      subject: item.subject,
      type: item.type,
      details: item.details,
    });
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Feedback Notes"
        description="Capture positive notes, suggestions, and concerns."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New feedback
          </Button>
        }
      />

      <div className="mb-4 flex gap-3">
        <Select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All types</option>
          {FEEDBACK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} />
      ) : query.data && query.data.length > 0 ? (
        <div className="space-y-3">
          {query.data.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.subject}</span>
                    <Badge tone={toneFor(item.type)}>{item.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {toDateInput(item.date)} — {item.details || 'No details'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => setConfirmDelete(item)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No feedback yet" />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit feedback' : 'New feedback'}
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
            <Label htmlFor="fb-subject">Subject</Label>
            <Input
              id="fb-subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fb-date">Date</Label>
              <Input
                id="fb-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="fb-type">Type</Label>
              <Select
                id="fb-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {FEEDBACK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="fb-details">Details</Label>
            <Textarea
              id="fb-details"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
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
        title="Delete feedback?"
        message={confirmDelete ? `"${confirmDelete.subject}" will be permanently removed.` : ''}
        pending={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
