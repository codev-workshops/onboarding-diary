import { Autocomplete, Box, Chip, Stack, TextField, Tooltip, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/PeopleOutline';
import { useQuery } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import { fetchNoteTags } from '../../api/diary';
import type { Note } from '../../api/diaryTypes';
import { ConfirmDeleteDialog } from '../../components/diary/ConfirmDeleteDialog';
import { EntryList } from '../../components/diary/EntryList';
import { DateRangeFilter, FilterBar, SearchFilter } from '../../components/diary/Filters';
import { PageHeader } from '../../components/diary/PageHeader';
import { RowActions } from '../../components/diary/RowActions';
import { Toast } from '../../components/diary/Toast';
import { useDiaryList } from '../../hooks/useDiaryList';
import { formatDate } from '../../utils/labels';
import { NoteFormDialog } from './NoteFormDialog';

export function NotesPage() {
  const list = useDiaryList<Note>('notes', 'Note');
  const { filters } = list;
  const tags = useQuery({ queryKey: ['notes', 'tags'], queryFn: fetchNoteTags });
  const selectedTags = filters.values('tag');

  const addTagFilter = (tag: string) => {
    if (!selectedTags.includes(tag)) filters.update({ tag: [...selectedTags, tag] });
  };

  return (
    <Box>
      <PageHeader title="Notes" addLabel="New note" onAdd={list.openNew} />
      <FilterBar>
        <SearchFilter
          label="Search notes"
          value={filters.value('q')}
          onChange={(q) => filters.update({ q })}
        />
        <DateRangeFilter
          from={filters.value('from')}
          to={filters.value('to')}
          onChange={(range) => filters.update(range)}
        />
        <Autocomplete
          multiple
          size="small"
          options={tags.data ?? []}
          value={selectedTags}
          onChange={(_, tag) => filters.update({ tag })}
          sx={{ minWidth: { xs: '100%', sm: 220 } }}
          renderInput={(params) => <TextField {...params} label="Tags" margin="none" />}
        />
      </FilterBar>
      <EntryList
        cardsOnly
        data={list.data}
        isLoading={list.isLoading}
        error={list.error}
        emptyMessage={
          filters.hasFilters
            ? 'No notes match these filters.'
            : 'No notes yet. Capture anything worth remembering.'
        }
        columns={[]}
        renderActions={(note) => (
          <RowActions
            label={note.title}
            onEdit={() => list.openEdit(note)}
            onDelete={() => list.setDeleting(note)}
          />
        )}
        renderCard={(note) => (
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Typography fontWeight={600}>{note.title}</Typography>
              {note.shared && (
                <Tooltip title="Shared with your manager">
                  <PeopleIcon fontSize="small" color="action" aria-label="Shared with manager" />
                </Tooltip>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {formatDate(note.entryDate)}
            </Typography>
            <Box
              sx={{
                maxHeight: 140,
                overflow: 'hidden',
                fontSize: 14,
                overflowWrap: 'anywhere',
                '& > :first-of-type': { mt: 0 },
                '& p': { my: 0.5 },
              }}
            >
              <Markdown>{note.content}</Markdown>
            </Box>
            {note.tags.length > 0 && (
              <Stack direction="row" gap={0.5} flexWrap="wrap">
                {note.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" onClick={() => addTagFilter(tag)} />
                ))}
              </Stack>
            )}
          </Stack>
        )}
        page={filters.page}
        onPageChange={filters.setPage}
      />
      <NoteFormDialog
        open={list.editing !== undefined}
        note={list.editing ?? null}
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
