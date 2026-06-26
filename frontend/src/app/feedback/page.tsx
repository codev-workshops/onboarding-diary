'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { feedbackApi, FeedbackQueryParams } from '@/services/feedbackApi';
import { FeedbackType, PaginatedResponse, FeedbackEntry } from '@/types';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'Positive', label: 'Positive' },
  { value: 'Suggestion', label: 'Suggestion' },
  { value: 'Concern', label: 'Concern' },
];

const typeBadgeVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  Positive: 'success',
  Suggestion: 'warning',
  Concern: 'danger',
};

export default function FeedbackListPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<FeedbackEntry> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('date');
  const [sortDesc, setSortDesc] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params: FeedbackQueryParams = {
          page,
          pageSize: 20,
          sortBy,
          sortOrder: sortDesc ? 'desc' : 'asc',
        };
        if (typeFilter) {
          params.type = typeFilter as FeedbackType;
        }
        const result = await feedbackApi.getAll(params);
        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) setToast({ message: 'Failed to load feedback entries.', type: 'error' });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [page, sortBy, sortDesc, typeFilter, refreshKey]);

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    setIsDeleting(true);
    try {
      await feedbackApi.delete(deleteId);
      setDeleteId(null);
      setRefreshKey((k) => k + 1);
    } catch {
      setToast({ message: 'Failed to delete feedback entry.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (item: Record<string, unknown>) => new Date(item.date as string).toLocaleDateString(),
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      render: (item: Record<string, unknown>) => item.subject as string,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (item: Record<string, unknown>) => (
        <Badge variant={typeBadgeVariant[item.type as string] || 'default'}>
          {item.type as string}
        </Badge>
      ),
    },
    {
      key: 'details',
      header: 'Preview',
      render: (item: Record<string, unknown>) => {
        const details = item.details as string;
        return details.length > 80 ? details.substring(0, 80) + '...' : details;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Record<string, unknown>) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/feedback/${item.id}`)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteId(item.id as number)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <Button onClick={() => router.push('/feedback/new')}>+ New Feedback</Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-48">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by type"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading feedback...</div>
      ) : (
        <>
          <Table
            columns={columns}
            data={(data?.items || []) as unknown as Record<string, unknown>[]}
            sortBy={sortBy}
            sortDesc={sortDesc}
            onSort={handleSort}
            emptyMessage="No feedback entries yet. Click '+ New Feedback' to share your thoughts!"
          />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              hasPrevious={data.hasPrevious}
              hasNext={data.hasNext}
            />
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Feedback"
        message="Are you sure you want to delete this feedback entry? This action cannot be undone."
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
  );
}
