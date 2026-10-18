import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Checklist } from '../../api/checklists';
import Alert from '../../components/Alert';
import ChecklistCard from '../../components/ChecklistCard';

export default function MyChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Checklist[]>('/api/checklists').then(setChecklists).catch((err: Error) => setError(err.message));
  }, []);

  async function toggle(checklistId: number, itemId: number, done: boolean) {
    try {
      const updated = await api.put<Checklist>(`/api/checklists/${checklistId}/items/${itemId}`, { done });
      setChecklists((current) => current?.map((c) => (c.id === updated.id ? updated : c)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update item');
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>My checklists</h1>
      </div>
      <Alert>{error}</Alert>
      {checklists === null && !error && <p className="muted">Loading…</p>}
      {checklists?.length === 0 && (
        <p className="empty-page">No checklists yet. Your manager can assign one.</p>
      )}
      <div className="checklist-grid">
        {checklists?.map((c) => (
          <ChecklistCard key={c.id} checklist={c} onToggle={(itemId, done) => toggle(c.id, itemId, done)} />
        ))}
      </div>
    </>
  );
}
