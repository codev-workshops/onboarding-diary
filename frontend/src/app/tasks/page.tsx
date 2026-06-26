'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  TaskResponse,
  TaskEntryStatus,
  Priority,
  PaginatedResponse,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '@/types';
import { getTasks, createTask, updateTask, deleteTask } from '@/services/taskApi';
import { formatDate, getTodayString } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DatePicker from '@/components/ui/DatePicker';
import Table from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Badge from '@/components/ui/Badge';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'NotStarted', label: 'Not Started' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Blocked', label: 'Blocked' },
];

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'Training', label: 'Training' },
  { value: 'Documentation', label: 'Documentation' },
  { value: 'Development', label: 'Development' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Setup', label: 'Setup' },
  { value: 'Other', label: 'Other' },
];

const statusBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  NotStarted: 'default',
  InProgress: 'info',
  Completed: 'success',
  Blocked: 'danger',
};

const priorityBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  Low: 'default',
  Medium: 'info',
  High: 'warning',
  Critical: 'danger',
};

const statusFormOptions = [
  { value: 'NotStarted', label: 'Not Started' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Blocked', label: 'Blocked' },
];

const priorityFormOptions = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

const categoryFormOptions = [
  { value: 'Training', label: 'Training' },
  { value: 'Documentation', label: 'Documentation' },
  { value: 'Development', label: 'Development' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Setup', label: 'Setup' },
  { value: 'Other', label: 'Other' },
];

interface TaskFormData {
  date: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
}

const emptyForm: TaskFormData = {
  date: getTodayString(),
  title: '',
  description: '',
  category: 'Training',
  status: 'NotStarted',
  priority: 'Medium',
};

interface FormErrors {
  date?: string;
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  priority?: string;
}

function validateForm(data: TaskFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.date) {
    errors.date = 'Date is required.';
  } else if (data.date > getTodayString()) {
    errors.date = 'Date cannot be in the future.';
  }

  if (!data.title.trim()) {
    errors.title = 'Title is required.';
  } else if (data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters.';
  } else if (data.title.trim().length > 200) {
    errors.title = 'Title must be at most 200 characters.';
  }

  if (data.description && data.description.length > 5000) {
    errors.description = 'Description must be at most 5000 characters.';
  }

  if (!data.category) {
    errors.category = 'Category is required.';
  }

  if (!data.status) {
    errors.status = 'Status is required.';
  }

  if (!data.priority) {
    errors.priority = 'Priority is required.';
  }

  return errors;
}

export default function TasksPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<PaginatedResponse<TaskResponse> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<TaskFilters>({
    page: 1,
    pageSize: 10,
    sortBy: 'date',
    sortDescending: true,
  });

  // Filter bar state
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TaskResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await getTasks(filters);
        if (!cancelled) setTasks(result);
      } catch {
        if (!cancelled) setToast({ message: 'Failed to load tasks.', type: 'error' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filters, refreshKey]);

  const handleApplyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      dateFrom: filterDateFrom || undefined,
      dateTo: filterDateTo || undefined,
      category: filterCategory || undefined,
      status: (filterStatus as TaskEntryStatus) || undefined,
      priority: (filterPriority as Priority) || undefined,
    }));
  };

  const handleClearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterCategory('');
    setFilterStatus('');
    setFilterPriority('');
    setFilters({
      page: 1,
      pageSize: 10,
      sortBy: 'date',
      sortDescending: true,
    });
  };

  const handleSort = (key: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: key,
      sortDescending: prev.sortBy === key ? !prev.sortDescending : true,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormData(emptyForm);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: TaskResponse) => {
    setEditingTask(task);
    setFormData({
      date: task.date.split('T')[0],
      title: task.title,
      description: task.description || '',
      category: task.category,
      status: task.status,
      priority: task.priority,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setFormData(emptyForm);
    setFormErrors({});
  };

  const handleFormChange = (field: keyof TaskFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = async () => {
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      if (editingTask) {
        const updateData: UpdateTaskRequest = {
          date: formData.date,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: formData.status as TaskEntryStatus,
          priority: formData.priority as Priority,
        };
        await updateTask(editingTask.id, updateData);
        setToast({ message: 'Task updated successfully.', type: 'success' });
      } else {
        const createData: CreateTaskRequest = {
          date: formData.date,
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          status: formData.status as TaskEntryStatus,
          priority: formData.priority as Priority,
        };
        await createTask(createData);
        setToast({ message: 'Task created successfully.', type: 'success' });
      }
      handleCloseModal();
      setRefreshKey((k) => k + 1);
    } catch {
      setToast({
        message: editingTask ? 'Failed to update task.' : 'Failed to create task.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (task: TaskResponse) => {
    setDeleteTarget(task);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTask(deleteTarget.id);
      setToast({ message: 'Task deleted successfully.', type: 'success' });
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      setToast({ message: 'Failed to delete task.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (task: Record<string, unknown>) => formatDate((task as unknown as TaskResponse).date),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (task: Record<string, unknown>) => (
        <span className="font-medium text-gray-900">
          {(task as unknown as TaskResponse).title}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (task: Record<string, unknown>) => {
        const t = task as unknown as TaskResponse;
        return (
          <Badge variant={statusBadgeVariant[t.status] || 'default'}>
            {t.status === 'NotStarted'
              ? 'Not Started'
              : t.status === 'InProgress'
                ? 'In Progress'
                : t.status}
          </Badge>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (task: Record<string, unknown>) => {
        const t = task as unknown as TaskResponse;
        return (
          <Badge variant={priorityBadgeVariant[t.priority] || 'default'}>
            {t.priority}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (task: Record<string, unknown>) => {
        const t = task as unknown as TaskResponse;
        const isOwner = t.userId === user?.id;
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(t)}
              disabled={!isOwner}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteClick(t)}
              disabled={!isOwner}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <Button onClick={handleOpenCreate}>+ New Task</Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DatePicker
            label="From"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
          <DatePicker
            label="To"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
          <Select
            label="Priority"
            options={priorityOptions}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={handleApplyFilters}>
            Apply
          </Button>
          <Button size="sm" variant="secondary" onClick={handleClearFilters}>
            Clear
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading tasks...</div>
      ) : (
        <>
          <Table
            columns={columns}
            data={(tasks?.items as unknown as Record<string, unknown>[]) || []}
            sortBy={filters.sortBy}
            sortDesc={filters.sortDescending}
            onSort={handleSort}
            emptyMessage="No tasks found."
          />
          {tasks && (
            <Pagination
              page={tasks.page}
              totalPages={tasks.totalPages}
              onPageChange={handlePageChange}
              hasPrevious={tasks.hasPrevious}
              hasNext={tasks.hasNext}
            />
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTask ? 'Edit Task' : 'New Task'}
        size="lg"
      >
        <div className="space-y-4">
          <DatePicker
            label="Date"
            value={formData.date}
            max={getTodayString()}
            onChange={(e) => handleFormChange('date', e.target.value)}
            error={formErrors.date}
          />
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => handleFormChange('title', e.target.value)}
            error={formErrors.title}
            placeholder="Enter task title"
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                formErrors.description
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : ''
              }`}
              rows={4}
              placeholder="Enter task description (optional)"
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
            )}
          </div>
          <Select
            label="Category"
            options={categoryFormOptions}
            value={formData.category}
            onChange={(e) => handleFormChange('category', e.target.value)}
            error={formErrors.category}
          />
          <Select
            label="Status"
            options={statusFormOptions}
            value={formData.status}
            onChange={(e) => handleFormChange('status', e.target.value)}
            error={formErrors.status}
          />
          <Select
            label="Priority"
            options={priorityFormOptions}
            value={formData.priority}
            onChange={(e) => handleFormChange('priority', e.target.value)}
            error={formErrors.priority}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={handleCloseModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
