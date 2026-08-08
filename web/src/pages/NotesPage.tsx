import { EntryLog } from '../components/EntryLog';

export const NotesPage = () => (
  <EntryLog
    resource="notes"
    title="Notes"
    description="Free-form notes, cheat sheets and people to remember."
    newEntryLabel="New note"
    filterFields={[]}
    fields={[
      { name: 'date', label: 'Date', kind: 'date', required: true },
      {
        name: 'title',
        label: 'Title',
        kind: 'text',
        required: true,
        placeholder: 'Deployment cheat sheet',
      },
      { name: 'tags', label: 'Tags', kind: 'text', hint: 'Comma separated, e.g. deploys, release' },
      { name: 'content', label: 'Content', kind: 'textarea', formOnly: true },
    ]}
  />
);
