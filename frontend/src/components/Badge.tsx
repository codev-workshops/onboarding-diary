interface Props {
  value: string;
  label: string;
}

/** Coloured pill; colour comes from the `badge-<value>` CSS class. */
export default function Badge({ value, label }: Props) {
  return <span className={`badge badge-${value.toLowerCase().replace(/_/g, '-')}`}>{label}</span>;
}
