const colorMap = {
  COMPLETED: 'badge-success',
  IN_PROGRESS: 'badge-warning',
  NOT_STARTED: 'badge-secondary',
  DEFERRED: 'badge-secondary',
  OPEN: 'badge-danger',
  RESOLVED: 'badge-success',
  CLOSED: 'badge-secondary',
  LOW: 'badge-info',
  MEDIUM: 'badge-warning',
  HIGH: 'badge-danger',
  CRITICAL: 'badge-danger',
  POSITIVE: 'badge-success',
  SUGGESTION: 'badge-warning',
  CONCERN: 'badge-danger',
};

export default function StatusBadge({ value }) {
  if (!value) return null;
  const className = colorMap[value] || 'badge-secondary';
  return <span className={`badge ${className}`}>{value.replace(/_/g, ' ')}</span>;
}
