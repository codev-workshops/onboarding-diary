import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import DataTable, { Column } from '@/components/common/DataTable';
import FilterPanel, { FilterConfig } from '@/components/common/FilterPanel';
import StatusChip from '@/components/common/StatusChip';
import PriorityBadge from '@/components/common/PriorityBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { taskService } from '@/services/taskService';
import { TaskEntry, CreateTaskRequest, TaskCategory, TaskStatus, Priority } from '@/types/task';
import { Chip } from '@mui/material';

const CATEGORIES: TaskCategory[] = ['ORIENTATION', 'TRAINING', 'DOCUMENTATION', 'MEETING', 'SHADOWING', 'SETUP', 'OTHER'];
const STATUSES: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const emptyForm: CreateTaskRequest = {
  date: dayjs().format('YYYY-MM-DD'),
  title: '',
  description: '',
  category: 'OTHER',
  status: 'NOT_STARTED',
  priority: 'MEDIUM',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskEntry | null>(null);
  const [form, setForm] = useState<CreateTaskRequest>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<TaskEntry | null>(null);

  const fetchTasks = useCallback(() => {
    setLoading(true);
    taskService
      .list({
        page,
        size: rowsPerPage,
        status: (filterStatus as TaskStatus) || undefined,
        category: (filterCategory as TaskCategory) || undefined,
        priority: (filterPriority as Priority) || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .then((res) => {
        setTasks(res.content);
        setTotalCount(res.totalElements);
      })
      .catch(() => {
        setTasks([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, filterStatus, filterCategory, filterPriority, dateFrom, dateTo]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleFilterChange = (filterId: string, value: string) => {
    setPage(0);
    if (filterId === 'status') setFilterStatus(value);
    if (filterId === 'category') setFilterCategory(value);
    if (filterId === 'priority') setFilterPriority(value);
  };

  const openCreate = () => {
    setEditingTask(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (task: TaskEntry) => {
    setEditingTask(task);
    setForm({
      date: task.date,
      title: task.title,
      description: task.description,
      category: task.category,
      status: task.status,
      priority: task.priority,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingTask) {
        await taskService.update(editingTask.id, form);
      } else {
        await taskService.create(form);
      }
      setDialogOpen(false);
      fetchTasks();
    } catch {
      // error handling
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await taskService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchTasks();
    } catch {
      // error handling
    }
  };

  const handleFormChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSelectChange = (field: string) => (e: SelectChangeEvent) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      value: filterStatus,
      options: STATUSES.map((s) => ({ label: s.replace(/_/g, ' '), value: s })),
    },
    {
      id: 'category',
      label: 'Category',
      value: filterCategory,
      options: CATEGORIES.map((c) => ({ label: c, value: c })),
    },
    {
      id: 'priority',
      label: 'Priority',
      value: filterPriority,
      options: PRIORITIES.map((p) => ({ label: p, value: p })),
    },
  ];

  const columns: Column<TaskEntry>[] = [
    { id: 'date', label: 'Date', render: (row) => dayjs(row.date).format('MMM D, YYYY') },
    { id: 'title', label: 'Title', render: (row) => row.title },
    {
      id: 'category',
      label: 'Category',
      render: (row) => <Chip label={row.category} size="small" variant="outlined" />,
    },
    { id: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> },
    { id: 'priority', label: 'Priority', render: (row) => <PriorityBadge priority={row.priority} /> },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Box>
          <IconButton size="small" onClick={() => openEdit(row)} color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setDeleteTarget(row)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Tasks</Typography>
      </Box>

      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        showDateRange
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(d) => { setDateFrom(d); setPage(0); }}
        onDateToChange={(d) => { setDateTo(d); setPage(0); }}
      />

      {loading ? (
        <LoadingSpinner />
      ) : tasks.length === 0 ? (
        <EmptyState message="No tasks found" />
      ) : (
        <DataTable
          columns={columns}
          rows={tasks}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={setPage}
          onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
          getRowKey={(r) => r.id}
        />
      )}

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={openCreate}
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField label="Title" fullWidth required value={form.title} onChange={handleFormChange('title')} sx={{ mb: 2 }} />
          <TextField label="Description" fullWidth multiline rows={3} value={form.description} onChange={handleFormChange('description')} sx={{ mb: 2 }} />
          <DatePicker
            label="Date"
            value={dayjs(form.date)}
            onChange={(val: Dayjs | null) => setForm((prev) => ({ ...prev, date: val?.format('YYYY-MM-DD') || prev.date }))}
            slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select value={form.category || ''} label="Category" onChange={handleSelectChange('category')}>
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select value={form.status || ''} label="Status" onChange={handleSelectChange('status')}>
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={form.priority || ''} label="Priority" onChange={handleSelectChange('priority')}>
              {PRIORITIES.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
