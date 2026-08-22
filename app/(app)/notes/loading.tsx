/** Skeletons rather than a spinner, so filtering does not collapse the layout. */
export default function NotesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="bg-muted h-8 w-40 animate-pulse rounded" />
      <div className="bg-muted h-32 animate-pulse rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-muted h-12 animate-pulse rounded" />
        ))}
      </div>
      <span className="sr-only">Loading notes…</span>
    </div>
  );
}
