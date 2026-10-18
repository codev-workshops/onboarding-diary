import { PASSWORD_HINT } from '../auth/passwordPolicy';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { ROLE_LABELS } from '../api/types';
import type { User } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import Field from '../components/Field';
import { formatDate } from '../dates';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [startDate, setStartDate] = useState(user?.startDate ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwMessage, setPwMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  if (!user) {
    return null;
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setMessage(null);
    try {
      const updated = await api.put<User>('/api/profile', {
        name,
        department,
        startDate: startDate || null,
      });
      setUser(updated);
      setMessage({ kind: 'success', text: 'Profile saved.' });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldMap());
        setMessage({ kind: 'error', text: e.message });
      }
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPwErrors({});
    setPwMessage(null);
    try {
      await api.put<void>('/api/profile/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPwMessage({ kind: 'success', text: 'Password changed.' });
    } catch (e) {
      if (e instanceof ApiError) {
        setPwErrors(e.fieldMap());
        setPwMessage({ kind: 'error', text: e.message });
      }
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>My profile</h1>
      </div>
      <div className="grid-2">
        <form className="card" onSubmit={saveProfile} noValidate>
          <h2>Details</h2>
          {message && <Alert kind={message.kind}>{message.text}</Alert>}
          <dl className="details">
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Role</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
            {user.role === 'RECRUIT' && (
              <>
                <dt>Manager</dt>
                <dd>{user.manager?.name ?? 'Not assigned yet'}</dd>
              </>
            )}
            <dt>Member since</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </dl>
          <Field label="Full name" htmlFor="name" error={errors.name} required>
            <input id="name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Department" htmlFor="department" error={errors.department}>
            <input
              id="department"
              value={department}
              maxLength={100}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </Field>
          <Field
            label="Start date"
            htmlFor="startDate"
            error={errors.startDate}
            required={user.role === 'RECRUIT'}
          >
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <button type="submit" className="btn btn-primary">
            Save profile
          </button>
        </form>
        <form className="card" onSubmit={changePassword} noValidate>
          <h2>Change password</h2>
          {pwMessage && <Alert kind={pwMessage.kind}>{pwMessage.text}</Alert>}
          <Field
            label="Current password"
            htmlFor="currentPassword"
            error={pwErrors.currentPassword}
            required
          >
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field
            label="New password"
            htmlFor="newPassword"
            error={pwErrors.newPassword}
            hint={PASSWORD_HINT}
            required
          >
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <button type="submit" className="btn">
            Change password
          </button>
        </form>
      </div>
    </>
  );
}
