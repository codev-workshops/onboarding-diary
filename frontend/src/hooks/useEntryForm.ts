import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';

interface Options<F, D> {
  /** API collection path, e.g. `/api/tasks`. */
  resource: string;
  /** SPA list page to return to after saving or deleting. */
  listPath: string;
  id?: string;
  initial: F;
  fromDto: (dto: D) => F;
  toRequest?: (form: F) => unknown;
}

/** Shared create/edit/delete form state for diary entries. */
export function useEntryForm<F extends object, D>({
  resource,
  listPath,
  id,
  initial,
  fromDto,
  toRequest = (form) => form,
}: Options<F, D>) {
  const navigate = useNavigate();
  const [form, setForm] = useState<F>(initial);
  const [dto, setDto] = useState<D | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    api
      .get<D>(`${resource}/${id}`)
      .then((loaded) => {
        setDto(loaded);
        setForm(fromDto(loaded));
      })
      .catch((err: unknown) =>
        setFormError(err instanceof Error ? err.message : 'Could not load entry'),
      )
      .finally(() => setLoading(false));
    // fromDto is a pure mapper; reloading only depends on the entry identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, id]);

  function setField<K extends keyof F>(key: K, value: F[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError('');
    try {
      const body = toRequest(form);
      if (id) {
        await api.put(`${resource}/${id}`, body);
      } else {
        await api.post(resource, body);
      }
      navigate(listPath);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldMap());
        setFormError(err.fieldErrors.length ? 'Please fix the highlighted fields.' : err.message);
      } else {
        setFormError('Could not save entry');
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id || !window.confirm('Delete this entry? This cannot be undone.')) {
      return;
    }
    try {
      await api.del(`${resource}/${id}`);
      navigate(listPath);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not delete entry');
    }
  }

  return { form, dto, setField, errors, formError, loading, saving, submit, remove };
}
