import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { UserProfile, UserRole } from '@onboarding-diary/shared';
import { Search, Pencil } from 'lucide-react';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import api from '../services/api';

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'indigo' | 'orange' | 'purple';

const roleColors: Record<string, BadgeVariant> = {
  ADMIN: 'red',
  MANAGER: 'indigo',
  RECRUIT: 'blue',
};

interface UsersResponse {
  data: UserProfile[];
  total: number;
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const { data } = useQuery<UsersResponse>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.put(`/admin/users/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data?.data?.filter((u) =>
    !search ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3"><Badge variant={roleColors[u.role]}>{u.role}</Badge></td>
                <td className="px-4 py-3 text-gray-600">{u.department}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.isActive ? 'green' : 'gray'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditingUser(u)} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: u.id })}
                    className={`ml-2 px-2 py-1 text-xs font-medium rounded ${u.isActive ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No users found.</div>
        )}
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          managers={data?.data?.filter((u) => u.role === 'MANAGER') || []}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  managers,
  onClose,
  onSuccess,
}: {
  user: UserProfile;
  managers: UserProfile[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit } = useForm({
    defaultValues: {
      role: user.role,
      managerId: user.managerId || '',
    },
  });

  const onSubmit = async (formData: { role: string; managerId: string }) => {
    setIsLoading(true);
    setError('');
    try {
      if (formData.role !== user.role) {
        await api.put(`/admin/users/${user.id}/role`, { role: formData.role });
      }
      const newManagerId = formData.managerId || null;
      if (newManagerId !== user.managerId) {
        await api.put(`/admin/users/${user.id}/manager`, { managerId: newManagerId });
      }
      onSuccess();
    } catch {
      setError('Failed to update user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit User: ${user.firstName} ${user.lastName}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select {...register('role')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {Object.values(UserRole).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Manager</label>
          <select {...register('managerId')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">No manager assigned</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
