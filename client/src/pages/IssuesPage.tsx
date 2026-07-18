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
import { ISSUE_SEVERITIES, ISSUE_STATUSES } from '@/lib/constants';
import type { Issue } from '@/lib/types';
import { toDateInput } from '@/lib/utils';

interface IssueForm {
  date: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  resolutionNotes: string;
}

function emptyForm(): IssueForm {
  return {
    date: toDateInput(new Date()),
    title: '',
    description: '',
    severity: 'Medium',
    status: 'Open',
    resolutionNotes: '',
  };
}

export function IssuesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [form, setForm] = useState<IssueForm>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<Issue | null>(null);

  const query = useQuery({
    queryKey: ['issues', statusFilter, severityFilter],
    queryFn: () =>
      api<Issue[]>('/issues', {
        query: { status: statusFilter || undefined, severity: severityFilter || undefined },
      }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['issues'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: IssueForm) =>
      editing
        ? api<Issue>(`/issues/${editing.id}`, { method: 'PUT', body: payload })
        : api<Issue>('/issues', { method: 'POST', body: payload }),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast.success(editing ? 'Issue updated' : 'Issue created');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/issues/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
      toast.success('Issue deleted');
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

  function openEdit(issue: Issue) {
    setEditing(issue);
    setForm({
      date: toDateInput(issue.date),
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      resolutionNotes: issue.resolutionNotes ?? '',
    });
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Issue Log"
        description="Record blockers and their resolution."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New issue
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All statuses</option>
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">All severities</option>
          {ISSUE_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
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
          {query.data.map((issue) => (
            <Card key={issue.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{issue.title}</span>
                    <Badge tone={toneFor(issue.status)}>{issue.status}</Badge>
                    <Badge tone={toneFor(issue.severity)}>{issue.severity}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {toDateInput(issue.date)} — {issue.description || 'No description'}
                  </p>
                  {issue.resolutionNotes ? (
                    <p className="mt-1 text-sm text-success">Resolution: {issue.resolutionNotes}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit"
                    onClick={() => openEdit(issue)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => setConfirmDelete(issue)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No issues logged" hint="Log a blocker when you hit one." />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit issue' : 'New issue'}
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
            <Label htmlFor="issue-title">Title</Label>
            <Input
              id="issue-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="issue-date">Date</Label>
              <Input
                id="issue-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="issue-severity">Severity</Label>
              <Select
                id="issue-severity"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                {ISSUE_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="issue-status">Status</Label>
              <Select
                id="issue-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {ISSUE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="issue-desc">Description</Label>
            <Textarea
              id="issue-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="issue-resolution">Resolution notes</Label>
            <Textarea
              id="issue-resolution"
              value={form.resolutionNotes}
              onChange={(e) => setForm({ ...form, resolutionNotes: e.target.value })}
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
        title="Delete issue?"
        message={
          confirmDelete ? `"${confirmDelete.title}" will be permanently removed.` : ''
        }
        pending={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
