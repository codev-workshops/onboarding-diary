import StatusBadge from './StatusBadge';

export default function EntryCard({ entry, type, onEdit, onDelete }) {
  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <span className="entry-date">{entry.date}</span>
        <span className={`entry-type badge badge-${type}`}>{type}</span>
      </div>
      <h4 className="entry-title">{entry.title || entry.subject}</h4>
      <p className="entry-description">
        {(entry.description || entry.details || entry.content || '').substring(0, 100)}
        {(entry.description || entry.details || entry.content || '').length > 100 ? '...' : ''}
      </p>
      <div className="entry-card-footer">
        {entry.status && <StatusBadge value={entry.status} />}
        {entry.priority && <StatusBadge value={entry.priority} />}
        {entry.severity && <StatusBadge value={entry.severity} />}
        {entry.type && <StatusBadge value={entry.type} />}
        {onEdit && <button className="btn btn-sm btn-edit" onClick={() => onEdit(entry)}>Edit</button>}
        {onDelete && <button className="btn btn-sm btn-delete" onClick={() => onDelete(entry.id)}>Delete</button>}
      </div>
    </div>
  );
}
