import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, buildQuery } from '../lib/api';
import type { BaseEntry } from '../lib/types';
import { useAuth } from '../lib/auth';
import { Badge, toneForValue } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Dropdown } from './Dropdown';
import { Input, Textarea } from './Input';
import { Modal } from './Modal';

export type FieldKind = 'text' | 'textarea' | 'date' | 'select';

export interface FieldConfig {
  name: string;
  label: string;
  kind: FieldKind;
  options?: ReadonlyArray<string>;
  required?: boolean;
  /** Rendered as a badge in the table. */
  badge?: boolean;
  /** Hidden from the table but present in the form. */
  formOnly?: boolean;
  placeholder?: string;
  hint?: string;
}

export interface EntryLogProps {
  resource: 'tasks' | 'issues' | 'feedback' | 'notes';
  title: string;
  description: string;
  fields: ReadonlyArray<FieldConfig>;
  /** Field names offered as exact-match filters. */
  filterFields: ReadonlyArray<string>;
  newEntryLabel: string;
}

type EntryRecord = BaseEntry & Record<string, string | number | null>;

const emptyDraft = (fields: ReadonlyArray<FieldConfig>): Record<string, string> => {
  const today = new Date().toISOString().slice(0, 10);
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.kind === 'date' ? today : field.kind === 'select' ? (field.options?.[0] ?? '') : '',
    ]),
  );
};

export const EntryLog = ({
  resource,
  title,
  description,
  fields,
  filterFields,
  newEntryLabel,
}: EntryLogProps) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<EntryRecord | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>(() => emptyDraft(fields));
  const [formOpen, setFormOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const tableFields = useMemo(() => fields.filter((field) => !field.formOnly), [fields]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildQuery({ ...filters, from: from || undefined, to: to || undefined });
      const payload = await apiFetch<{ entries: EntryRecord[] }>(`/${resource}${query}`);
      setEntries(payload.entries);
      setBanner(null);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Could not load entries');
    } finally {
      setLoading(false);
    }
  }, [filters, from, to, resource]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft(fields));
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (entry: EntryRecord) => {
    setEditing(entry);
    setDraft(
      Object.fromEntries(fields.map((field) => [field.name, String(entry[field.name] ?? '')])),
    );
    setErrors({});
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !draft[field.name]?.trim()) {
        nextErrors[field.name] = `Please enter the ${field.label.toLowerCase()}`;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      return;
    }
    setSaving(true);
    try {
      const path = editing ? `/${resource}/${editing.id}` : `/${resource}`;
      await apiFetch(path, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(draft),
      });
      setFormOpen(false);
      await load();
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Could not save the entry');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: EntryRecord) => {
    if (!window.confirm(`Delete "${String(entry.title ?? entry.subject ?? 'this entry')}"?`)) {
      return;
    }
    try {
      await apiFetch(`/${resource}/${entry.id}`, { method: 'DELETE' });
      await load();
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Could not delete the entry');
    }
  };

  const filterConfigs = fields.filter((field) => filterFields.includes(field.name));

  return (
    <div className="stack--lg stack">
      <header className="page__header">
        <div>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        <Button variant="primaryRounded" icon="+" onClick={openCreate}>
          {newEntryLabel}
        </Button>
      </header>

      {banner ? <p className="banner banner--error">{banner}</p> : null}

      <Card title="Filters">
        <div className="row">
          <Input
            label="From date"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            label="To date"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          {filterConfigs.map((field) => (
            <div key={field.name} style={{ minWidth: '200px' }}>
              <Dropdown
                label={field.label}
                value={filters[field.name] ?? 'all'}
                placeholder="All"
                options={[
                  { value: 'all', label: `All ${field.label.toLowerCase()}` },
                  ...(field.options ?? []).map((option) => ({ value: option, label: option })),
                ]}
                onChange={(value) =>
                  setFilters((current) => {
                    const next = { ...current };
                    if (value === 'all') {
                      delete next[field.name];
                    } else {
                      next[field.name] = value;
                    }
                    return next;
                  })
                }
              />
            </div>
          ))}
          <Button
            variant="tertiary"
            onClick={() => {
              setFilters({});
              setFrom('');
              setTo('');
            }}
          >
            Clear filters
          </Button>
        </div>
      </Card>

      <Card title={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}>
        {loading ? (
          <p className="muted">Loading entries…</p>
        ) : entries.length === 0 ? (
          <p className="muted">No entries yet. Use “{newEntryLabel}” to add the first one.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                {tableFields.map((field) => (
                  <th key={field.name}>{field.label}</th>
                ))}
                <th>Recruit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  {tableFields.map((field) => {
                    const value = String(entry[field.name] ?? '');
                    return (
                      <td key={field.name}>
                        {field.badge && value ? (
                          <Badge tone={toneForValue(value)}>{value}</Badge>
                        ) : field.name === 'title' || field.name === 'subject' ? (
                          <span className="table__title">{value}</span>
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                  <td className="muted">{entry.userName}</td>
                  <td>
                    <div className="actions">
                      <Button variant="tertiary" size="sm" onClick={() => openEdit(entry)}>
                        Edit entry
                      </Button>
                      <Button
                        variant="quaternary"
                        size="sm"
                        disabled={user?.role !== 'admin' && entry.userId !== user?.id}
                        onClick={() => void remove(entry)}
                      >
                        Delete entry
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {formOpen ? (
        <Modal
          title={editing ? `Edit ${title.toLowerCase()} entry` : newEntryLabel}
          onClose={() => setFormOpen(false)}
        >
          <div className="stack">
            {fields.map((field) => {
              if (field.kind === 'select') {
                return (
                  <Dropdown
                    key={field.name}
                    label={field.label}
                    value={draft[field.name] ?? null}
                    options={(field.options ?? []).map((option) => ({
                      value: option,
                      label: option,
                    }))}
                    error={errors[field.name]}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, [field.name]: value }))
                    }
                  />
                );
              }
              if (field.kind === 'textarea') {
                return (
                  <Textarea
                    key={field.name}
                    label={field.label}
                    value={draft[field.name] ?? ''}
                    placeholder={field.placeholder}
                    hint={field.hint}
                    error={errors[field.name]}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  />
                );
              }
              return (
                <Input
                  key={field.name}
                  label={field.label}
                  type={field.kind === 'date' ? 'date' : 'text'}
                  value={draft[field.name] ?? ''}
                  placeholder={field.placeholder}
                  hint={field.hint}
                  error={errors[field.name]}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                />
              );
            })}
            <div className="actions">
              <Button onClick={() => void save()} disabled={saving}>
                {editing ? 'Save changes' : 'Save entry'}
              </Button>
              <Button variant="tertiary" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};
