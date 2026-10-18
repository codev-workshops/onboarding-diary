import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Alert from './Alert';

interface Props {
  title: string;
  listPath: string;
  isEdit: boolean;
  loading: boolean;
  saving: boolean;
  formError: string;
  onSubmit: (event: FormEvent) => void;
  onDelete: () => void;
  children: ReactNode;
}

/** Card, error banner and Save/Cancel/Delete buttons shared by all entry forms. */
export default function EntryFormShell({
  title,
  listPath,
  isEdit,
  loading,
  saving,
  formError,
  onSubmit,
  onDelete,
  children,
}: Props) {
  return (
    <>
      <div className="page-header">
        <h1>{title}</h1>
      </div>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <form className="card form-card" onSubmit={onSubmit} noValidate>
          <Alert>{formError}</Alert>
          {children}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <Link className="btn" to={listPath}>
              Cancel
            </Link>
            {isEdit && (
              <button className="btn btn-danger push-right" type="button" onClick={onDelete}>
                Delete
              </button>
            )}
          </div>
        </form>
      )}
    </>
  );
}
