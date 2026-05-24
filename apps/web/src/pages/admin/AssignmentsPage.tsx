import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserMinus } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { assignmentsApi } from '@/api/users.api';
import { Link } from 'react-router-dom';

export function AssignmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', { page, limit: 20 }],
    queryFn: () => assignmentsApi.list({ page, limit: 20 }),
  });

  const unassignMutation = useMutation({
    mutationFn: assignmentsApi.unassign,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assignments'] }); toast.success('Unassigned'); },
    onError: () => toast.error('Failed'),
  });

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
            <div className="mt-2 flex gap-2 text-sm">
              <Link to="/admin/users" className="text-gray-500 hover:text-blue-600">Users</Link>
              <span className="text-gray-400">|</span>
              <Link to="/admin/assignments" className="font-medium text-blue-600">Assignments</Link>
            </div>
          </div>

          {isLoading ? <PageLoading /> : !data || data.data.length === 0 ? (
            <EmptyState title="No assignments" description="Assign managers to recruits from the Users page" />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="px-6 py-3 font-medium">Manager</th>
                      <th className="px-6 py-3 font-medium">Recruit</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Assigned</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((a) => (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {a.manager ? `${a.manager.first_name} ${a.manager.last_name}` : a.manager_id}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {a.recruit ? `${a.recruit.first_name} ${a.recruit.last_name}` : a.recruit_id}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={a.is_active ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                        <td className="px-6 py-4 text-gray-500">{new Date(a.assigned_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          {a.is_active && (
                            <button
                              onClick={() => { if (confirm('Unassign?')) unassignMutation.mutate(a.id); }}
                              className="text-gray-400 hover:text-red-600"
                              title="Unassign"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}
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
      </ErrorBoundary>
    </PageLayout>
  );
}
