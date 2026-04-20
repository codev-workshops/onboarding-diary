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
  Card,
  CardContent,
  Grid,
  Chip,
  TablePagination,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { noteService } from '@/services/noteService';
import { NoteEntry, CreateNoteRequest } from '@/types/note';

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteEntry | null>(null);
  const [form, setForm] = useState<CreateNoteRequest>({
    date: dayjs().format('YYYY-MM-DD'),
    title: '',
    content: '',
    tags: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<NoteEntry | null>(null);

  const fetchNotes = useCallback(() => {
    setLoading(true);
    noteService
      .list({ page, size: rowsPerPage, search: search || undefined, tag: selectedTag || undefined })
      .then((res) => {
        setNotes(res.content);
        setTotalCount(res.totalElements);
      })
      .catch(() => {
        setNotes([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, search, selectedTag]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    noteService.getTags().then(setAllTags).catch(() => setAllTags([]));
  }, []);

  const openCreate = () => {
    setEditingNote(null);
    setForm({ date: dayjs().format('YYYY-MM-DD'), title: '', content: '', tags: '' });
    setDialogOpen(true);
  };

  const openEdit = (note: NoteEntry) => {
    setEditingNote(note);
    setForm({ date: note.date, title: note.title, content: note.content, tags: note.tags || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingNote) {
        await noteService.update(editingNote.id, form);
      } else {
        await noteService.create(form);
      }
      setDialogOpen(false);
      fetchNotes();
      noteService.getTags().then(setAllTags).catch(() => {});
    } catch {
      // error handling
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await noteService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchNotes();
    } catch {
      // error handling
    }
  };

  const handleFormChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Notes
      </Typography>

      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
        <TextField
          size="small"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        <Box display="flex" gap={0.5} flexWrap="wrap">
          <Chip
            label="All"
            variant={selectedTag === '' ? 'filled' : 'outlined'}
            onClick={() => { setSelectedTag(''); setPage(0); }}
            color={selectedTag === '' ? 'primary' : 'default'}
            size="small"
          />
          {allTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              variant={selectedTag === tag ? 'filled' : 'outlined'}
              onClick={() => { setSelectedTag(tag); setPage(0); }}
              color={selectedTag === tag ? 'primary' : 'default'}
              size="small"
            />
          ))}
        </Box>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : notes.length === 0 ? (
        <EmptyState message="No notes found" />
      ) : (
        <>
          <Grid container spacing={2}>
            {notes.map((note) => (
              <Grid item xs={12} sm={6} md={4} key={note.id}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="h6" gutterBottom sx={{ flex: 1 }}>
                        {note.title}
                      </Typography>
                      <Box>
                        <IconButton size="small" onClick={() => openEdit(note)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDeleteTarget(note)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                    >
                      {note.content}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {note.tags?.split(',').filter(Boolean).map((tag) => (
                          <Chip key={tag} label={tag.trim()} size="small" variant="outlined" />
                        ))}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(note.date).format('MMM D, YYYY')}
                      </Typography>
                    </Box>
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
            rowsPerPageOptions={[12, 24, 48]}
          />
        </>
      )}

      <Fab color="primary" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={openCreate}>
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingNote ? 'Edit Note' : 'New Note'}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField label="Title" fullWidth required value={form.title} onChange={handleFormChange('title')} sx={{ mb: 2 }} />
          <DatePicker
            label="Date"
            value={dayjs(form.date)}
            onChange={(val: Dayjs | null) => setForm((prev) => ({ ...prev, date: val?.format('YYYY-MM-DD') || prev.date }))}
            slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
          />
          <TextField label="Content" fullWidth multiline rows={5} value={form.content} onChange={handleFormChange('content')} sx={{ mb: 2 }} />
          <TextField label="Tags (comma-separated)" fullWidth value={form.tags} onChange={handleFormChange('tags')} helperText="e.g., meeting, setup, documentation" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingNote ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Note"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
