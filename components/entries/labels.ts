/** `IN_PROGRESS` → `In progress`. Enum values are stored, never displayed raw. */
export function labelize(value: string): string {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
