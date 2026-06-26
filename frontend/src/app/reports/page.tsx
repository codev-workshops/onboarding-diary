'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, ReportResponse, ReportFilters, ReportSection, ReportEntry } from '@/types';
import { getReportPreview, downloadReport, getRecruits } from '@/services/reportsApi';
import { formatDate, getTodayString } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import DatePicker from '@/components/ui/DatePicker';
import Toast from '@/components/ui/Toast';

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'issues', label: 'Issues' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'notes', label: 'Notes' },
];

export default function ReportsPage() {
  const { role } = useAuth();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [recruits, setRecruits] = useState<{ id: number; name: string; email: string }[]>([]);

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const canSelectUser = role === UserRole.Manager || role === UserRole.Admin;

  useEffect(() => {
    if (canSelectUser) {
      (async () => {
        try {
          const data = await getRecruits();
          setRecruits(data);
        } catch {
          // silently fail - user can still generate own report
        }
      })();
    }
  }, [canSelectUser]);

  const handleGeneratePreview = async () => {
    if (!dateFrom || !dateTo) {
      setToast({ message: 'Both From and To dates are required.', type: 'error' });
      return;
    }

    if (dateFrom > dateTo) {
      setToast({ message: 'From date must be before or equal to To date.', type: 'error' });
      return;
    }

    if (dateTo > getTodayString()) {
      setToast({ message: 'To date cannot be in the future.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setReport(null);
    try {
      const filters: ReportFilters = {
        dateFrom,
        dateTo,
        category: category !== 'all' ? category : undefined,
        userId: selectedUserId ? Number(selectedUserId) : undefined,
      };
      const data = await getReportPreview(filters);
      setReport(data);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to generate report.'
          : 'Failed to generate report.';
      setToast({ message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'csv') => {
    if (!dateFrom || !dateTo) return;

    setIsDownloading(true);
    try {
      const filters: ReportFilters = {
        dateFrom,
        dateTo,
        category: category !== 'all' ? category : undefined,
        userId: selectedUserId ? Number(selectedUserId) : undefined,
      };
      const blob = await downloadReport(filters, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${dateFrom}_${dateTo}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setToast({ message: `Failed to download ${format.toUpperCase()} report.`, type: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const recruitOptions = [
    { value: '', label: 'My own data' },
    ...recruits.map((r) => ({ value: String(r.id), label: `${r.name} (${r.email})` })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DatePicker
            label="From (required)"
            value={dateFrom}
            max={getTodayString()}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <DatePicker
            label="To (required)"
            value={dateTo}
            max={getTodayString()}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          {canSelectUser && (
            <Select
              label="Recruit"
              options={recruitOptions}
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            />
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={handleGeneratePreview} isLoading={isLoading}>
            Generate Preview
          </Button>
        </div>
      </div>

      {/* Report Preview */}
      {report && (
        <div className="space-y-6">
          {/* Download buttons */}
          <div className="flex gap-2">
            <Button onClick={() => handleDownload('pdf')} isLoading={isDownloading} variant="primary">
              Download PDF
            </Button>
            <Button onClick={() => handleDownload('csv')} isLoading={isDownloading} variant="secondary">
              Download CSV
            </Button>
          </div>

          {/* Report header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Report Preview</h2>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-medium">Period:</span>{' '}
                {formatDate(report.reportPeriod.dateFrom)} &mdash; {formatDate(report.reportPeriod.dateTo)}
              </p>
              <p>
                <span className="font-medium">Generated for:</span> {report.generatedForUserName}
              </p>
              <p>
                <span className="font-medium">Generated by:</span> {report.generatedBy}
              </p>
              <p>
                <span className="font-medium">Generated at:</span>{' '}
                {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Sections */}
          {report.tasks && <ReportSectionView title="Tasks" section={report.tasks} type="tasks" />}
          {report.issues && <ReportSectionView title="Issues" section={report.issues} type="issues" />}
          {report.feedback && <ReportSectionView title="Feedback" section={report.feedback} type="feedback" />}
          {report.notes && <ReportSectionView title="Notes" section={report.notes} type="notes" />}
        </div>
      )}

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

function ReportSectionView({
  title,
  section,
  type,
}: {
  title: string;
  section: ReportSection;
  type: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-2 flex gap-4 text-sm text-gray-600">
        <span>Total: <strong>{section.total}</strong></span>
        {type === 'tasks' && <span>Completed: <strong>{section.completed}</strong></span>}
        {type === 'issues' && <span>Resolved: <strong>{section.resolved}</strong></span>}
      </div>

      {section.entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 italic">No entries found for this period.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                {type === 'tasks' && (
                  <>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  </>
                )}
                {type === 'issues' && (
                  <>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  </>
                )}
                {type === 'feedback' && (
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                )}
                {type === 'notes' && (
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {section.entries.map((entry: ReportEntry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{entry.title}</td>
                  {type === 'tasks' && (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-600">{entry.status}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{entry.priority}</td>
                    </>
                  )}
                  {type === 'issues' && (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-600">{entry.status}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{entry.severity}</td>
                    </>
                  )}
                  {type === 'feedback' && (
                    <td className="px-4 py-2 text-sm text-gray-600">{entry.type}</td>
                  )}
                  {type === 'notes' && (
                    <td className="px-4 py-2 text-sm text-gray-600">{entry.tags || '-'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
