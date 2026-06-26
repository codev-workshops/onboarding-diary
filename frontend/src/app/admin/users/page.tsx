'use client';

import React, { useState, useCallback, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import {
  AdminUser,
  UserRole,
  PaginatedResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from '@/types';
import {
  getUsers,
  createUser,
  updateUser,
  updateUserStatus,
  assignManager,
  getDepartments,
} from '@/services/adminApi';
import { Department } from '@/types';

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'Recruit', label: 'Recruit' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Admin', label: 'Admin' },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

interface FetchParams {
  page: number;
  roleFilter: string;
  departmentFilter: string;
  statusFilter: string;
  searchQuery: string;
}

export default function AdminUsersPage() {
  const [usersData, setUsersData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Departments for dropdowns
  const [departments, setDepartments] = useState<Department[]>([]);

  // Form state
  const [formData, setFormData] = useState<CreateUserRequest>({
    name: '',
    email: '',
    password: '',
    role: UserRole.Recruit,
    department: '',
    startDate: '',
  });
  const [editFormData, setEditFormData] = useState<UpdateUserRequest>({
    name: '',
    email: '',
    role: UserRole.Recruit,
    department: '',
    startDate: '',
  });
  const [assignManagerId, setAssignManagerId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Managers list for assign modal
  const [managers, setManagers] = useState<AdminUser[]>([]);
  const hasFetchedRef = useRef(false);
  const filtersRef = useRef<FetchParams>({ page: 1, roleFilter: '', departmentFilter: '', statusFilter: '', searchQuery: '' });

  const fetchUsersWithParams = useCallback(async (params: FetchParams) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams: Record<string, string | number | boolean | undefined> = {
        page: params.page,
        pageSize: 10,
      };
      if (params.roleFilter) queryParams.role = params.roleFilter;
      if (params.departmentFilter) queryParams.department = params.departmentFilter;
      if (params.statusFilter) queryParams.isActive = params.statusFilter === 'true';
      if (params.searchQuery) queryParams.search = params.searchQuery;

      const data = await getUsers(queryParams);
      setUsersData(data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchUsers = useCallback(() => {
    fetchUsersWithParams(filtersRef.current);
  }, [fetchUsersWithParams]);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch {
      // silently fail
    }
  }, []);

  const fetchManagers = useCallback(async () => {
    try {
      const data = await getUsers({ role: UserRole.Manager, isActive: true, pageSize: 50 });
      setManagers(data.items);
    } catch {
      // silently fail
    }
  }, []);

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && !hasFetchedRef.current) {
        hasFetchedRef.current = true;
        fetchDepartments();
        fetchUsersWithParams(filtersRef.current);
      }
    },
    [fetchDepartments, fetchUsersWithParams]
  );

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    filtersRef.current = { ...filtersRef.current, roleFilter: value, page: 1 };
    fetchUsersWithParams(filtersRef.current);
  };

  const handleDepartmentFilterChange = (value: string) => {
    setDepartmentFilter(value);
    filtersRef.current = { ...filtersRef.current, departmentFilter: value, page: 1 };
    fetchUsersWithParams(filtersRef.current);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    filtersRef.current = { ...filtersRef.current, statusFilter: value, page: 1 };
    fetchUsersWithParams(filtersRef.current);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    filtersRef.current = { ...filtersRef.current, searchQuery: value, page: 1 };
    fetchUsersWithParams(filtersRef.current);
  };

  const handlePageChange = (newPage: number) => {
    filtersRef.current = { ...filtersRef.current, page: newPage };
    fetchUsersWithParams(filtersRef.current);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await createUser(formData);
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', role: UserRole.Recruit, department: '', startDate: '' });
      refetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Failed to create user.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await updateUser(selectedUser.id, editFormData);
      setShowEditModal(false);
      setSelectedUser(null);
      refetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Failed to update user.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      await updateUserStatus(selectedUser.id, { isActive: !selectedUser.isActive });
      setShowStatusDialog(false);
      setSelectedUser(null);
      refetchUsers();
    } catch {
      setError('Failed to update user status.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !assignManagerId) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await assignManager(selectedUser.id, { managerId: parseInt(assignManagerId) });
      setShowAssignModal(false);
      setSelectedUser(null);
      setAssignManagerId('');
      refetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Failed to assign manager.');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      startDate: user.startDate ? user.startDate.split('T')[0] : '',
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const openStatusDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setShowStatusDialog(true);
  };

  const openAssignModal = (user: AdminUser) => {
    setSelectedUser(user);
    setAssignManagerId(user.managerId?.toString() || '');
    setFormError(null);
    fetchManagers();
    setShowAssignModal(true);
  };

  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map((d) => ({ value: d.name, label: d.name })),
  ];

  const departmentFormOptions = departments.map((d) => ({ value: d.name, label: d.name }));

  return (
    <AppShell>
      <div className="space-y-6" ref={containerRef}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage all users in the system.</p>
          </div>
          <Button onClick={() => { setFormError(null); setShowCreateModal(true); }}>
            Create User
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <Select
              label="Role"
              options={roleOptions}
              value={roleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              label="Department"
              options={departmentOptions}
              value={departmentFilter}
              onChange={(e) => handleDepartmentFilterChange(e.target.value)}
            />
          </div>
          <div className="w-36">
            <Select
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
            />
          </div>
          <div className="w-56">
            <Input
              label="Search"
              placeholder="Name or email..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usersData?.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    usersData?.items.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={user.role === UserRole.Admin ? 'info' : user.role === UserRole.Manager ? 'warning' : 'default'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{user.department}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={user.isActive ? 'success' : 'danger'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openEditModal(user)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={user.isActive ? 'danger' : 'primary'}
                              onClick={() => openStatusDialog(user)}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            {user.role === UserRole.Recruit && (
                              <Button size="sm" variant="secondary" onClick={() => openAssignModal(user)}>
                                Assign Manager
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {usersData && (
              <Pagination
                page={usersData.page}
                totalPages={usersData.totalPages}
                hasPrevious={usersData.hasPrevious}
                hasNext={usersData.hasNext}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}

        {/* Create User Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create User" size="lg">
          <form onSubmit={handleCreateUser} className="space-y-4">
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <Input
              label="Name"
              required
              minLength={2}
              maxLength={100}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <Select
              label="Role"
              options={[
                { value: 'Recruit', label: 'Recruit' },
                { value: 'Manager', label: 'Manager' },
                { value: 'Admin', label: 'Admin' },
              ]}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            />
            <Select
              label="Department"
              options={departmentFormOptions}
              value={formData.department}
              placeholder="Select department"
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={formLoading}>
                Create
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit User Modal */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" size="lg">
          <form onSubmit={handleEditUser} className="space-y-4">
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <Input
              label="Name"
              required
              minLength={2}
              maxLength={100}
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              required
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
            <Select
              label="Role"
              options={[
                { value: 'Recruit', label: 'Recruit' },
                { value: 'Manager', label: 'Manager' },
                { value: 'Admin', label: 'Admin' },
              ]}
              value={editFormData.role}
              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
            />
            <Select
              label="Department"
              options={departmentFormOptions}
              value={editFormData.department}
              placeholder="Select department"
              onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
            />
            <Input
              label="Start Date"
              type="date"
              value={editFormData.startDate || ''}
              onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={formLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>

        {/* Status Toggle Confirmation */}
        <ConfirmDialog
          isOpen={showStatusDialog}
          onClose={() => setShowStatusDialog(false)}
          onConfirm={handleToggleStatus}
          title={selectedUser?.isActive ? 'Deactivate User' : 'Activate User'}
          message={`Are you sure you want to ${selectedUser?.isActive ? 'deactivate' : 'activate'} ${selectedUser?.name}?`}
          confirmText={selectedUser?.isActive ? 'Deactivate' : 'Activate'}
          variant={selectedUser?.isActive ? 'danger' : 'primary'}
          isLoading={formLoading}
        />

        {/* Assign Manager Modal */}
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Manager" size="sm">
          <form onSubmit={handleAssignManager} className="space-y-4">
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <p className="text-sm text-gray-600">
              Assign a manager to <strong>{selectedUser?.name}</strong>
            </p>
            <Select
              label="Manager"
              options={managers.map((m) => ({ value: m.id.toString(), label: m.name }))}
              value={assignManagerId}
              placeholder="Select a manager"
              onChange={(e) => setAssignManagerId(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={formLoading} disabled={!assignManagerId}>
                Assign
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
