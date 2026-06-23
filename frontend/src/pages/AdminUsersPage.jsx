import { useState, useEffect } from 'react';
import { getUsers, updateUser, deactivateUser } from '../api/adminApi';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', active: true });

  const loadUsers = () => {
    getUsers().then(res => setUsers(res.data)).catch(console.error);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleEdit = (user) => {
    setEditUser(user);
    setEditForm({ role: user.role, active: user.active });
  };

  const handleSave = async () => {
    await updateUser(editUser.id, editForm);
    setEditUser(null);
    loadUsers();
  };

  const handleDeactivate = async (id) => {
    if (window.confirm('Deactivate this user?')) {
      await deactivateUser(id);
      loadUsers();
    }
  };

  return (
    <div className="page">
      <h2>User Management</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><StatusBadge value={u.role} /></td>
                <td>{u.department}</td>
                <td>{u.active ? 'Yes' : 'No'}</td>
                <td className="actions">
                  <button className="btn btn-sm btn-edit" onClick={() => handleEdit(u)}>Edit</button>
                  {u.active && (
                    <button className="btn btn-sm btn-delete" onClick={() => handleDeactivate(u.id)}>Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (
          <div>
            <p><strong>{editUser.name}</strong> ({editUser.email})</p>
            <div className="form-group">
              <label>Role</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                <option value="RECRUIT">Recruit</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={editForm.active}
                       onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} />
                {' '}Active
              </label>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
              <button className="btn" onClick={() => setEditUser(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
