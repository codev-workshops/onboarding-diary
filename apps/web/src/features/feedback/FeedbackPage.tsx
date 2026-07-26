/**
 * Feedback log (T-150/T-151), also used read-only in the manager's recruit view.
 */

import {
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  type FeedbackNoteDto,
  type FeedbackType,
} from '@onboarding-diary/shared';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { Badge, type BadgeTone } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Field } from '../../components/ui/Field.js';
import { DateInput } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import type { Column } from '../../components/ui/Table.js';
import { DeleteEntryButton } from '../entries/DeleteEntryButton.js';
import { EntryList } from '../entries/EntryList.js';
import { EntryPageHeader } from '../entries/EntryPageHeader.js';
import { FilterBar } from '../entries/FilterBar.js';
import { enumOptions } from '../entries/enumOptions.js';
import { useEntryList } from '../entries/useEntries.js';
import { useFilters } from '../entries/useFilters.js';
import { FeedbackForm } from './FeedbackForm.js';

const FILTER_NAMES = ['from', 'to', 'type'] as const;

const TYPE_TONES: Record<FeedbackType, BadgeTone> = {
  POSITIVE: 'success',
  SUGGESTION: 'info',
  CONCERN: 'warning',
};

export function FeedbackPage({
  ownerId,
  readOnly = false,
}: {
  ownerId?: string;
  readOnly?: boolean;
} = {}): ReactNode {
  const filters = useFilters(FILTER_NAMES, ownerId === undefined ? {} : { ownerId });
  const query = useEntryList('feedback', filters.query);
  const [editing, setEditing] = useState<FeedbackNoteDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const columns: Column<FeedbackNoteDto>[] = [
    { key: 'entryDate', header: 'Date', render: (note) => note.entryDate },
    {
      key: 'subject',
      header: 'Subject',
      render: (note) => <span className="font-medium text-slate-900">{note.subject}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (note) => (
        <Badge tone={TYPE_TONES[note.type]}>{FEEDBACK_TYPE_LABELS[note.type]}</Badge>
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
            aria-label={`Edit feedback note ${note.subject}`}
            onClick={() => {
              setIsCreating(false);
              setEditing(note);
            }}
          >
            Edit
          </Button>
          <DeleteEntryButton resource="feedback" id={note.id} title={note.subject} />
        </div>
      ),
    });
  }

  const showForm = !readOnly && (isCreating || editing !== null);

  return (
    <section className="flex flex-col gap-4">
      {readOnly ? null : (
        <EntryPageHeader
          title="Feedback"
          addLabel="Add feedback"
          onAdd={() => {
            setEditing(null);
            setIsCreating(true);
          }}
        />
      )}

      {showForm ? (
        <FeedbackForm
          feedback={editing}
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
        <Field label="Type">
          {(ids) => (
            <Select
              id={ids.id}
              placeholder="Any type"
              options={enumOptions(FEEDBACK_TYPES, FEEDBACK_TYPE_LABELS)}
              value={filters.value('type')}
              onChange={(event) => filters.set('type', event.target.value)}
            />
          )}
        </Field>
      </FilterBar>

      <EntryList
        query={query}
        columns={columns}
        caption="Feedback"
        rowKey={(note) => note.id}
        emptyTitle={
          filters.activeCount > 0 ? 'No feedback matches these filters' : 'No feedback yet'
        }
        emptyDescription={
          filters.activeCount > 0
            ? 'Try widening the date range or clearing a filter.'
            : readOnly
              ? undefined
              : 'Capture what is going well and what could be better.'
        }
        page={filters.page}
        onPageChange={filters.setPage}
      />
    </section>
  );
}
