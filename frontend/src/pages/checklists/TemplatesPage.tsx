import { type FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { ChecklistTemplate } from '../../api/checklists';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Field from '../../components/Field';

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [name, setName] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get<ChecklistTemplate[]>('/api/checklist-templates').then(setTemplates);
  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    const items = itemsText.split('\n').map((line) => line.trim()).filter(Boolean);
    try {
      await api.post('/api/checklist-templates', { name, items });
      setName('');
      setItemsText('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.fieldErrors?.map((f) => `${f.field} ${f.message}`).join('; ') || err.message : 'Could not save');
    }
  }

  async function remove(template: ChecklistTemplate) {
    if (!window.confirm(`Delete template "${template.name}"? Checklists already assigned are kept.`)) {
      return;
    }
    try {
      await api.del(`/api/checklist-templates/${template.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Checklist templates</h1>
      </div>
      <p className="muted">Create a template here, then assign it from a recruit's Checklists tab.</p>
      <Alert>{error}</Alert>
      <div className="grid-2 align-start">
        <form className="card" onSubmit={create} noValidate>
          <h2>New template</h2>
          <Field label="Name" htmlFor="tplName" required>
            <input id="tplName" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Items (one per line, up to 30)" htmlFor="tplItems" required>
            <textarea id="tplItems" rows={6} value={itemsText} onChange={(e) => setItemsText(e.target.value)} />
          </Field>
          <button className="btn btn-primary" type="submit" disabled={!name.trim() || !itemsText.trim()}>
            Create template
          </button>
        </form>
        <div>
          {templates.length === 0 && <p className="empty-page">No templates yet.</p>}
          {templates.map((t) => (
            <section key={t.id} className="card checklist">
              <div className="entry-head">
                <h2>{t.name}</h2>
                {(user?.role === 'ADMIN' || user?.id === t.createdBy?.id) && (
                  <button type="button" className="link-button" onClick={() => remove(t)}>
                    Delete
                  </button>
                )}
              </div>
              <ol className="small">
                {t.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
              {t.createdBy && <p className="muted small">By {t.createdBy.name}</p>}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
