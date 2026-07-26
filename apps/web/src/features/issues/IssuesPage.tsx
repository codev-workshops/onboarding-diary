/**
 * Issue log (T-140 to T-143), also used read-only in the manager's recruit view (FR-X2).
 */

import {
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  type IssueEntryDto,
  type IssueSeverity,
  type IssueStatus,
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
import { IssueForm } from './IssueForm.js';

const FILTER_NAMES = ['from', 'to', 'severity', 'status'] as const;

const SEVERITY_TONES: Record<IssueSeverity, BadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

const STATUS_TONES: Record<IssueStatus, BadgeTone> = {
  OPEN: 'danger',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  WONT_FIX: 'neutral',
};

export function IssuesPage({
  ownerId,
  readOnly = false,
}: {
  ownerId?: string;
  readOnly?: boolean;
} = {}): ReactNode {
  const filters = useFilters(FILTER_NAMES, ownerId === undefined ? {} : { ownerId });
  const query = useEntryList('issues', filters.query);
  const [editing, setEditing] = useState<IssueEntryDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const columns: Column<IssueEntryDto>[] = [
    { key: 'entryDate', header: 'Date', render: (issue) => issue.entryDate },
    {
      key: 'title',
      header: 'Title',
      render: (issue) => <span className="font-medium text-slate-900">{issue.title}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (issue) => (
        <Badge tone={SEVERITY_TONES[issue.severity]}>{ISSUE_SEVERITY_LABELS[issue.severity]}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (issue) => (
        <Badge tone={STATUS_TONES[issue.status]}>{ISSUE_STATUS_LABELS[issue.status]}</Badge>
      ),
    },
  ];

  if (!readOnly) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      render: (issue) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            aria-label={`Edit issue ${issue.title}`}
            onClick={() => {
              setIsCreating(false);
              setEditing(issue);
            }}
          >
            Edit
          </Button>
          <DeleteEntryButton resource="issues" id={issue.id} title={issue.title} />
        </div>
      ),
    });
  }

  const showForm = !readOnly && (isCreating || editing !== null);

  return (
    <section className="flex flex-col gap-4">
      {readOnly ? null : (
        <EntryPageHeader
          title="Issue log"
          addLabel="Add issue"
          onAdd={() => {
            setEditing(null);
            setIsCreating(true);
          }}
        />
      )}

      {showForm ? (
        <IssueForm
          issue={editing}
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
        <Field label="Severity">
          {(ids) => (
            <Select
              id={ids.id}
              placeholder="Any severity"
              options={enumOptions(ISSUE_SEVERITIES, ISSUE_SEVERITY_LABELS)}
              value={filters.value('severity')}
              onChange={(event) => filters.set('severity', event.target.value)}
            />
          )}
        </Field>
        <Field label="Status">
          {(ids) => (
            <Select
              id={ids.id}
              placeholder="Any status"
              options={enumOptions(ISSUE_STATUSES, ISSUE_STATUS_LABELS)}
              value={filters.value('status')}
              onChange={(event) => filters.set('status', event.target.value)}
            />
          )}
        </Field>
      </FilterBar>

      <EntryList
        query={query}
        columns={columns}
        caption="Issues"
        rowKey={(issue) => issue.id}
        emptyTitle={filters.activeCount > 0 ? 'No issues match these filters' : 'No issues yet'}
        emptyDescription={
          filters.activeCount > 0
            ? 'Try widening the date range or clearing a filter.'
            : readOnly
              ? undefined
              : 'Record blockers here so they can be picked up and resolved.'
        }
        page={filters.page}
        onPageChange={filters.setPage}
      />
    </section>
  );
}
