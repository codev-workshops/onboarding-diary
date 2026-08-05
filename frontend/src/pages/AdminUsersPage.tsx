import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { deactivateUser, listUsers, updateUser } from '../api/users';
import type { UpdateUserRequest, User, UserRole } from '../api/types';

const ROLES: UserRole[] = ['NewRecruit', 'Manager', 'Admin'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateUserRequest | null>(null);

  const reload = useCallback(async () => {
    try {
      setUsers(await listUsers(roleFilter ? { role: roleFilter } : {}));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load users');
    }
  }, [roleFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const managers = users.filter((user) => user.role === 'Manager');

  function startEdit(user: User) {
    setEditingId(user.id);
    setForm({
      fullName: user.fullName,
      department: user.department,
      startDate: user.startDate,
      role: user.role,
      managerId: user.managerId,
      isActive: user.isActive,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingId || !form) return;
    try {
      await updateUser(editingId, form);
      setEditingId(null);
      setForm(null);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Update failed');
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateUser(id);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Deactivation failed');
    }
  }

  return (
    <section>
      <h1>User management</h1>
      {error && <p className="form-error">{error}</p>}

      <div className="filters">
        <label htmlFor="roleFilter">Role</label>
        <select id="roleFilter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as '' | UserRole)}>
          <option value="">All</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <table className="entry-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <Link to={`/team/${user.id}`}>{user.fullName}</Link>
              </td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.department}</td>
              <td>{user.isActive ? 'Yes' : 'No'}</td>
              <td className="row-actions">
                <button type="button" className="secondary" onClick={() => startEdit(user)}>
                  Edit
                </button>
                {user.isActive && (
                  <button type="button" className="danger" onClick={() => void handleDeactivate(user.id)}>
                    Deactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {form && (
        <form className="card" onSubmit={handleSubmit}>
          <h2>Edit user</h2>

          <label htmlFor="fullName">Full name</label>
          <input id="fullName" value={form.fullName} required onChange={(e) => setForm({ ...form, fullName: e.target.value })} />

          <label htmlFor="department">Department</label>
          <input id="department" value={form.department} required onChange={(e) => setForm({ ...form, department: e.target.value })} />

          <label htmlFor="startDate">Start date</label>
          <input id="startDate" type="date" value={form.startDate} required onChange={(e) => setForm({ ...form, startDate: e.target.value })} />

          <label htmlFor="role">Role</label>
          <select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          {form.role === 'NewRecruit' && (
            <>
              <label htmlFor="managerId">Manager</label>
              <select
                id="managerId"
                value={form.managerId ?? ''}
                onChange={(e) => setForm({ ...form, managerId: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName}
                  </option>
                ))}
              </select>
            </>
          )}

          <label htmlFor="isActive">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />{' '}
            Active
          </label>

          <div className="form-actions">
            <button type="submit">Save</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditingId(null);
                setForm(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
