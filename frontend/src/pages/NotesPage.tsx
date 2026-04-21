import { useEffect, useState, useCallback, useMemo } from 'react';
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
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import NotesIcon from '@mui/icons-material/Notes';
import InboxIcon from '@mui/icons-material/Inbox';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import IconButton from '@mui/material/IconButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { noteService } from '@/services/noteService';
import { NoteEntry, CreateNoteRequest } from '@/types/note';

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

function buildFolderTree(folders: string[]): FolderNode[] {
  const root: FolderNode[] = [];
  const sorted = [...folders].sort();

  for (const folderPath of sorted) {
    const parts = folderPath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const fullPath = parts.slice(0, i + 1).join('/');
      let existing = current.find((n) => n.name === part);
      if (!existing) {
        existing = { name: part, path: fullPath, children: [] };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  return root;
}

interface FolderTreeItemProps {
  node: FolderNode;
  selectedFolder: string;
  onSelect: (path: string) => void;
  depth: number;
  expandedFolders: Set<string>;
  toggleExpanded: (path: string) => void;
}

function FolderTreeItem({ node, selectedFolder, onSelect, depth, expandedFolders, toggleExpanded }: FolderTreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFolder === node.path;

  return (
    <>
      <ListItemButton
        selected={isSelected}
        onClick={() => onSelect(node.path)}
        sx={{ pl: 2 + depth * 2 }}
        dense
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          {hasChildren && isExpanded ? (
            <FolderOpenIcon fontSize="small" color={isSelected ? 'primary' : 'action'} />
          ) : (
            <FolderIcon fontSize="small" color={isSelected ? 'primary' : 'action'} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={node.name}
          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
        />
        {hasChildren && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.path);
            }}
          >
            {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        )}
      </ListItemButton>
      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List disablePadding>
            {node.children.map((child) => (
              <FolderTreeItem
                key={child.path}
                node={child}
                selectedFolder={selectedFolder}
                onSelect={onSelect}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

export default function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>(searchParams.get('folder') || '');
  const [allFolders, setAllFolders] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteEntry | null>(null);
  const [form, setForm] = useState<CreateNoteRequest>({
    date: dayjs().format('YYYY-MM-DD'),
    title: '',
    content: '',
    tags: '',
    folder: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<NoteEntry | null>(null);

  const folderTree = useMemo(() => buildFolderTree(allFolders), [allFolders]);

  const toggleExpanded = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleFolderSelect = useCallback((folder: string) => {
    setSelectedFolder(folder);
    setPage(0);
    if (folder) {
      setSearchParams({ folder });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  const fetchNotes = useCallback(() => {
    setLoading(true);
    const folderParam = selectedFolder === '__uncategorized__' ? '__uncategorized__' : selectedFolder || undefined;
    noteService
      .list({ page, size: rowsPerPage, search: search || undefined, tag: selectedTag || undefined, folder: folderParam })
      .then((res) => {
        setNotes(res.content);
        setTotalCount(res.totalElements);
      })
      .catch(() => {
        setNotes([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, search, selectedTag, selectedFolder]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    noteService.getTags().then(setAllTags).catch(() => setAllTags([]));
    noteService.getFolders().then(setAllFolders).catch(() => setAllFolders([]));
  }, []);

  const refreshFolders = useCallback(() => {
    noteService.getFolders().then(setAllFolders).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingNote(null);
    setForm({
      date: dayjs().format('YYYY-MM-DD'),
      title: '',
      content: '',
      tags: '',
      folder: selectedFolder === '__uncategorized__' ? '' : selectedFolder,
    });
    setDialogOpen(true);
  };

  const openEdit = (note: NoteEntry) => {
    setEditingNote(note);
    setForm({ date: note.date, title: note.title, content: note.content, tags: note.tags || '', folder: note.folder || '' });
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
      refreshFolders();
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
      refreshFolders();
    } catch {
      // error handling
    }
  };

  const handleFormChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCreateFolder = () => {
    const name = window.prompt('Enter folder name (use / for nesting, e.g. "Setup/Dev Environment"):');
    if (name && name.trim()) {
      const trimmed = name.trim();
      if (!allFolders.includes(trimmed)) {
        setAllFolders((prev) => [...prev, trimmed]);
      }
      handleFolderSelect(trimmed);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Notes
      </Typography>

      <Box display="flex" gap={2}>
        {/* Left sidebar - Folder tree */}
        <Box
          sx={{
            width: 240,
            flexShrink: 0,
            borderRight: 1,
            borderColor: 'divider',
            pr: 1,
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ pl: 1 }}>
              Folders
            </Typography>
            <IconButton size="small" onClick={handleCreateFolder} title="Create new folder">
              <CreateNewFolderIcon fontSize="small" />
            </IconButton>
          </Box>
          <List dense disablePadding>
            <ListItemButton
              selected={selectedFolder === ''}
              onClick={() => handleFolderSelect('')}
              dense
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <NotesIcon fontSize="small" color={selectedFolder === '' ? 'primary' : 'action'} />
              </ListItemIcon>
              <ListItemText
                primary="All Notes"
                primaryTypographyProps={{ variant: 'body2', fontWeight: selectedFolder === '' ? 600 : 400 }}
              />
            </ListItemButton>
            <ListItemButton
              selected={selectedFolder === '__uncategorized__'}
              onClick={() => handleFolderSelect('__uncategorized__')}
              dense
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <InboxIcon fontSize="small" color={selectedFolder === '__uncategorized__' ? 'primary' : 'action'} />
              </ListItemIcon>
              <ListItemText
                primary="Uncategorized"
                primaryTypographyProps={{ variant: 'body2', fontWeight: selectedFolder === '__uncategorized__' ? 600 : 400 }}
              />
            </ListItemButton>
            {folderTree.map((node) => (
              <FolderTreeItem
                key={node.path}
                node={node}
                selectedFolder={selectedFolder}
                onSelect={handleFolderSelect}
                depth={0}
                expandedFolders={expandedFolders}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </List>
        </Box>

        {/* Right content */}
        <Box sx={{ flex: 1 }}>
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
                          <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                            {note.folder && (
                              <Chip
                                icon={<FolderIcon />}
                                label={note.folder}
                                size="small"
                                variant="outlined"
                                color="secondary"
                              />
                            )}
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
        </Box>
      </Box>

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
          <Autocomplete
            freeSolo
            options={allFolders}
            value={form.folder || ''}
            onChange={(_event, newValue) => {
              setForm((prev) => ({ ...prev, folder: newValue || '' }));
            }}
            onInputChange={(_event, newInputValue) => {
              setForm((prev) => ({ ...prev, folder: newInputValue }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Folder"
                fullWidth
                sx={{ mb: 2 }}
                helperText="Type a new folder or select existing. Use / for nesting (e.g., Setup/Dev Environment)"
              />
            )}
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
