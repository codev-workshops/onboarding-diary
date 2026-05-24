import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2, ShieldCheck, UserX } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Modal } from '@/components/ui/Modal';
import { usersApi, assignmentsApi, type UserDto } from '@/api/users.api';
import { Input } from '@/components/ui/Input';
import { Link } from 'react-router-dom';

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'RECRUIT', label: 'Recruit' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const roleFormOptions = roleOptions.slice(1);

export function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [roleModal, setRoleModal] = useState<UserDto | null>(null);
  const [assignModal, setAssignModal] = useState(false);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (role) params.role = role;
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User deleted'); },
    onError: () => toast.error('Failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => usersApi.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Status updated'); },
    onError: () => toast.error('Failed'),
  });

  const toggleStatus = (user: UserDto) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    statusMutation.mutate({ id: user.id, status: newStatus });
  };

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <div className="mt-2 flex gap-2 text-sm">
                <Link to="/admin/users" className="font-medium text-blue-600">Users</Link>
                <span className="text-gray-400">|</span>
                <Link to="/admin/assignments" className="text-gray-500 hover:text-blue-600">Assignments</Link>
              </div>
            </div>
            <Button onClick={() => setAssignModal(true)}>Assign Manager</Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select options={roleOptions} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} />
            <Select options={statusOptions} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
          </div>

          {isLoading ? <PageLoading /> : !data || data.data.length === 0 ? (
            <p className="text-gray-500">No users found.</p>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Role</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Joined</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{user.first_name} {user.last_name}</td>
                        <td className="px-6 py-4 text-gray-500">{user.email}</td>
                        <td className="px-6 py-4"><StatusBadge status={user.role} /></td>
                        <td className="px-6 py-4"><StatusBadge status={user.status} /></td>
                        <td className="px-6 py-4 text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setRoleModal(user)} className="text-gray-400 hover:text-blue-600" title="Change role"><ShieldCheck className="h-4 w-4" /></button>
                            <button onClick={() => toggleStatus(user)} className="text-gray-400 hover:text-yellow-600" title="Toggle status"><UserX className="h-4 w-4" /></button>
                            <button onClick={() => { if (confirm('Delete user?')) deleteMutation.mutate(user.id); }} className="text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={data.meta} onPageChange={setPage} />
            </Card>
          )}
        </div>

        {roleModal && <RoleChangeModal user={roleModal} onClose={() => setRoleModal(null)} />}
        {assignModal && <AssignManagerModal open={assignModal} onClose={() => setAssignModal(false)} />}
      </ErrorBoundary>
    </PageLayout>
  );
}

function RoleChangeModal({ user, onClose }: { user: UserDto; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [newRole, setNewRole] = useState(user.role);

  const mutation = useMutation({
    mutationFn: () => usersApi.updateRole(user.id, newRole),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Role updated'); onClose(); },
    onError: () => toast.error('Failed'),
  });

  return (
    <Modal open onClose={onClose} title={`Change role — ${user.first_name} ${user.last_name}`} size="sm">
      <div className="space-y-4">
        <Select label="New Role" options={roleFormOptions} value={newRole} onChange={(e) => setNewRole(e.target.value)} />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function AssignManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [managerId, setManagerId] = useState('');
  const [recruitId, setRecruitId] = useState('');

  const mutation = useMutation({
    mutationFn: () => assignmentsApi.create({ manager_id: managerId, recruit_id: recruitId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assignments'] }); toast.success('Assigned'); onClose(); },
    onError: () => toast.error('Failed to assign'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Assign Manager to Recruit" size="sm">
      <div className="space-y-4">
        <Input label="Manager User ID" value={managerId} onChange={(e) => setManagerId(e.target.value)} placeholder="UUID" />
        <Input label="Recruit User ID" value={recruitId} onChange={(e) => setRecruitId(e.target.value)} placeholder="UUID" />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!managerId || !recruitId}>Assign</Button>
        </div>
      </div>
    </Modal>
  );
}
