import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { changeTaskStatus } from '../../api/diary';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, type Task } from '../../api/diaryTypes';
import { getErrorMessage } from '../../api/errors';
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
import { enumLabel, formatDate } from '../../utils/labels';
import { TaskFormDialog } from './TaskFormDialog';

const COLUMNS: Column<Task>[] = [
  { header: 'Date', render: (task) => formatDate(task.entryDate), width: 120 },
  {
    header: 'Title',
    render: (task) => (
      <Box>
        <Typography variant="body2" fontWeight={500}>
          {task.title}
        </Typography>
        {task.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            display="block"
            maxWidth={360}
          >
            {task.description}
          </Typography>
        )}
      </Box>
    ),
  },
  { header: 'Category', render: (task) => enumLabel(task.category), width: 140 },
  { header: 'Status', render: (task) => <EnumChip value={task.status} />, width: 130 },
  {
    header: 'Priority',
    render: (task) => <EnumChip value={task.priority} variant="outlined" />,
    width: 110,
  },
];

export function TasksPage() {
  const list = useDiaryList<Task>('tasks', 'Task');
  const { filters } = list;

  const toggleComplete = async (task: Task) => {
    try {
      await changeTaskStatus(task.id, task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED');
      await list.refresh();
    } catch (error) {
      list.setToast(getErrorMessage(error, 'Could not change status'));
    }
  };

  const actions = (task: Task) => (
    <RowActions
      label={task.title}
      onEdit={() => list.openEdit(task)}
      onDelete={() => list.setDeleting(task)}
    >
      <Tooltip title={task.status === 'COMPLETED' ? 'Mark as to do' : 'Mark as completed'}>
        <IconButton
          size="small"
          aria-label={`${task.status === 'COMPLETED' ? 'Reopen' : 'Complete'} ${task.title}`}
          onClick={() => toggleComplete(task)}
        >
          {task.status === 'COMPLETED' ? (
            <CheckCircleIcon fontSize="small" color="success" />
          ) : (
            <RadioButtonUncheckedIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </RowActions>
  );

  return (
    <Box>
      <PageHeader title="Task log" addLabel="New task" onAdd={list.openNew} />
      <FilterBar>
        <SearchFilter
          label="Search titles"
          value={filters.value('q')}
          onChange={(q) => filters.update({ q })}
        />
        <DateRangeFilter
          from={filters.value('from')}
          to={filters.value('to')}
          onChange={(range) => filters.update(range)}
        />
        <MultiSelectFilter
          label="Category"
          options={TASK_CATEGORIES}
          selected={filters.values('category')}
          onChange={(category) => filters.update({ category })}
        />
        <MultiSelectFilter
          label="Status"
          options={TASK_STATUSES}
          selected={filters.values('status')}
          onChange={(status) => filters.update({ status })}
        />
        <MultiSelectFilter
          label="Priority"
          options={TASK_PRIORITIES}
          selected={filters.values('priority').slice(-1)}
          onChange={(priority) => filters.update({ priority: priority.slice(-1) })}
        />
      </FilterBar>
      <EntryList
        data={list.data}
        isLoading={list.isLoading}
        error={list.error}
        emptyMessage={
          filters.hasFilters
            ? 'No tasks match these filters.'
            : 'No tasks yet. Log your first task to start your diary.'
        }
        columns={COLUMNS}
        renderActions={actions}
        renderCard={(task) => (
          <Stack spacing={0.75}>
            <Typography fontWeight={600}>{task.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(task.entryDate)} · {enumLabel(task.category)}
            </Typography>
            <Stack direction="row" spacing={1}>
              <EnumChip value={task.status} />
              <EnumChip value={task.priority} variant="outlined" />
            </Stack>
          </Stack>
        )}
        page={filters.page}
        onPageChange={filters.setPage}
      />
      <TaskFormDialog
        open={list.editing !== undefined}
        task={list.editing ?? null}
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
