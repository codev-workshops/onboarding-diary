import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { ROLE_LABELS, type Role, type User, type UserRef } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Field from '../../components/Field';
import OptionSelect from '../../components/OptionSelect';
import { formatDateTime, today } from '../../dates';
import { useEntryForm } from '../../hooks/useEntryForm';
import { PASSWORD_HINT } from '../../auth/passwordPolicy';

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: Role;
  department: string;
  startDate: string;
  managerId: string;
  active: boolean;
}

export default function UserFormPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [managers, setManagers] = useState<UserRef[]>([]);
  const { form, dto, setField, errors, ...state } = useEntryForm<UserForm, User>({
    resource: '/api/admin/users',
    listPath: '/admin/users',
    id,
    initial: {
      name: '',
      email: '',
      password: '',
      role: 'RECRUIT',
      department: '',
      startDate: today(),
      managerId: '',
      active: true,
    },
    fromDto: (user) => ({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department ?? '',
      startDate: user.startDate ?? '',
      managerId: user.manager ? String(user.manager.id) : '',
      active: user.active,
    }),
    toRequest: (form) => {
      const isRecruit = form.role === 'RECRUIT';
      const common = {
        name: form.name,
        role: form.role,
        department: form.department,
        startDate: form.startDate || null,
        managerId: isRecruit && form.managerId ? Number(form.managerId) : null,
      };
      return id
        ? { ...common, active: form.active }
        : { ...common, email: form.email, password: form.password };
    },
  });

  useEffect(() => {
    api.get<UserRef[]>('/api/admin/managers').then(setManagers).catch(() => setManagers([]));
  }, []);

  const isSelf = Boolean(id) && me?.id === Number(id);
  const managerOptions = Object.fromEntries(managers.map((m) => [String(m.id), m.name]));

  return (
    <>
      <div className="page-header">
        <h1>{id ? `Edit ${dto?.name ?? 'user'}` : 'New user'}</h1>
      </div>
      {state.loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="grid-2 align-start">
          <form className="card" onSubmit={state.submit} noValidate>
            <Alert>{state.formError}</Alert>
            <Field label="Name" htmlFor="name" error={errors.name} required>
              <input id="name" maxLength={100} value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email} required={!id} hint={id ? 'Email cannot be changed.' : undefined}>
              <input id="email" type="email" value={form.email} disabled={Boolean(id)} onChange={(e) => setField('email', e.target.value)} />
            </Field>
            {!id && (
              <Field label="Initial password" htmlFor="password" error={errors.password} hint={PASSWORD_HINT} required>
                <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
              </Field>
            )}
            <div className="form-row">
              <Field label="Role" htmlFor="role" error={errors.role} required>
                <OptionSelect id="role" options={ROLE_LABELS} value={form.role} onChange={(v) => setField('role', v as Role)} />
              </Field>
              <Field label="Department" htmlFor="department" error={errors.department}>
                <input id="department" maxLength={100} value={form.department} onChange={(e) => setField('department', e.target.value)} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Start date" htmlFor="startDate" error={errors.startDate} required={form.role === 'RECRUIT'}>
                <input id="startDate" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
              </Field>
              {form.role === 'RECRUIT' && (
                <Field label="Manager" htmlFor="managerId" error={errors.managerId}>
                  <OptionSelect id="managerId" options={managerOptions} emptyLabel="Unassigned" value={form.managerId} onChange={(v) => setField('managerId', v)} />
                </Field>
              )}
            </div>
            {id && (
              <label className="checkbox">
                <input type="checkbox" checked={form.active} disabled={isSelf} onChange={(e) => setField('active', e.target.checked)} />
                Active {isSelf && <span className="muted">(you cannot deactivate yourself)</span>}
              </label>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={state.saving}>
                {state.saving ? 'Saving…' : 'Save'}
              </button>
              <Link className="btn" to="/admin/users">
                Cancel
              </Link>
            </div>
            {dto && <p className="muted">Created {formatDateTime(dto.createdAt)}</p>}
          </form>
          {id && <ResetPasswordCard userId={id} />}
        </div>
      )}
    </>
  );
}

function ResetPasswordCard({ userId }: { userId: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setDone(false);
    try {
      await api.put(`/api/admin/users/${userId}/password`, { newPassword: password });
      setPassword('');
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.fieldMap().newPassword ?? err.message : 'Could not reset password');
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>Reset password</h2>
      {done && <Alert kind="success">Password updated.</Alert>}
      <Field label="New password" htmlFor="newPassword" error={error} hint={PASSWORD_HINT}>
        <input id="newPassword" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <button className="btn" type="submit" disabled={!password}>
        Set password
      </button>
    </form>
  );
}
