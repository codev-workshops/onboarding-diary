import { Box, Stack, Typography } from '@mui/material';
import { ISSUE_SEVERITIES, ISSUE_STATUSES, type Issue } from '../../api/diaryTypes';
import { ConfirmDeleteDialog } from '../../components/diary/ConfirmDeleteDialog';
import { EntryList, type Column } from '../../components/diary/EntryList';
import { EnumChip } from '../../components/diary/EnumChip';
import {
  DateRangeFilter,
  FilterBar,
  MultiSelectFilter,
  SearchFilter,
} from '../../components/diary/Filters';
import { PageHeader } from '../../components/diary/PageHeader';
import { RowActions } from '../../components/diary/RowActions';
import { Toast } from '../../components/diary/Toast';
import { useDiaryList } from '../../hooks/useDiaryList';
import { formatDate } from '../../utils/labels';
import { IssueFormDialog } from './IssueFormDialog';

function isUrgent(issue: Issue): boolean {
  return (
    (issue.status === 'OPEN' || issue.status === 'IN_PROGRESS') &&
    (issue.severity === 'HIGH' || issue.severity === 'CRITICAL')
  );
}

const urgentSx = (issue: Issue) =>
  isUrgent(issue) ? { boxShadow: 'inset 4px 0 0 0 #d32f2f' } : undefined;

const COLUMNS: Column<Issue>[] = [
  { header: 'Date', render: (issue) => formatDate(issue.entryDate), width: 120 },
  {
    header: 'Title',
    render: (issue) => (
      <Box>
        <Typography variant="body2" fontWeight={500}>
          {issue.title}
        </Typography>
        {issue.relatedTaskTitle && (
          <Typography variant="caption" color="text.secondary">
            Task: {issue.relatedTaskTitle}
          </Typography>
        )}
      </Box>
    ),
  },
  { header: 'Severity', render: (issue) => <EnumChip value={issue.severity} />, width: 120 },
  {
    header: 'Status',
    render: (issue) => <EnumChip value={issue.status} variant="outlined" />,
    width: 130,
  },
];

export function IssuesPage() {
  const list = useDiaryList<Issue>('issues', 'Issue');
  const { filters } = list;

  return (
    <Box>
      <PageHeader title="Issue log" addLabel="New issue" onAdd={list.openNew} />
      <FilterBar>
        <SearchFilter
          label="Search issues"
          value={filters.value('q')}
          onChange={(q) => filters.update({ q })}
        />
        <DateRangeFilter
          from={filters.value('from')}
          to={filters.value('to')}
          onChange={(range) => filters.update(range)}
        />
        <MultiSelectFilter
          label="Status"
          options={ISSUE_STATUSES}
          selected={filters.values('status')}
          onChange={(status) => filters.update({ status })}
        />
        <MultiSelectFilter
          label="Severity"
          options={ISSUE_SEVERITIES}
          selected={filters.values('severity')}
          onChange={(severity) => filters.update({ severity })}
        />
      </FilterBar>
      <EntryList
        data={list.data}
        isLoading={list.isLoading}
        error={list.error}
        emptyMessage={
          filters.hasFilters
            ? 'No issues match these filters.'
            : 'No issues logged. Record blockers here as you hit them.'
        }
        columns={COLUMNS}
        rowSx={urgentSx}
        renderActions={(issue) => (
          <RowActions
            label={issue.title}
            onEdit={() => list.openEdit(issue)}
            onDelete={() => list.setDeleting(issue)}
          />
        )}
        renderCard={(issue) => (
          <Stack spacing={0.75}>
            <Typography fontWeight={600}>{issue.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(issue.entryDate)}
              {issue.relatedTaskTitle ? ` · Task: ${issue.relatedTaskTitle}` : ''}
            </Typography>
            <Stack direction="row" spacing={1}>
              <EnumChip value={issue.severity} />
              <EnumChip value={issue.status} variant="outlined" />
            </Stack>
          </Stack>
        )}
        page={filters.page}
        onPageChange={filters.setPage}
      />
      <IssueFormDialog
        open={list.editing !== undefined}
        issue={list.editing ?? null}
        onClose={list.closeEditor}
        onSaved={list.onSaved}
        onConflict={list.refresh}
      />
      <ConfirmDeleteDialog
        open={!!list.deleting}
        itemLabel={list.deleting?.title ?? ''}
        busy={list.deleteBusy}
        onCancel={() => list.setDeleting(null)}
        onConfirm={list.confirmDelete}
      />
      <Toast message={list.toast} onClose={() => list.setToast(null)} />
    </Box>
  );
}
