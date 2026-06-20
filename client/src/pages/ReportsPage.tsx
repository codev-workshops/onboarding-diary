import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportQuerySchema, ReportQueryInput, UserProfile } from '@onboarding-diary/shared';
import { FileText, Download } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

interface ReportData {
  type: string;
  dateFrom: string;
  dateTo: string;
  data: Record<string, unknown>[];
  columns: string[];
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecruit, setSelectedRecruit] = useState('');

  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const { data: recruits } = useQuery<UserProfile[]>({
    queryKey: ['admin-users-recruits'],
    queryFn: () => api.get('/admin/users?role=RECRUIT').then((r) => r.data?.data || r.data),
    enabled: isManager,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<ReportQueryInput>({
    resolver: zodResolver(reportQuerySchema),
    defaultValues: {
      type: 'tasks',
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      dateTo: new Date().toISOString().slice(0, 10),
    },
  });

  const onGenerate = async (data: ReportQueryInput) => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        type: data.type,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
      });
      if (selectedRecruit) params.set('userId', selectedRecruit);
      const res = await api.get(`/reports?${params.toString()}`);
      setReport(res.data);
    } catch {
      setReport(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'csv') => {
    const params = new URLSearchParams({
      type: report?.type || 'tasks',
      dateFrom: report?.dateFrom || '',
      dateTo: report?.dateTo || '',
      format,
    });
    if (selectedRecruit) params.set('userId', selectedRecruit);
    try {
      const res = await api.get(`/reports/download?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // download failed silently
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={handleSubmit(onGenerate)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select {...register('type')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="tasks">Tasks</option>
                <option value="issues">Issues</option>
                <option value="feedback">Feedback</option>
                <option value="combined">Combined</option>
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input type="date" {...register('dateFrom')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.dateFrom && <p className="mt-1 text-sm text-red-600">{errors.dateFrom.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input type="date" {...register('dateTo')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.dateTo && <p className="mt-1 text-sm text-red-600">{errors.dateTo.message}</p>}
            </div>
            {isManager && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recruit</label>
                <select
                  value={selectedRecruit}
                  onChange={(e) => setSelectedRecruit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All / Mine</option>
                  {recruits?.map((r) => (
                    <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <FileText size={16} />
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </form>
      </div>

      {report && (
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Report: {report.type} ({report.dateFrom} to {report.dateTo})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload('pdf')}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download size={14} />
                Download PDF
              </button>
              <button
                onClick={() => handleDownload('csv')}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download size={14} />
                Download CSV
              </button>
            </div>
          </div>

          {report.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {report.columns.map((col) => (
                      <th key={col} className="text-left px-4 py-3 font-medium text-gray-600">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {report.columns.map((col) => (
                        <td key={col} className="px-4 py-3 text-gray-700">{String(row[col] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No data found for the selected criteria.</p>
          )}
        </div>
      )}
    </div>
  );
}
