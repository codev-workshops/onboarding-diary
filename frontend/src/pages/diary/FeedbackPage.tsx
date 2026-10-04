import { Box, Stack, Typography } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/LightbulbOutlined';
import ReportIcon from '@mui/icons-material/ReportGmailerrorredOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUpOutlined';
import type { ReactElement } from 'react';
import { FEEDBACK_TYPES, type Feedback, type FeedbackType } from '../../api/diaryTypes';
import { ConfirmDeleteDialog } from '../../components/diary/ConfirmDeleteDialog';
import { EntryList, type Column } from '../../components/diary/EntryList';
import { EnumChip } from '../../components/diary/EnumChip';
import { DateRangeFilter, FilterBar, MultiSelectFilter } from '../../components/diary/Filters';
import { PageHeader } from '../../components/diary/PageHeader';
import { RowActions } from '../../components/diary/RowActions';
import { Toast } from '../../components/diary/Toast';
import { useDiaryList } from '../../hooks/useDiaryList';
import { formatDate } from '../../utils/labels';
import { FeedbackFormDialog } from './FeedbackFormDialog';

const TYPE_ICONS: Record<FeedbackType, ReactElement> = {
  POSITIVE: <ThumbUpIcon fontSize="small" color="success" />,
  SUGGESTION: <LightbulbIcon fontSize="small" color="info" />,
  CONCERN: <ReportIcon fontSize="small" color="warning" />,
};

const COLUMNS: Column<Feedback>[] = [
  { header: 'Date', render: (item) => formatDate(item.entryDate), width: 120 },
  {
    header: 'Type',
    render: (item) => (
      <Stack direction="row" spacing={1} alignItems="center">
        {TYPE_ICONS[item.type]}
        <EnumChip value={item.type} variant="outlined" />
      </Stack>
    ),
    width: 170,
  },
  {
    header: 'Subject',
    render: (item) => (
      <Box>
        <Typography variant="body2" fontWeight={500}>
          {item.subject}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block" maxWidth={420}>
          {item.details}
        </Typography>
      </Box>
    ),
  },
];

export function FeedbackPage() {
  const list = useDiaryList<Feedback>('feedback', 'Feedback');
  const { filters } = list;

  return (
    <Box>
      <PageHeader title="Feedback" addLabel="New feedback" onAdd={list.openNew} />
      <FilterBar>
        <DateRangeFilter
          from={filters.value('from')}
          to={filters.value('to')}
          onChange={(range) => filters.update(range)}
        />
        <MultiSelectFilter
          label="Type"
          options={FEEDBACK_TYPES}
          selected={filters.values('type')}
          onChange={(type) => filters.update({ type })}
        />
      </FilterBar>
      <EntryList
        data={list.data}
        isLoading={list.isLoading}
        error={list.error}
        emptyMessage={
          filters.hasFilters
            ? 'No feedback matches these filters.'
            : 'No feedback yet. Tell us what is working and what is not.'
        }
        columns={COLUMNS}
        renderActions={(item) => (
          <RowActions
            label={item.subject}
            onEdit={() => list.openEdit(item)}
            onDelete={() => list.setDeleting(item)}
          />
        )}
        renderCard={(item) => (
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} alignItems="center">
              {TYPE_ICONS[item.type]}
              <Typography fontWeight={600}>{item.subject}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {formatDate(item.entryDate)}
            </Typography>
            <Typography variant="body2">{item.details}</Typography>
          </Stack>
        )}
        page={filters.page}
        onPageChange={filters.setPage}
      />
      <FeedbackFormDialog
        open={list.editing !== undefined}
        feedback={list.editing ?? null}
        onClose={list.closeEditor}
        onSaved={list.onSaved}
        onConflict={list.refresh}
      />
      <ConfirmDeleteDialog
        open={!!list.deleting}
        itemLabel={list.deleting?.subject ?? ''}
        busy={list.deleteBusy}
        onCancel={() => list.setDeleting(null)}
        onConfirm={list.confirmDelete}
      />
      <Toast message={list.toast} onClose={() => list.setToast(null)} />
    </Box>
  );
}
