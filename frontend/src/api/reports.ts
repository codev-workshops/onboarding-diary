import { API_BASE_URL, TOKEN_STORAGE_KEY } from './client';

export type ReportFormat = 'csv' | 'pdf';

/// Downloads a diary report, sending the bearer token that a plain link cannot carry.
export async function downloadReport(
  format: ReportFormat,
  params: { userId?: string; from?: string; to?: string } = {},
): Promise<void> {
  const search = new URLSearchParams();
  if (params.userId) search.set('userId', params.userId);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);

  const query = search.toString();
  const response = await fetch(`${API_BASE_URL}/api/reports/diary.${format}${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY) ?? ''}` },
  });
  if (!response.ok) throw new Error(`Report failed with status ${response.status}`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `onboarding-diary.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}
