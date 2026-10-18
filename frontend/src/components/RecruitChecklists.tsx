import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Checklist, ChecklistTemplate } from '../api/checklists';
import Alert from './Alert';
import ChecklistCard from './ChecklistCard';
import OptionSelect from './OptionSelect';

/** Manager/admin view of a recruit's checklists with assign and remove. */
export default function RecruitChecklists({ recruitId }: { recruitId: number }) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState('');
  const base = `/api/recruits/${recruitId}/checklists`;

  const load = () => api.get<Checklist[]>(base).then(setChecklists);
  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    api.get<ChecklistTemplate[]>('/api/checklist-templates').then(setTemplates).catch(() => setTemplates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recruitId]);

  async function run(action: () => Promise<unknown>) {
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  }

  return (
    <>
      <div className="card filter-bar">
        <label className="filter">
          <span>Template</span>
          <OptionSelect
            options={Object.fromEntries(templates.map((t) => [String(t.id), t.name]))}
            emptyLabel={templates.length ? 'Choose a template' : 'No templates yet'}
            value={templateId}
            onChange={setTemplateId}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary btn-small"
          disabled={!templateId}
          onClick={() => run(() => api.post(base, { templateId: Number(templateId) }).then(() => setTemplateId('')))}
        >
          Assign checklist
        </button>
      </div>
      <Alert>{error}</Alert>
      {checklists.length === 0 && <p className="empty-page">No checklists assigned.</p>}
      <div className="checklist-grid">
        {checklists.map((c) => (
          <ChecklistCard
            key={c.id}
            checklist={c}
            onRemove={() => window.confirm(`Remove "${c.name}" from this recruit?`) && run(() => api.del(`${base}/${c.id}`))}
          />
        ))}
      </div>
    </>
  );
}
