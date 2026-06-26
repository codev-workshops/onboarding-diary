'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import Table from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import IssueFormModal from './IssueFormModal';
import { issueApi } from '@/services/api';
import { IssueEntry, IssueStatus, IssueSeverity } from '@/types';
import { formatDate } from '@/utils/formatters';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: IssueStatus.Open, label: 'Open' },
  { value: IssueStatus.InProgress, label: 'In Progress' },
  { value: IssueStatus.Resolved, label: 'Resolved' },
  { value: IssueStatus.Closed, label: 'Closed' },
];

const severityOptions = [
  { value: '', label: 'All Severities' },
  { value: IssueSeverity.Low, label: 'Low' },
  { value: IssueSeverity.Medium, label: 'Medium' },
  { value: IssueSeverity.High, label: 'High' },
  { value: IssueSeverity.Critical, label: 'Critical' },
];

function getSeverityBadgeVariant(severity: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (severity) {
    case 'Low': return 'info';
    case 'Medium': return 'warning';
    case 'High': return 'danger';
    case 'Critical': return 'danger';
    default: return 'default';
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'Open': return 'warning';
    case 'InProgress': return 'info';
    case 'Resolved': return 'success';
    case 'Closed': return 'default';
    default: return 'default';
  }
}

function formatStatusLabel(status: string): string {
  if (status === 'InProgress') return 'In Progress';
  return status;
}

async function loadIssues(
  statusFilter: IssueStatus | '',
  severityFilter: IssueSeverity | '',
  page: number,
  sortBy: string,
  sortDesc: boolean,
) {
  const response = await issueApi.getIssues({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    page,
    pageSize: 10,
    sortBy,
    sortOrder: sortDesc ? 'desc' : 'asc',
  });
  return response.data;
}

export default function IssuesPage() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<IssueEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | ''>('');
  const [sortBy, setSortBy] = useState('Date');
  const [sortDesc, setSortDesc] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueEntry | null>(null);
  const [deletingIssue, setDeletingIssue] = useState<IssueEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadIssues(statusFilter, severityFilter, page, sortBy, sortDesc)
      .then((data) => {
        if (cancelled) return;
        setIssues(data.items);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
        setHasPrevious(data.hasPrevious);
        setHasNext(data.hasNext);
      })
      .catch(() => {
        if (cancelled) return;
        setToast({ message: 'Failed to load issues.', type: 'error' });
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [statusFilter, severityFilter, page, sortBy, sortDesc, refreshKey]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
    setPage(1);
  };

  const handleEdit = (issue: IssueEntry) => {
    setEditingIssue(issue);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingIssue(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingIssue(null);
  };

  const handleFormSuccess = useCallback((message: string) => {
    setToast({ message, type: 'success' });
    setIsFormOpen(false);
    setEditingIssue(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleDelete = async () => {
    if (!deletingIssue) return;
    setIsDeleting(true);
    try {
      await issueApi.deleteIssue(deletingIssue.id);
      setToast({ message: 'Issue deleted successfully.', type: 'success' });
      setDeletingIssue(null);
      setRefreshKey((k) => k + 1);
    } catch {
      setToast({ message: 'Failed to delete issue.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (item: Record<string, unknown>) => formatDate(String(item.date)),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (item: Record<string, unknown>) => (
        <span className="font-medium text-gray-900">{String(item.title)}</span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: (item: Record<string, unknown>) => (
        <Badge variant={getSeverityBadgeVariant(String(item.severity))}>{String(item.severity)}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item: Record<string, unknown>) => (
        <Badge variant={getStatusBadgeVariant(String(item.status))}>{formatStatusLabel(String(item.status))}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Record<string, unknown>) => {
        const issueItem = item as unknown as IssueEntry;
        const isOwner = user?.id === issueItem.userId;
        if (!isOwner) return null;
        return (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(issueItem)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeletingIssue(issueItem)}>
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount} issue{totalCount !== 1 ? 's' : ''} found
            </p>
          </div>
          <Button onClick={handleCreateNew}>+ New Issue</Button>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-48">
            <Select
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as IssueStatus | '');
                setPage(1);
              }}
            />
          </div>
          <div className="w-48">
            <Select
              label="Severity"
              options={severityOptions}
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as IssueSeverity | '');
                setPage(1);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading issues...</div>
        ) : (
          <>
            <Table
              columns={columns}
              data={issues as unknown as Record<string, unknown>[]}
              sortBy={sortBy.charAt(0).toLowerCase() + sortBy.slice(1)}
              sortDesc={sortDesc}
              onSort={(key) => handleSort(key.charAt(0).toUpperCase() + key.slice(1))}
              emptyMessage="No issues found. Click '+ New Issue' to create one."
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
            />
          </>
        )}

        <IssueFormModal
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          issue={editingIssue}
        />

        <ConfirmDialog
          isOpen={!!deletingIssue}
          onClose={() => setDeletingIssue(null)}
          onConfirm={handleDelete}
          title="Delete Issue"
          message={`Are you sure you want to delete "${deletingIssue?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          isLoading={isDeleting}
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={!!toast}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
