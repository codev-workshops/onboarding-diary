interface Props {
  from: string;
  to: string;
  onChange: (name: 'from' | 'to', value: string) => void;
}

export default function DateRangeFilter({ from, to, onChange }: Props) {
  return (
    <>
      <label className="filter">
        <span>From</span>
        <input type="date" value={from} max={to || undefined} onChange={(e) => onChange('from', e.target.value)} />
      </label>
      <label className="filter">
        <span>To</span>
        <input type="date" value={to} min={from || undefined} onChange={(e) => onChange('to', e.target.value)} />
      </label>
    </>
  );
}
