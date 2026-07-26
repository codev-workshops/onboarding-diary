/**
 * Notes (T-152 to T-154). Tag chips are clickable: selecting one filters the list by that
 * tag, which is the quickest way to pull a theme back out of the diary (FR-N4).
 */

import { normaliseTags, type NoteDto } from '@onboarding-diary/shared';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '../../components/ui/Button.js';
import { Field } from '../../components/ui/Field.js';
import { DateInput, Input } from '../../components/ui/Input.js';
import type { Column } from '../../components/ui/Table.js';
import { DeleteEntryButton } from '../entries/DeleteEntryButton.js';
import { EntryList } from '../entries/EntryList.js';
import { EntryPageHeader } from '../entries/EntryPageHeader.js';
import { FilterBar } from '../entries/FilterBar.js';
import { useEntryList } from '../entries/useEntries.js';
import { useFilters } from '../entries/useFilters.js';
import { NoteForm } from './NoteForm.js';

const FILTER_NAMES = ['from', 'to', 'tag'] as const;

export function NotesPage({
  ownerId,
  readOnly = false,
}: {
  ownerId?: string;
  readOnly?: boolean;
} = {}): ReactNode {
  const filters = useFilters(FILTER_NAMES, ownerId === undefined ? {} : { ownerId });
  const query = useEntryList('notes', filters.query);
  const [editing, setEditing] = useState<NoteDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const activeTag = filters.value('tag');

  const columns: Column<NoteDto>[] = [
    { key: 'entryDate', header: 'Date', render: (note) => note.entryDate },
    {
      key: 'title',
      header: 'Title',
      render: (note) => <span className="font-medium text-slate-900">{note.title}</span>,
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (note) =>
        note.tags.length === 0 ? (
          <span className="text-xs text-slate-500">No tags</span>
        ) : (
          <ul className="flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  aria-label={`Filter by tag ${tag}`}
                  aria-pressed={activeTag === tag}
                  className={[
                    'rounded-full px-2 py-0.5 text-xs',
                    activeTag === tag
                      ? 'bg-sky-700 text-white'
                      : 'bg-sky-100 text-sky-900 hover:bg-sky-200',
                  ].join(' ')}
                  onClick={() => filters.set('tag', activeTag === tag ? '' : tag)}
                >
                  {tag}
                </button>
              </li>
            ))}
          </ul>
        ),
    },
  ];

  if (!readOnly) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      render: (note) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            aria-label={`Edit note ${note.title}`}
            onClick={() => {
              setIsCreating(false);
              setEditing(note);
            }}
          >
            Edit
          </Button>
          <DeleteEntryButton resource="notes" id={note.id} title={note.title} />
        </div>
      ),
    });
  }

  const showForm = !readOnly && (isCreating || editing !== null);

  return (
    <section className="flex flex-col gap-4">
      {readOnly ? null : (
        <EntryPageHeader
          title="Notes"
          addLabel="Add note"
          onAdd={() => {
            setEditing(null);
            setIsCreating(true);
          }}
        />
      )}

      {showForm ? (
        <NoteForm
          note={editing}
          onDone={() => {
            setEditing(null);
            setIsCreating(false);
          }}
        />
      ) : null}

      <FilterBar
        total={query.data?.meta.total}
        activeCount={filters.activeCount}
        onReset={filters.reset}
      >
        <Field label="From">
          {(ids) => (
            <DateInput
              id={ids.id}
              value={filters.value('from')}
              onChange={(event) => filters.set('from', event.target.value)}
            />
          )}
        </Field>
        <Field label="To">
          {(ids) => (
            <DateInput
              id={ids.id}
              value={filters.value('to')}
              onChange={(event) => filters.set('to', event.target.value)}
            />
          )}
        </Field>
        <Field label="Tag">
          {(ids) => (
            <Input
              id={ids.id}
              value={activeTag}
              placeholder="e.g. vpn"
              onChange={(event) => filters.set('tag', normaliseTags([event.target.value])[0] ?? '')}
            />
          )}
        </Field>
      </FilterBar>

      <EntryList
        query={query}
        columns={columns}
        caption="Notes"
        rowKey={(note) => note.id}
        emptyTitle={filters.activeCount > 0 ? 'No notes match these filters' : 'No notes yet'}
        emptyDescription={
          filters.activeCount > 0
            ? 'Try a different tag or widen the date range.'
            : readOnly
              ? undefined
              : 'Keep the details you will want to look up again later.'
        }
        page={filters.page}
        onPageChange={filters.setPage}
      />
    </section>
  );
}
