import { EntryLog } from '../components/EntryLog';
import { FEEDBACK_TYPES } from '../lib/types';

export const FeedbackPage = () => (
  <EntryLog
    resource="feedback"
    title="Feedback"
    description="Tell us what is working and what should improve."
    newEntryLabel="New feedback"
    filterFields={['type']}
    fields={[
      { name: 'date', label: 'Date', kind: 'date', required: true },
      {
        name: 'subject',
        label: 'Subject',
        kind: 'text',
        required: true,
        placeholder: 'Buddy programme',
      },
      { name: 'type', label: 'Type', kind: 'select', options: FEEDBACK_TYPES, badge: true },
      { name: 'details', label: 'Details', kind: 'textarea', formOnly: true },
    ]}
  />
);
