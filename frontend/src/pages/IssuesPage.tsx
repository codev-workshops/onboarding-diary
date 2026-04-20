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
import SeverityBadge from '@/components/common/SeverityBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { issueService } from '@/services/issueService';
import { IssueEntry, CreateIssueRequest, Severity, IssueStatus } from '@/types/issue';

const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'];

const emptyForm: CreateIssueRequest = {
  date: dayjs().format('YYYY-MM-DD'),
  title: '',
  description: '',
  severity: 'MEDIUM',
  status: 'OPEN',
  resolutionNotes: '',
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueEntry | null>(null);
  const [form, setForm] = useState<CreateIssueRequest>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<IssueEntry | null>(null);

  const fetchIssues = useCallback(() => {
    setLoading(true);
    issueService
      .list({
        page,
        size: rowsPerPage,
        status: filterStatus || undefined,
        severity: filterSeverity || undefined,
      })
      .then((res) => {
        setIssues(res.content);
        setTotalCount(res.totalElements);
      })
      .catch(() => {
        setIssues([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, filterStatus, filterSeverity]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleFilterChange = (filterId: string, value: string) => {
    setPage(0);
    if (filterId === 'status') setFilterStatus(value);
    if (filterId === 'severity') setFilterSeverity(value);
  };

  const openCreate = () => {
    setEditingIssue(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (issue: IssueEntry) => {
    setEditingIssue(issue);
    setForm({
      date: issue.date,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      resolutionNotes: issue.resolutionNotes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingIssue) {
        await issueService.update(editingIssue.id, form);
      } else {
        await issueService.create(form);
      }
      setDialogOpen(false);
      fetchIssues();
    } catch {
      // error handling
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await issueService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchIssues();
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
      id: 'severity',
      label: 'Severity',
      value: filterSeverity,
      options: SEVERITIES.map((s) => ({ label: s, value: s })),
    },
  ];

  const columns: Column<IssueEntry>[] = [
    { id: 'date', label: 'Date', render: (row) => dayjs(row.date).format('MMM D, YYYY') },
    { id: 'title', label: 'Title', render: (row) => row.title },
    { id: 'severity', label: 'Severity', render: (row) => <SeverityBadge severity={row.severity} /> },
    { id: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> },
    {
      id: 'resolutionNotes',
      label: 'Resolution',
      render: (row) => (
        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
          {row.resolutionNotes || '-'}
        </Typography>
      ),
    },
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
        <Typography variant="h4">Issues</Typography>
      </Box>

      <FilterPanel filters={filters} onFilterChange={handleFilterChange} />

      {loading ? (
        <LoadingSpinner />
      ) : issues.length === 0 ? (
        <EmptyState message="No issues found" />
      ) : (
        <DataTable
          columns={columns}
          rows={issues}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={setPage}
          onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
          getRowKey={(r) => r.id}
        />
      )}

      <Fab color="primary" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={openCreate}>
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIssue ? 'Edit Issue' : 'New Issue'}</DialogTitle>
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
            <InputLabel>Severity</InputLabel>
            <Select value={form.severity} label="Severity" onChange={handleSelectChange('severity')}>
              {SEVERITIES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
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
          <TextField label="Resolution Notes" fullWidth multiline rows={2} value={form.resolutionNotes} onChange={handleFormChange('resolutionNotes')} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingIssue ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Issue"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
