import type { Checklist } from '../api/checklists';
import { formatDate } from '../dates';

interface Props {
  checklist: Checklist;
  onToggle?: (itemId: number, done: boolean) => void;
  onRemove?: () => void;
}

export function ChecklistProgress({ checklist }: { checklist: Checklist }) {
  const percent = checklist.total === 0 ? 0 : Math.round((checklist.done * 100) / checklist.total);
  return (
    <div className="checklist-progress">
      <div className="checklist-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <span className="muted small">
        {checklist.done}/{checklist.total} done
      </span>
    </div>
  );
}

export default function ChecklistCard({ checklist, onToggle, onRemove }: Props) {
  return (
    <section className="card checklist">
      <div className="entry-head">
        <h2>{checklist.name}</h2>
        {onRemove && (
          <button type="button" className="link-button" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
      <p className="muted small">
        Assigned {formatDate(checklist.assignedAt.slice(0, 10))}
        {checklist.assignedBy && ` by ${checklist.assignedBy.name}`}
      </p>
      <ChecklistProgress checklist={checklist} />
      <ul className="checklist-items">
        {checklist.items.map((item) => (
          <li key={item.id} className={item.done ? 'done' : undefined}>
            <label>
              <input
                type="checkbox"
                checked={item.done}
                disabled={!onToggle}
                onChange={(e) => onToggle?.(item.id, e.target.checked)}
              />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
