import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Note } from '../../api/entries';
import DateRangeFilter from '../../components/DateRangeFilter';
import EntryListShell from '../../components/EntryListShell';
import { formatDate } from '../../dates';
import { useFilters } from '../../hooks/useFilters';
import { usePaged } from '../../hooks/usePaged';

export default function NotesPage() {
  const filters = useFilters();
  const { data, loading, error } = usePaged<Note>('/api/notes', filters.params);
  const [tags, setTags] = useState<string[]>([]);
  const activeTag = filters.get('tag');

  useEffect(() => {
    api.get<string[]>('/api/notes/tags').then(setTags).catch(() => setTags([]));
  }, []);

  return (
    <EntryListShell
      title="Notes"
      newPath="/notes/new"
      newLabel="New note"
      data={data}
      loading={loading}
      error={error}
      emptyText="No notes match these filters."
      onPage={(page) => filters.setFilter('page', String(page))}
      filters={
        <>
          <DateRangeFilter from={filters.get('from')} to={filters.get('to')} onChange={filters.setFilter} />
          <label className="filter">
            <span>Tag</span>
            <select value={activeTag} onChange={(e) => filters.setFilter('tag', e.target.value)}>
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="link-button" onClick={filters.clear}>
            Clear
          </button>
        </>
      }
      renderItem={(note) => (
        <>
          <div className="entry-head">
            <Link to={`/notes/${note.id}/edit`} className="entry-title">
              {note.title}
            </Link>
            <span className="muted">{formatDate(note.entryDate)}</span>
          </div>
          <p className="entry-body">{note.content}</p>
          {note.tags.length > 0 && (
            <div className="badges">
              {note.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag tag-button${tag === activeTag ? ' tag-active' : ''}`}
                  onClick={() => filters.setFilter('tag', tag === activeTag ? '' : tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    />
  );
}
