'use client';

import React, { useState, useCallback, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Department, CreateDepartmentRequest, UpdateDepartmentRequest } from '@/types';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/services/adminApi';

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateDepartmentRequest>({ name: '', description: '' });
  const [editFormData, setEditFormData] = useState<UpdateDepartmentRequest>({ name: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch {
      setError('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && !hasFetchedRef.current) {
        hasFetchedRef.current = true;
        fetchDepartments();
      }
    },
    [fetchDepartments]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await createDepartment(formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      fetchDepartments();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Failed to create department.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await updateDepartment(selectedDepartment.id, editFormData);
      setShowEditModal(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Failed to update department.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;
    setFormLoading(true);
    try {
      await deleteDepartment(selectedDepartment.id);
      setShowDeleteDialog(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to delete department.');
      setShowDeleteDialog(false);
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (dept: Department) => {
    setSelectedDepartment(dept);
    setEditFormData({ name: dept.name, description: dept.description || '' });
    setFormError(null);
    setShowEditModal(true);
  };

  const openDeleteDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    setShowDeleteDialog(true);
  };

  return (
    <AppShell>
      <div className="space-y-6" ref={containerRef}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
            <p className="mt-1 text-sm text-gray-500">Manage departments in the organization.</p>
          </div>
          <Button onClick={() => { setFormError(null); setShowCreateModal(true); }}>
            Create Department
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      No departments found.
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{dept.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{dept.description || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(dept)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => openDeleteDialog(dept)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Department">
          <form onSubmit={handleCreate} className="space-y-4">
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
              label="Description"
              maxLength={500}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

        {/* Edit Modal */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Department">
          <form onSubmit={handleEdit} className="space-y-4">
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
              label="Description"
              maxLength={500}
              value={editFormData.description || ''}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
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

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete Department"
          message={`Are you sure you want to delete "${selectedDepartment?.name}"? This cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          isLoading={formLoading}
        />
      </div>
    </AppShell>
  );
}
