import { useState } from 'react';
import type { FormEvent } from 'react';
import { updateProfile } from '../api/auth';
import { useAuth } from '../auth/AuthContext';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    department: user?.department ?? '',
    startDate: user?.startDate ?? '',
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    try {
      setUser(await updateProfile(form));
      setStatus('Profile updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Update failed');
    }
  }

  return (
    <section>
      <h1>Profile</h1>
      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          value={form.fullName}
          required
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />

        <label htmlFor="department">Department</label>
        <input
          id="department"
          value={form.department}
          required
          onChange={(e) => setForm({ ...form, department: e.target.value })}
        />

        <label htmlFor="startDate">Start date</label>
        <input
          id="startDate"
          type="date"
          value={form.startDate}
          required
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />

        <p className="muted">
          Email: {user?.email} · Role: {user?.role}
        </p>

        {error && <p className="form-error">{error}</p>}
        {status && <p className="form-status">{status}</p>}

        <button type="submit">Save changes</button>
      </form>
    </section>
  );
}
