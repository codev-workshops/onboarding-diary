import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import FilterPanel, { FilterConfig } from '@/components/common/FilterPanel';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { feedbackService } from '@/services/feedbackService';
import { FeedbackEntry, CreateFeedbackRequest, FeedbackType } from '@/types/feedback';
import { TablePagination } from '@mui/material';

const TYPES: FeedbackType[] = ['POSITIVE', 'SUGGESTION', 'CONCERN'];

const TYPE_COLORS: Record<string, string> = {
  POSITIVE: '#4CAF50',
  SUGGESTION: '#2196F3',
  CONCERN: '#FF9800',
};

const emptyForm: CreateFeedbackRequest = {
  date: dayjs().format('YYYY-MM-DD'),
  subject: '',
  type: 'POSITIVE',
  details: '',
};

export default function FeedbackPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filterType, setFilterType] = useState(searchParams.get('type') || '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeedbackEntry | null>(null);
  const [form, setForm] = useState<CreateFeedbackRequest>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackEntry | null>(null);

  const fetchItems = useCallback(() => {
    setLoading(true);
    feedbackService
      .list({ page, size: rowsPerPage, type: filterType || undefined })
      .then((res) => {
        setItems(res.content);
        setTotalCount(res.totalElements);
      })
      .catch(() => {
        setItems([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, filterType]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleFilterChange = (_filterId: string, value: string) => {
    setPage(0);
    setFilterType(value);
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: FeedbackEntry) => {
    setEditingItem(item);
    setForm({ date: item.date, subject: item.subject, type: item.type, details: item.details });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        await feedbackService.update(editingItem.id, form);
      } else {
        await feedbackService.create(form);
      }
      setDialogOpen(false);
      fetchItems();
    } catch {
      // error handling
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await feedbackService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchItems();
    } catch {
      // error handling
    }
  };

  const handleFormChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const filters: FilterConfig[] = [
    {
      id: 'type',
      label: 'Type',
      value: filterType,
      options: TYPES.map((t) => ({ label: t, value: t })),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Feedback</Typography>
      </Box>

      <FilterPanel filters={filters} onFilterChange={handleFilterChange} />

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState message="No feedback found" />
      ) : (
        <>
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Chip
                        label={item.type}
                        size="small"
                        sx={{ backgroundColor: TYPE_COLORS[item.type] || '#9E9E9E', color: '#fff', fontWeight: 600 }}
                      />
                      <Box>
                        <IconButton size="small" onClick={() => openEdit(item)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDeleteTarget(item)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {item.subject}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {item.details}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(item.date).format('MMM D, YYYY')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </>
      )}

      <Fab color="primary" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={openCreate}>
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Feedback' : 'New Feedback'}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField label="Subject" fullWidth required value={form.subject} onChange={handleFormChange('subject')} sx={{ mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select value={form.type} label="Type" onChange={(e: SelectChangeEvent) => setForm((prev) => ({ ...prev, type: e.target.value as FeedbackType }))}>
              {TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <DatePicker
            label="Date"
            value={dayjs(form.date)}
            onChange={(val: Dayjs | null) => setForm((prev) => ({ ...prev, date: val?.format('YYYY-MM-DD') || prev.date }))}
            slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
          />
          <TextField label="Details" fullWidth multiline rows={4} value={form.details} onChange={handleFormChange('details')} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Feedback"
        message={`Are you sure you want to delete "${deleteTarget?.subject}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
