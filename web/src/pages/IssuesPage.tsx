import { EntryLog } from '../components/EntryLog';
import { ISSUE_SEVERITIES, ISSUE_STATUSES } from '../lib/types';

export const IssuesPage = () => (
  <EntryLog
    resource="issues"
    title="Issue log"
    description="Record blockers so your manager can unblock you quickly."
    newEntryLabel="New issue"
    filterFields={['severity', 'status']}
    fields={[
      { name: 'date', label: 'Date', kind: 'date', required: true },
      {
        name: 'title',
        label: 'Title',
        kind: 'text',
        required: true,
        placeholder: 'VPN certificate rejected',
      },
      {
        name: 'severity',
        label: 'Severity',
        kind: 'select',
        options: ISSUE_SEVERITIES,
        badge: true,
      },
      { name: 'status', label: 'Status', kind: 'select', options: ISSUE_STATUSES, badge: true },
      { name: 'description', label: 'Description', kind: 'textarea', formOnly: true },
      { name: 'resolutionNotes', label: 'Resolution notes', kind: 'textarea', formOnly: true },
    ]}
  />
);
